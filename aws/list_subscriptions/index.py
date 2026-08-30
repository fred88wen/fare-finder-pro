import json
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

TABLE = boto3.resource("dynamodb").Table("subscriptions")

CORS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}


def _num(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    return value


def _resp(status, payload):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(payload, ensure_ascii=False)}


def handler(event, context):
    params = event.get("queryStringParameters") or {}
    email = (params.get("email") or event.get("email") or "").strip().lower()
    if not email:
        return _resp(400, {"error": "email query parameter is required"})

    rows = TABLE.query(KeyConditionExpression=Key("email").eq(email)).get("Items", [])
    items = [{k: _num(v) for k, v in row.items()} for row in rows]
    print("listed", email, len(items), "rows")
    return _resp(200, {"email": email, "subscriptions": items})
