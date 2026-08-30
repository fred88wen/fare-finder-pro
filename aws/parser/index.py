import datetime
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
QUEUE_NAME = os.environ.get("FARE_QUEUE", "flight-fare-queue")

_sm = boto3.client("secretsmanager")
_sqs = boto3.client("sqs")
_table = boto3.resource("dynamodb").Table("subscriptions")
_qurl = None


def queue_url():
    global _qurl
    if _qurl is None:
        _qurl = _sqs.get_queue_url(QueueName=QUEUE_NAME)["QueueUrl"]
    return _qurl


def travelpayouts_token():
    raw = _sm.get_secret_value(SecretId="flight/travelpayouts")["SecretString"]
    try:
        return json.loads(raw)["token"]
    except (ValueError, KeyError):
        return raw.strip()


def next_month():
    today = datetime.date.today()
    year, month = (today.year + 1, 1) if today.month == 12 else (today.year, today.month + 1)
    return "%04d-%02d" % (year, month)


def fetch_cheapest(origin, destination, month, token, currency):
    q = urllib.parse.urlencode(
        {
            "origin": origin,
            "destination": destination,
            "depart_date": month,
            "currency": currency,
            "token": token,
        }
    )
    req = urllib.request.Request(
        "https://api.travelpayouts.com/v1/prices/cheap?%s" % q,
        headers={"User-Agent": UA, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read())
    except (urllib.error.HTTPError, urllib.error.URLError, ValueError) as ex:
        print("travelpayouts %s fetch failed: %s" % (currency, ex))
        return None
    if not body.get("success") or not body.get("data"):
        return None
    offers = body["data"].get(destination, {})
    if not offers:
        return None
    best = min(offers.values(), key=lambda o: o["price"])
    return {
        "price": best["price"],
        "currency": currency.upper(),
        "airline": best.get("airline"),
        "depart_date": best.get("departure_at"),
        "return_date": best.get("return_at"),
    }


def handler(event, context):
    origin = event.get("origin", "TPE")
    destination = event["destination"]
    route = event.get("route") or "%s-%s" % (origin, destination)
    month = event.get("month") or next_month()
    token = travelpayouts_token()

    tw = fetch_cheapest(origin, destination, month, token, "twd")
    if not tw:
        print("no TWD fare for", route, "(empty/429) - skipping")
        return {"ok": True, "route": route, "matched": 0}
    print("%s %s cheapest %s TWD (%s)" % (route, month, tw["price"], tw["airline"]))

    us = fetch_cheapest(origin, destination, month, token, "usd")

    rows = _table.scan(FilterExpression=Attr("route").eq(route)).get("Items", [])
    matched = 0
    for it in rows:
        tp = it.get("target_price")
        if tp is None:
            continue
        if Decimal(str(tp)) < Decimal(str(tw["price"])):
            continue
        body = {
            "email": it["email"],
            "route": route,
            "plan_name": it.get("plan_name"),
            "target_price": int(Decimal(str(tp))),
            "cheapest": {
                "price": tw["price"],
                "currency": "TWD",
                "airline": tw["airline"],
                "depart_date": tw["depart_date"],
                "return_date": tw["return_date"],
            },
        }
        if us:
            body["cheapest_usd"] = {
                "price": us["price"],
                "currency": "USD",
                "airline": us["airline"],
                "depart_date": us["depart_date"],
                "return_date": us["return_date"],
            }
        _sqs.send_message(QueueUrl=queue_url(), MessageBody=json.dumps(body, ensure_ascii=False))
        matched += 1
        print("enqueued match", it["email"], route, tw["price"], "<=", int(Decimal(str(tp))))

    print("%s scanned %d subscriber(s), matched %d" % (route, len(rows), matched))
    return {"ok": True, "route": route, "matched": matched, "cheapest_twd": tw["price"]}
