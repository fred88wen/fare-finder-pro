import json
import time
from decimal import Decimal, InvalidOperation

import boto3

PLANS = {
    "tokyo": {"origin": "TPE", "destination": "TYO"},
    "seoul": {"origin": "TPE", "destination": "SEL"},
}

TABLE = boto3.resource("dynamodb").Table("subscriptions")

CORS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}


def _resp(status, payload):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(payload, ensure_ascii=False)}


def _parse_body(event):
    body = event.get("body", event)
    if isinstance(body, str):
        body = json.loads(body or "{}")
    return body or {}


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
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    item = {
        "email": email,
        "route": route,
        "plan_name": plan_name,
        "origin": plan["origin"],
        "destination": plan["destination"],
        "target_price": target_price,
        "currency": "TWD",
        "created_at": now,
        "updated_at": now,
    }
    TABLE.put_item(Item=item)
    print("saved subscription", email, route, int(target_price))

    return _resp(
        200,
        {
            "ok": True,
            "email": email,
            "route": route,
            "plan_name": plan_name,
            "target_price": int(target_price),
            "currency": "TWD",
        },
    )
