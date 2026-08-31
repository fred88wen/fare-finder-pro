"""flight-cancel-subscription — POST /cancel.

ECPay cancellation is an API call YOU make (CreditCardPeriodAction Action=Cancel),
not an event that arrives. It stops future renewals but the user keeps service
through current_period_end, so the row becomes `cancelled`, NOT `expired`
(ecpay-best-practice Rule 9).
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request

import boto3

from ecpay_callback import enqueue_status
from ecpay_common import (
    add_months,
    ecpay_config,
    human_date,
    now_ts,
    period_action_url,
    ts,
    utc_now,
)
from ecpay_cmv import gen_cmv

UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
TABLE = boto3.resource("dynamodb").Table("subscriptions")

CORS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}


def _resp(status, payload):
    return {
        "statusCode": status,
        "headers": CORS,
        "body": json.dumps(payload, ensure_ascii=False),
    }


def _parse_body(event):
    body = event.get("body", event)
    if isinstance(body, str):
        body = json.loads(body or "{}")
    return body or {}


def ecpay_cancel(cfg, trade_no):
    """POST CreditCardPeriodAction Action=Cancel. Returns ECPay's raw reply text."""
    params = {
        "MerchantID": cfg["merchant_id"],
        "MerchantTradeNo": trade_no,
        "Action": "Cancel",
        "TimeStamp": str(int(time.time())),
    }
    params["CheckMacValue"] = gen_cmv(params, cfg["hash_key"], cfg["hash_iv"])
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(
        period_action_url(cfg),
        data=data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": UA,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            reply = r.read().decode("utf-8", "replace")
            print("ECPAY_CANCEL_OK", r.status, reply)
            return reply
    except urllib.error.HTTPError as ex:
        reply = ex.read().decode("utf-8", "replace")
        # 90100150 不存在的訂單編號 on a never-paid synthetic order is expected —
        # log it and still cancel locally (Rule 9).
        print("ECPAY_CANCEL_HTTP_ERR", ex.code, reply)
        return reply
    except urllib.error.URLError as ex:
        print("ECPAY_CANCEL_NET_ERR", ex)
        return "network_error: %s" % ex


def handler(event, context):
    try:
        body = _parse_body(event)
    except (ValueError, TypeError):
        return _resp(400, {"error": "invalid JSON body"})

    email = (body.get("email") or "").strip().lower()
    route = (body.get("route") or "").strip()
    if not email or not route:
        return _resp(400, {"error": "email and route are required"})

    row = TABLE.get_item(Key={"email": email, "route": route}).get("Item")
    if not row:
        return _resp(404, {"error": "subscription not found"})

    status = row.get("subscription_status")
    if status in ("cancelled", "expired"):
        print("already", status, "for", email, route, "— no-op")
        return _resp(
            200,
            {
                "ok": True,
                "email": email,
                "route": route,
                "subscription_status": status,
                "current_period_end": row.get("current_period_end"),
                "already": True,
            },
        )

    trade_no = row.get("merchant_trade_no") or ""
    ecpay_reply = ecpay_cancel(ecpay_config(), trade_no) if trade_no else "no_merchant_trade_no"

    # Migration fallback: rows activated before period tracking existed have no
    # current_period_end — give them now + 1 month so the parser does not expire
    # them on its very next run (Rule 9).
    period_end = row.get("current_period_end") or ts(add_months(utc_now(), 1))
    now = now_ts()
    TABLE.update_item(
        Key={"email": email, "route": route},
        UpdateExpression=(
            "SET subscription_status = :s, current_period_end = :e,"
            " current_period_end_date = :d, cancelled_at = :n, updated_at = :n"
        ),
        ExpressionAttributeValues={
            ":s": "cancelled",
            ":e": period_end,
            ":d": human_date(period_end),
            ":n": now,
        },
    )
    print("cancelled", email, route, trade_no, "service until", period_end)

    enqueue_status("cancel", email, route, current_period_end=period_end)
    return _resp(
        200,
        {
            "ok": True,
            "email": email,
            "route": route,
            "subscription_status": "cancelled",
            "current_period_end": period_end,
            "current_period_end_date": human_date(period_end),
            "ecpay_reply": ecpay_reply[:200],
        },
    )
