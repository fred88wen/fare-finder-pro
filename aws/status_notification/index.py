# -*- coding: utf-8 -*-
"""flight-status-notification — SQS consumer for subscription lifecycle emails.

ONE consumer for both subscribe and unsubscribe: every producer stamps an
`event_type` ("welcome" | "cancel") and this Lambda branches on it
(m2-ecpay-subscription: "don't build two notification Lambdas").
"""
import json
import urllib.error
import urllib.request

import boto3

UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
RESEND_URL = "https://api.resend.com/emails"
SITE_URL = "https://flight-price-notifier.vercel.app"

CITY = {"TPE": "台北", "TYO": "東京", "SEL": "首爾"}

_sm = boto3.client("secretsmanager")
_secret_cache = None


def resend_secret():
    global _secret_cache
    if _secret_cache is None:
        _secret_cache = json.loads(_sm.get_secret_value(SecretId="flight/resend")["SecretString"])
    return _secret_cache


def route_label(route):
    parts = (route or "").split("-")
    if len(parts) != 2:
        return route or "你的航線"
    return "%s → %s" % (CITY.get(parts[0], parts[0]), CITY.get(parts[1], parts[1]))


def _wrap(inner):
    return (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;'
        'font-size:15px;line-height:1.6;color:#111827;max-width:520px;">%s</div>' % inner
    )


def render_welcome(route, msg):
    label = route_label(route)
    until = (msg.get("current_period_end") or "")[:10]
    text = "\n".join(
        [
            "訂閱成功，%s 的降價追蹤已啟用。" % label,
            "我們每 30 分鐘掃一次票價，低於你設定的目標價就立刻寄信給你。",
            "本期服務到 %s，之後每月自動續訂，隨時可在會員頁取消。" % (until or "下個月同日"),
            "",
            "會員頁：%s/app" % SITE_URL,
        ]
    )
    html = _wrap(
        '<p style="margin:0 0 12px;">訂閱成功，<strong>%s</strong> 的降價追蹤已啟用。</p>'
        '<p style="margin:0 0 12px;">我們每 30 分鐘掃一次票價，低於你設定的目標價就立刻寄信給你。</p>'
        '<p style="margin:0 0 12px;">本期服務到 <strong>%s</strong>，之後每月自動續訂，隨時可在會員頁取消。</p>'
        '<p style="margin:24px 0 0;"><a href="%s/app" style="background:#2563eb;color:#fff;'
        'text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;'
        'font-weight:600;">前往會員頁</a></p>' % (label, until or "下個月同日", SITE_URL)
    )
    return "✅ 訂閱成功：%s 降價通知已啟用" % label, html, text


def render_cancel(route, msg):
    label = route_label(route)
    until = (msg.get("current_period_end") or "")[:10]
    text = "\n".join(
        [
            "已為你取消 %s 的自動續訂，之後不會再扣款。" % label,
            "你已付費的期間仍然有效：%s 之前照常收得到降價通知。" % (until or "本期結束"),
            "隨時可以回來重新訂閱：%s/app" % SITE_URL,
        ]
    )
    html = _wrap(
        '<p style="margin:0 0 12px;">已為你取消 <strong>%s</strong> 的自動續訂，之後不會再扣款。</p>'
        '<p style="margin:0 0 12px;">你已付費的期間仍然有效：<strong>%s</strong> 之前照常收得到降價通知。</p>'
        '<p style="margin:24px 0 0;"><a href="%s/app" style="background:#2563eb;color:#fff;'
        'text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;'
        'font-weight:600;">重新訂閱</a></p>' % (label, until or "本期結束", SITE_URL)
    )
    return "已取消訂閱：%s" % label, html, text


RENDERERS = {"welcome": render_welcome, "cancel": render_cancel}


def send_email(to, subj, html, text):
    secret = resend_secret()
    body = {"from": secret["from"], "to": to, "subject": subj, "html": html, "text": text}
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
            return "dropped"  # permanent (sandbox sender / bad payload) — never retry
        raise RuntimeError("transient Resend failure %s: %s" % (ex.code, detail))
    except urllib.error.URLError as ex:
        raise RuntimeError("transient network failure: %s" % ex)


def process(msg):
    event_type = (msg.get("event_type") or "").lower()
    render = RENDERERS.get(event_type)
    if not render:
        print("unknown event_type", event_type, "— dropping")
        return "ignored"
    email = msg.get("email")
    if not email:
        print("no email on message — dropping")
        return "ignored"
    subj, html, text = render(msg.get("route"), msg)
    result = send_email(email, subj, html, text)
    print("status email", event_type, email, result)
    return result


def handler(event, context):
    results = []
    for record in event.get("Records", [event]):
        raw = record.get("body", record)
        msg = json.loads(raw) if isinstance(raw, str) else raw
        results.append(process(msg))
    print("processed", results)
    return {"ok": True, "results": results}
