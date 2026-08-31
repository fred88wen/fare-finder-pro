"""POST /subscribe — writes the row and starts an ECPay 定期定額 checkout.

M2: the row is born as `pending_payment`; only the ECPay callbacks write `active`
(ecpay-best-practice Rule 1). Returns an auto-submit HTML form (text/html) for a
new/unpaid subscriber, or JSON for an in-place target-price update of a paying one.
"""
import html
import json
import os
import random
import time
from decimal import Decimal, InvalidOperation

import boto3

from ecpay_cmv import gen_cmv
from ecpay_common import (
    cashier_url,
    ecpay_config,
    now_ts,
    taipei_trade_date,
    API_BASE,
)

PLANS = {
    "tokyo": {"origin": "TPE", "destination": "TYO"},
    "seoul": {"origin": "TPE", "destination": "SEL"},
}

# Monthly: Frequency=1 every PeriodType. ExecTimes is a COUNT, 999 = "effectively
# long-term" (Rule 6). PERIOD_TYPE=D/ExecTimes=2 via env is the renewal test path.
PERIOD_TYPE = os.environ.get("PERIOD_TYPE", "M")
PERIOD_FREQUENCY = os.environ.get("PERIOD_FREQUENCY", "1")
PERIOD_EXEC_TIMES = os.environ.get("PERIOD_EXEC_TIMES", "999")

TABLE = boto3.resource("dynamodb").Table("subscriptions")

CORS_JSON = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}
CORS_HTML = {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
}


def _resp(status, payload):
    return {
        "statusCode": status,
        "headers": CORS_JSON,
        "body": json.dumps(payload, ensure_ascii=False),
    }


def _html_resp(body):
    return {"statusCode": 200, "headers": CORS_HTML, "body": body}


def _parse_body(event):
    body = event.get("body", event)
    if isinstance(body, str):
        body = json.loads(body or "{}")
    return body or {}


def new_trade_no():
    """<=20 chars, alphanumeric: FPN + yymmddHHMMSS + 4 hex = 19."""
    return "FPN%s%04X" % (time.strftime("%y%m%d%H%M%S", time.gmtime()), random.randrange(0x10000))


def checkout_params(cfg, trade_no, email, route, plan_label):
    amount = cfg["amount"]
    params = {
        "MerchantID": cfg["merchant_id"],
        "MerchantTradeNo": trade_no,
        "MerchantTradeDate": taipei_trade_date(),
        "PaymentType": "aio",
        "TotalAmount": amount,
        "TradeDesc": "Flight fare alert monthly plan",
        "ItemName": "%s 降價通知月費" % plan_label,
        "ReturnURL": "%s/ecpay-return" % API_BASE,
        "PeriodReturnURL": "%s/ecpay-period" % API_BASE,
        "OrderResultURL": "%s/ecpay-result" % API_BASE,
        "ChoosePayment": "Credit",
        "EncryptType": "1",
        # 定期定額: PeriodAmount MUST equal TotalAmount (Rule 6)
        "PeriodAmount": amount,
        "PeriodType": PERIOD_TYPE,
        "Frequency": PERIOD_FREQUENCY,
        "ExecTimes": PERIOD_EXEC_TIMES,
        # the join key the callbacks read to find the row (Rule 5)
        "CustomField1": email,
        "CustomField2": route,
    }
    params["CheckMacValue"] = gen_cmv(params, cfg["hash_key"], cfg["hash_iv"])
    return params


def auto_submit_form(action, params):
    inputs = "\n".join(
        '<input type="hidden" name="%s" value="%s">' % (html.escape(k), html.escape(str(v)))
        for k, v in params.items()
    )
    return (
        "<!doctype html><html lang=\"zh-Hant\"><head><meta charset=\"utf-8\">"
        "<title>轉往綠界付款…</title></head><body>"
        "<p>正在轉往綠界安全付款頁面…</p>"
        '<form id="ecpay" method="post" action="%s">\n%s\n</form>'
        "<script>document.getElementById('ecpay').submit();</script>"
        "</body></html>"
    ) % (html.escape(action), inputs)


def handler(event, context):
    try:
        body = _parse_body(event)
    except (ValueError, TypeError):
        return _resp(400, {"error": "invalid JSON body"})

    email = (body.get("email") or "").strip().lower()
    plan_name = (body.get("plan_name") or "").strip().lower()
    raw_price = body.get("target_price")

    if not email or "@" not in email:
        return _resp(400, {"error": "email is required"})
    if plan_name not in PLANS:
        return _resp(400, {"error": "plan_name must be one of %s" % sorted(PLANS)})
    try:
        target_price = Decimal(str(raw_price))
    except (InvalidOperation, TypeError):
        return _resp(400, {"error": "target_price must be a number"})
    if target_price <= 0:
        return _resp(400, {"error": "target_price must be positive"})

    plan = PLANS[plan_name]
    route = "%s-%s" % (plan["origin"], plan["destination"])
    now = now_ts()

    existing = TABLE.get_item(Key={"email": email, "route": route}).get("Item") or {}
    status = existing.get("subscription_status")
    period_end = existing.get("current_period_end") or ""

    # Idempotency: never knock a paying subscriber back to pending_payment.
    # active, or cancelled-but-still-in-grace -> in-place target update, no re-payment.
    if status == "active" or (status == "cancelled" and period_end and period_end >= now):
        TABLE.update_item(
            Key={"email": email, "route": route},
            UpdateExpression="SET target_price = :p, plan_name = :n, updated_at = :u",
            ExpressionAttributeValues={":p": target_price, ":n": plan_name, ":u": now},
        )
        print("in-place target update", email, route, int(target_price), status)
        return _resp(
            200,
            {
                "ok": True,
                "updated_in_place": True,
                "email": email,
                "route": route,
                "plan_name": plan_name,
                "target_price": int(target_price),
                "currency": "TWD",
                "subscription_status": status,
                "current_period_end": period_end or None,
            },
        )

    cfg = ecpay_config()
    trade_no = new_trade_no()
    item = {
        "email": email,
        "route": route,
        "plan_name": plan_name,
        "origin": plan["origin"],
        "destination": plan["destination"],
        "target_price": target_price,
        "currency": "TWD",
        "created_at": existing.get("created_at") or now,
        "updated_at": now,
        "subscription_status": "pending_payment",
        "merchant_trade_no": trade_no,
        "amount": cfg["amount"],
        "period_type": PERIOD_TYPE,
        "period_frequency": PERIOD_FREQUENCY,
    }
    TABLE.put_item(Item=item)
    print("saved pending_payment", email, route, int(target_price), trade_no)

    params = checkout_params(cfg, trade_no, email, route, plan_name)
    return _html_resp(auto_submit_form(cashier_url(cfg), params))
