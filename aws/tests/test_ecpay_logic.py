# -*- coding: utf-8 -*-
"""Pure-logic tests for the M2 payment layer. Run: python aws/tests/test_ecpay_logic.py

Covers the CheckMacValue helper (against ECPay's official known-answer vectors),
the grace-aware paywall gate, and the callback form-body parsing.
"""
import base64
import json
import os
import sys
import urllib.parse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "shared"))
VECTORS = os.path.join(
    os.path.dirname(BASE), ".claude", "skills", "ecpay", "test-vectors", "checkmacvalue.json"
)

from ecpay_cmv import ecpay_url_encode, gen_cmv, verify_cmv  # noqa: E402
from subscription_gate import gate  # noqa: E402

FAILS = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" | " + detail) if detail and not ok else ""))
    if not ok:
        FAILS.append(name)


# --- CheckMacValue against ECPay's official vectors ------------------------------
def test_official_vectors():
    if not os.path.exists(VECTORS):
        check("official vectors present", False, VECTORS)
        return
    with open(VECTORS, encoding="utf-8") as fh:
        vectors = json.load(fh)["vectors"]
    ran = 0
    for v in vectors:
        if v.get("method") != "SHA256" or "params" not in v:
            continue  # MD5 (logistics/invoice) and the E-Ticket JSON formula are out of scope
        ran += 1
        got = gen_cmv(v["params"], v["hashKey"], v["hashIV"])
        check("vector: " + v["name"], got == v["expected"], "%s != %s" % (got, v["expected"]))
    check("ran every SHA256 param vector", ran == 5, "ran=%d" % ran)


def test_url_encode_edges():
    check("~ becomes %7e", ecpay_url_encode("a~b") == "a%7eb", ecpay_url_encode("a~b"))
    check("space becomes +", ecpay_url_encode("a b") == "a+b", ecpay_url_encode("a b"))
    check("- _ . kept literal", ecpay_url_encode("a-_.b") == "a-_.b", ecpay_url_encode("a-_.b"))


def test_empty_fields_kept():
    """Rule 2: ECPay signs CustomField3=&CustomField4= — dropping them breaks every callback."""
    key, iv = "pwFHCqoQZGmho4w6", "EkRm7iFT261dpevs"
    full = {"MerchantID": "3002607", "RtnCode": "1", "CustomField3": "", "CustomField4": ""}
    stripped = {k: v for k, v in full.items() if v != ""}
    check("empty fields change the MAC", gen_cmv(full, key, iv) != gen_cmv(stripped, key, iv))
    signed = dict(full, CheckMacValue=gen_cmv(full, key, iv))
    check("verify accepts a correctly signed payload", verify_cmv(signed, key, iv))
    check(
        "verify rejects a tampered payload",
        not verify_cmv(dict(signed, RtnCode="0"), key, iv),
    )
    check("verify rejects a missing CheckMacValue", not verify_cmv(full, key, iv))


# --- paywall gate ----------------------------------------------------------------
def test_gate():
    now = "2026-08-31T00:00:00Z"
    cases = [
        ({"subscription_status": "active"}, (True, False)),
        ({"subscription_status": "pending_payment"}, (False, False)),
        ({"subscription_status": "expired"}, (False, False)),
        ({"subscription_status": "cancelled", "current_period_end": "2026-09-30T00:00:00Z"}, (True, False)),
        ({"subscription_status": "cancelled", "current_period_end": "2026-08-30T23:59:59Z"}, (False, True)),
        ({"subscription_status": "cancelled"}, (False, True)),
        ({}, (False, False)),
        (None, (False, False)),
    ]
    for row, expected in cases:
        serve, expire, _why = gate(row, now)
        check("gate %s" % (row,), (serve, expire) == expected, "got %s" % ((serve, expire),))


# --- callback body parsing -------------------------------------------------------
def test_parse_form_body():
    os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
    from ecpay_common import parse_form_body  # imported late: needs boto3

    raw = urllib.parse.urlencode(
        {"MerchantID": "3002607", "RtnCode": "1", "CustomField3": "", "RtnMsg": "交易成功"}
    )
    plain = parse_form_body({"body": raw, "isBase64Encoded": False})
    check("plain form body parsed", plain.get("RtnCode") == "1")
    check("blank value kept", "CustomField3" in plain and plain["CustomField3"] == "")
    check("utf-8 value decoded", plain.get("RtnMsg") == "交易成功")
    encoded = base64.b64encode(raw.encode("utf-8")).decode()
    b64 = parse_form_body({"body": encoded, "isBase64Encoded": True})
    check("base64 body parsed identically", b64 == plain)


def test_period_math():
    import datetime

    from ecpay_common import add_months, TS_FMT
    from ecpay_callback import next_period_end

    jan31 = datetime.datetime(2026, 1, 31, 3, 0, 0, tzinfo=datetime.timezone.utc)
    check("month end clamps to Feb 28", add_months(jan31).day == 28, str(add_months(jan31)))
    monthly = next_period_end({"period_type": "M"}, jan31)
    daily = next_period_end({"period_type": "D", "period_frequency": "1"}, jan31)
    check("monthly period end", monthly == "2026-02-28T03:00:00Z", monthly)
    check("daily period end", daily == "2026-02-01T03:00:00Z", daily)
    check("fixed-width format", len(datetime.datetime.now().strftime(TS_FMT)) == 20)


if __name__ == "__main__":
    test_official_vectors()
    test_url_encode_edges()
    test_empty_fields_kept()
    test_gate()
    test_parse_form_body()
    test_period_math()
    print("\n%d checks failed" % len(FAILS))
    sys.exit(1 if FAILS else 0)
