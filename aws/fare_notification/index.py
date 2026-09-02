# -*- coding: utf-8 -*-
"""site-watch-notification — SQS consumer: dedup against notification_history, then email via Resend.

Product pivot (2026-09-01): messages are now "uptime" or "domain_expiry" alerts
(see aws/parser/index.py), not flight fare drops. Dedup is now a flat re-alert
floor (no price-drop-magnitude override — there's no magnitude for "site is
down"), so both check types share `should_send_floor()`.
"""
import datetime
import html
import json
import os
import urllib.error
import urllib.request

import boto3
from boto3.dynamodb.conditions import Key

UA = "Mozilla/5.0 (compatible; site-watch/1.0)"
RESEND_URL = "https://api.resend.com/emails"

FLOOR_HOURS = float(os.environ.get("NOTIFY_FLOOR_HOURS", "24"))

_sm = boto3.client("secretsmanager")
_history = boto3.resource("dynamodb").Table("notification_history")
_secret_cache = None


# --------------------------------------------------------------------------- helpers
def resend_secret():
    global _secret_cache
    if _secret_cache is None:
        _secret_cache = json.loads(_sm.get_secret_value(SecretId="flight/resend")["SecretString"])
    return _secret_cache


# --------------------------------------------------------------------------- uptime template
def subject_uptime(target):
    return "🔴 網站無法連線：%s" % target


def status_detail(status_code, error):
    if status_code:
        return "HTTP %s" % status_code
    return error or "連線失敗"


def render_text_uptime(target, status_code, error):
    lines = [
        "你監控的網站 %s 目前無法正常連線。" % target,
        "",
        "狀態：%s" % status_detail(status_code, error),
        "",
        "我們會持續每 30 分鐘檢查一次，恢復連線後不會再收到此通知。",
    ]
    return "\n".join(lines)


def render_html_uptime(target, status_code, error):
    return (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;'
        'font-size:15px;line-height:1.6;color:#111827;max-width:520px;">'
        '<p style="margin:0 0 12px;">你監控的網站 <strong>%s</strong> 目前無法正常連線。</p>'
        '<p style="margin:0;font-size:20px;font-weight:700;color:#dc2626;">%s</p>'
        '<p style="margin:24px 0 0;color:#6b7280;font-size:12px;">'
        "我們會持續每 30 分鐘檢查一次，恢復連線後不會再收到此通知。</p>"
        "</div>"
    ) % (html.escape(target), html.escape(status_detail(status_code, error)))


# --------------------------------------------------------------------------- domain_expiry template
def subject_domain_expiry(target, days_left):
    if days_left < 0:
        return "🔴 網域已過期：%s" % target
    return "🟡 網域即將到期：%s（剩 %d 天）" % (target, days_left)


def render_text_domain_expiry(target, days_left, expires_on):
    if days_left < 0:
        headline = "%s 已於 %s 到期，請盡快續約，避免網域被釋出搶註。" % (target, expires_on)
    else:
        headline = "%s 將於 %s 到期（剩 %d 天），請記得續約。" % (target, expires_on, days_left)
    return "\n".join([headline, "", "到期日：%s" % expires_on])


def render_html_domain_expiry(target, days_left, expires_on):
    expires_esc = html.escape(expires_on)
    if days_left < 0:
        headline = "已於 <strong>%s</strong> 到期，請盡快續約，避免網域被釋出搶註。" % expires_esc
        color = "#dc2626"
    else:
        headline = "將於 <strong>%s</strong> 到期（剩 <strong>%d</strong> 天），請記得續約。" % (expires_esc, days_left)
        color = "#d97706"
    return (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;'
        'font-size:15px;line-height:1.6;color:#111827;max-width:520px;">'
        '<p style="margin:0 0 12px;">你監控的網域 <strong>%s</strong> %s</p>'
        '<p style="margin:24px 0 0;color:%s;font-size:12px;">'
        "網域到期後可能被任何人搶註，強烈建議提早續約。</p>"
        "</div>"
    ) % (html.escape(target), headline, color)


