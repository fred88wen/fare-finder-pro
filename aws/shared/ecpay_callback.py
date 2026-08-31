"""Shared verify-then-flip logic for the two ECPay callbacks (ReturnURL / PeriodReturnURL).

Both callbacks carry the same payload shape; only the bookkeeping after a verified
`RtnCode=1` differs, so verification lives here once (ecpay-best-practice Rule 2).
"""
import json

from ecpay_cmv import gen_cmv
from ecpay_common import (
    STATUS_QUEUE,
    add_months,
    ecpay_config,
    parse_form_body,
    text_response,
    ts,
    utc_now,
)
import datetime

_table = None
_sqs = None
_qurl = None


def table():
    """The subscriptions table (lazy — keeps the pure helpers importable offline)."""
    global _table
    if _table is None:
        import boto3

        _table = boto3.resource("dynamodb").Table("subscriptions")
    return _table


def sqs():
    global _sqs
    if _sqs is None:
        import boto3

        _sqs = boto3.client("sqs")
    return _sqs


def status_queue_url():
    global _qurl
    if _qurl is None:
        _qurl = sqs().get_queue_url(QueueName=STATUS_QUEUE)["QueueUrl"]
    return _qurl


def enqueue_status(event_type, email, route, **extra):
    msg = {"event_type": event_type, "email": email, "route": route}
    msg.update(extra)
    sqs().send_message(QueueUrl=status_queue_url(), MessageBody=json.dumps(msg, ensure_ascii=False))
    print("enqueued status event", event_type, email, route)


def next_period_end(row, start=None):
    """Paid-through timestamp one period after `start` (defaults to now).

    Uses the order's own PeriodType/Frequency stored on the row at subscribe time,
    so the D-type renewal test path extends by days, not a month.
    """
    start = start or utc_now()
    ptype = str(row.get("period_type") or "M").upper()
    try:
        freq = int(str(row.get("period_frequency") or "1"))
    except ValueError:
        freq = 1
    freq = max(freq, 1)
    if ptype == "D":
        return ts(start + datetime.timedelta(days=freq))
    if ptype == "Y":
        return ts(add_months(start, 12 * freq))
    return ts(add_months(start, freq))


class Rejected(Exception):
    """Permanent failure — reply 0|<reason> so ECPay stops resending."""

    def __init__(self, reason, status=400):
        super().__init__(reason)
        self.reason = reason
        self.status = status


def verified_params(event):
    """Parse + authenticate an ECPay callback. Raises Rejected on a permanent failure."""
    params = parse_form_body(event)
    if not params:
        raise Rejected("EmptyBody")
    cfg = ecpay_config()

    expected = gen_cmv(params, cfg["hash_key"], cfg["hash_iv"])
    received = (params.get("CheckMacValue") or "").upper()
    if received != expected:
        print("CMV_MISMATCH received=%s expected=%s params=%s" % (received, expected, params))
        raise Rejected("CheckMacValueInvalid")

    if params.get("MerchantID") != cfg["merchant_id"]:
        print("MERCHANT_MISMATCH", params.get("MerchantID"), "!=", cfg["merchant_id"])
        raise Rejected("MerchantMismatch")

    return params, cfg


def join_key(params):
    """(email, route) from CustomField1/2 — the join key set server-side (Rule 5)."""
    email = (params.get("CustomField1") or "").strip().lower()
    route = (params.get("CustomField2") or "").strip()
    if not email or not route:
        raise Rejected("MissingCustomFields")
    return email, route


def ack():
    return text_response("1|OK")


def reject(exc):
    return text_response("0|%s" % exc.reason, exc.status)
