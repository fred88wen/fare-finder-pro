# -*- coding: utf-8 -*-
"""flight-fare-notification — SQS consumer: dedup against notification_history, then email via Resend."""
import datetime
import json
import os
import urllib.error
import urllib.request
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
RESEND_URL = "https://api.resend.com/emails"

FLOOR_HOURS = float(os.environ.get("NOTIFY_FLOOR_HOURS", "24"))
REALERT_PCT = float(os.environ.get("REALERT_PCT", "20"))
REALERT_ABS_TWD = float(os.environ.get("REALERT_ABS_TWD", "2000"))

CITY = {
    "TPE": "台北",
    "TYO": "東京",
    "SEL": "首爾",
}

_sm = boto3.client("secretsmanager")
_history = boto3.resource("dynamodb").Table("notification_history")
_secret_cache = None


# --------------------------------------------------------------------------- helpers
def resend_secret():
    global _secret_cache
    if _secret_cache is None:
        _secret_cache = json.loads(_sm.get_secret_value(SecretId="flight/resend")["SecretString"])
    return _secret_cache


def travelpayouts_marker():
    try:
        raw = _sm.get_secret_value(SecretId="flight/travelpayouts")["SecretString"]
        return json.loads(raw).get("marker")
    except Exception:  # marker is optional — never block a send on it
        return None


def route_label(route):
    parts = route.split("-")
    if len(parts) != 2:
        return route
    return "%s → %s" % (CITY.get(parts[0], parts[0]), CITY.get(parts[1], parts[1]))


def ddmm(iso):
    if not iso:
        return ""
    try:
        return datetime.datetime.strptime(iso[:10], "%Y-%m-%d").strftime("%d%m")
    except ValueError:
        return ""


def pretty_date(iso):
    if not iso:
        return "—"
    return iso[:10]


def money(value):
    return "{:,}".format(int(round(float(value))))


# --------------------------------------------------------------------------- renderer
def booking_url(fare, route, marker=None):
    origin, destination = (route.split("-") + ["", ""])[:2]
    out = ddmm(fare.get("depart_date"))
    back = ddmm(fare.get("return_date"))
    path = "%s%s%s%s1" % (origin, out, destination, back)
    url = "https://www.aviasales.com/search/%s" % path
    if marker:
        url += "?marker=%s" % marker
    return url


def subject(fare, route):
    return "✈️ %s 降價通知！NT$%s 已達標" % (route_label(route), money(fare["price"]))


def render_text(fare, route, target_price, usd_price=None, link=""):
    lines = [
        "%s 目前最便宜來回 NT$%s，已低於你設定的 NT$%s。" % (route_label(route), money(fare["price"]), money(target_price)),
    ]
    if usd_price:
        lines.append("（約 US$%s，供參考）" % money(usd_price))
    lines += [
        "",
        "航空公司：%s" % (fare.get("airline") or "—"),
        "去程：%s" % pretty_date(fare.get("depart_date")),
        "回程：%s" % pretty_date(fare.get("return_date")),
        "",
        "立即訂購：%s" % link,
        "",
        "價格由 Travelpayouts 提供，實際票價以訂購頁面為準。",
    ]
    return "\n".join(lines)


def render_html(fare, route, target_price, usd_price=None, link=""):
    usd_line = ""
    if usd_price:
        usd_line = (
            '<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">約 US$%s（供參考，與 NT$ 為兩次獨立報價）</p>'
            % money(usd_price)
        )
    return (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;'
        'font-size:15px;line-height:1.6;color:#111827;max-width:520px;">'
        '<p style="margin:0 0 12px;">你追蹤的 <strong>%s</strong> 降價了。</p>'
        '<p style="margin:0;font-size:28px;font-weight:700;">NT$%s</p>'
        '%s'
        '<p style="margin:12px 0 0;">你設定的目標價：NT$%s</p>'
        '<p style="margin:12px 0 0;">航空公司：%s<br>去程：%s<br>回程：%s</p>'
        '<p style="margin:24px 0 0;">'
        '<a href="%s" style="background:#2563eb;color:#ffffff;text-decoration:none;'
        'padding:12px 22px;border-radius:6px;display:inline-block;font-weight:600;">立即訂購</a></p>'
        '<p style="margin:24px 0 0;color:#6b7280;font-size:12px;">'
        '價格由 Travelpayouts 提供，實際票價以訂購頁面為準。</p>'
        "</div>"
    ) % (
        route_label(route),
        money(fare["price"]),
        usd_line,
        money(target_price),
        fare.get("airline") or "—",
        pretty_date(fare.get("depart_date")),
        pretty_date(fare.get("return_date")),
        link,
    )


# --------------------------------------------------------------------------- dedup
def should_send(pk, new_price):
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
    last_price = float(Decimal(str(last.get("price", 0))))
    if last_price <= 0:
        return True, "no previous price"
    if new_price <= last_price * (1 - REALERT_PCT / 100.0):
        return True, "drop >= %.0f%% vs NT$%s" % (REALERT_PCT, money(last_price))
    if (last_price - new_price) >= REALERT_ABS_TWD:
        return True, "drop >= NT$%s vs NT$%s" % (money(REALERT_ABS_TWD), money(last_price))
    return False, "within %.0fh floor and drop too small (last NT$%s)" % (FLOOR_HOURS, money(last_price))


# --------------------------------------------------------------------------- send
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
            return "dropped"  # permanent — never retry (demo sender / bad payload)
        raise RuntimeError("transient Resend failure %s: %s" % (ex.code, detail))
    except urllib.error.URLError as ex:
        raise RuntimeError("transient network failure: %s" % ex)


# --------------------------------------------------------------------------- handler
def process(msg):
    email = msg["email"]
    route = msg["route"]
    fare = msg["cheapest"]
    price = float(Decimal(str(fare["price"])))
    target_price = float(Decimal(str(msg["target_price"])))
    pk = "%s#%s" % (email, route)

    ok, why = should_send(pk, price)
    if not ok:
        print("skipped (deduped)", pk, why)
        return "skipped"

    usd = (msg.get("cheapest_usd") or {}).get("price")
    link = booking_url(fare, route, travelpayouts_marker())
    result = send_email(
        email,
        subject(fare, route),
        render_html(fare, route, target_price, usd, link),
        render_text(fare, route, target_price, usd, link),
    )
    if result == "dropped":
        print("permanent failure — dropping message for", pk)
        return "dropped"

    _history.put_item(
        Item={
            "pk": pk,
            "sent_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "email": email,
            "route": route,
            "price": Decimal(str(fare["price"])),
            "currency": "TWD",
        }
    )
    print("sent alert", pk, "NT$%s" % money(price), "(%s)" % why)
    return "sent"


def handler(event, context):
    results = []
    for record in event.get("Records", [event]):
        raw = record.get("body", record)
        msg = json.loads(raw) if isinstance(raw, str) else raw
        results.append(process(msg))
    print("processed", results)
    return {"ok": True, "results": results}
