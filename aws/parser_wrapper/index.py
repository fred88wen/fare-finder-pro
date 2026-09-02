"""EventBridge (every 30 min) -> fan out one async `parser` invoke per distinct
(target, check_type) pair among rows currently being served (active, or cancelled
but still inside a paid period).

Product pivot (2026-09-01): replaces the old S3 `flight-routes.json` config-list
fan-out — subscriptions themselves are now the source of truth for what to check,
since `target` is arbitrary subscriber-entered input, not a curated route list.
"""
import datetime
import json
import os

import boto3

from subscription_gate import gate

PARSER = os.environ.get("PARSER_FUNCTION", "flight-parser")

_lambda = boto3.client("lambda")
_table = boto3.resource("dynamodb").Table("subscriptions")


def distinct_targets(rows, now):
    """-> sorted list of (target, check_type) among rows the paywall gate serves."""
    seen = set()
    for it in rows:
        serve, _expire, _why = gate(it, now)
        if not serve:
            continue
        target = it.get("target")
        check_type = it.get("check_type")
        if not target or not check_type:
            continue  # legacy pre-pivot row (M1 flight route) — nothing to dispatch
        seen.add((target, check_type))
    return sorted(seen)


def handler(event, context):
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = _table.scan().get("Items", [])

    fanned = 0
    for target, check_type in distinct_targets(rows, now):
        payload = {"target": target, "check_type": check_type}
        _lambda.invoke(
            FunctionName=PARSER,
            InvocationType="Event",
            Payload=json.dumps(payload).encode(),
        )
        fanned += 1
        print("dispatched parser for", check_type, target)
    print("fanned out %d target(s) from %d row(s)" % (fanned, len(rows)))
    return {"ok": True, "targets": fanned}