# --------------------------------------------------------------------------- dedup
def should_send_floor(pk):
    """First alert always sends; re-alert only after FLOOR_HOURS since the last
    one for this (email, target) pair — there's no drop-magnitude override here
    (unlike the old price-drop notifier) since "down" / "N days left" has no
    comparable per-message magnitude."""
    rows = _history.query(
        KeyConditionExpression=Key("pk").eq(pk), ScanIndexForward=False, Limit=1
    ).get("Items", [])
    if not rows:
        return True, "first alert"
    last = rows[0]
    try:
        last_at = datetime.datetime.strptime(last["sent_at"], "%Y-%m-%dT%H:%M:%SZ")
    except (KeyError, ValueError):
        return True, "unparsable history row"
    age_h = (datetime.datetime.utcnow() - last_at).total_seconds() / 3600.0
    if age_h >= FLOOR_HOURS:
        return True, "last alert %.1fh ago (floor %.0fh)" % (age_h, FLOOR_HOURS)
    return False, "within %.0fh floor" % FLOOR_HOURS


# --------------------------------------------------------------------------- send
def send_email(to, subj, body_html, body_text):
    secret = resend_secret()
    body = {"from": secret["from"], "to": to, "subject": subj, "html": body_html, "text": body_text}
    req = urllib.request.Request(
        RESEND_URL,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": "Bearer %s" % secret["api_key"],
            "Content-Type": "application/json",
            "User-Agent": UA,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            print("RESEND_OK", r.status, r.read().decode())
            return "sent"
    except urllib.error.HTTPError as ex:
        detail = ex.read().decode()
        print("RESEND_ERR", ex.code, detail)
        if ex.code in (403, 422):
            return "dropped"  # permanent — never retry (demo sender / bad payload)
        raise RuntimeError("transient Resend failure %s: %s" % (ex.code, detail))
    except urllib.error.URLError as ex:
        raise RuntimeError("transient network failure: %s" % ex)


# --------------------------------------------------------------------------- handler
def process(msg):
    email = msg["email"]
    route = msg["route"]
    check_type = msg.get("check_type")
    target = msg.get("target", route)
    pk = "%s#%s" % (email, route)

    ok, why = should_send_floor(pk)
    if not ok:
        print("skipped (deduped)", pk, why)
        return "skipped"

    if check_type == "uptime":
        status_code = msg.get("status_code")
        error = msg.get("error")
        subj = subject_uptime(target)
        body_html = render_html_uptime(target, status_code, error)
        body_text = render_text_uptime(target, status_code, error)
        history_extra = {"status": "down"}
    elif check_type == "domain_expiry":
        days_left = int(msg.get("days_left", 0))
        expires_on = msg.get("expires_on", "")
        subj = subject_domain_expiry(target, days_left)
        body_html = render_html_domain_expiry(target, days_left, expires_on)
        body_text = render_text_domain_expiry(target, days_left, expires_on)
        history_extra = {"days_left": days_left}
    else:
        print("unknown check_type", check_type, "- skipping", pk)
        return "skipped"

    result = send_email(email, subj, body_html, body_text)
    if result == "dropped":
        print("permanent failure — dropping message for", pk)
        return "dropped"

    item = {
        "pk": pk,
        "sent_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "email": email,
        "route": route,
        "check_type": check_type,
    }
    item.update(history_extra)
    _history.put_item(Item=item)
    print("sent alert", pk, check_type, "(%s)" % why)
    return "sent"


def handler(event, context):
    results = []
    for record in event.get("Records", [event]):
        raw = record.get("body", record)
        msg = json.loads(raw) if isinstance(raw, str) else raw
        results.append(process(msg))
    print("processed", results)
    return {"ok": True, "results": results}
