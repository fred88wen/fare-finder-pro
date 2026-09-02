# -*- coding: utf-8 -*-
"""Pure-logic tests for the uptime/domain_expiry parser branches (product pivot,
2026-09-01). Run: python aws/tests/test_parser_checks.py

Covers URL normalization, the SSRF host guard, RDAP expiry parsing, and the
domain_expiry alert threshold — everything in aws/parser/index.py that isn't a
network call or a boto3 client.
"""
import datetime
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "shared"))
sys.path.insert(0, os.path.join(BASE, "parser"))

from index import (  # noqa: E402
    domain_expiry_should_alert,
    domain_from_target,
    is_safe_host,
    normalize_url,
    parse_rdap_expiry,
)

FAILS = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" | " + detail) if detail and not ok else ""))
    if not ok:
        FAILS.append(name)


# --- normalize_url -----------------------------------------------------------------
def test_normalize_url():
    check("bare domain gets https://", normalize_url("example.com") == "https://example.com")
    check("http:// kept as-is", normalize_url("http://example.com") == "http://example.com")
    check("https:// kept as-is", normalize_url("https://example.com") == "https://example.com")
    check(
        "case-insensitive scheme match",
        normalize_url("HTTPS://example.com") == "HTTPS://example.com",
    )


# --- is_safe_host (SSRF guard) ------------------------------------------------------
def test_is_safe_host():
    check("loopback IP blocked", not is_safe_host("127.0.0.1"))
    check("private RFC1918 IP blocked", not is_safe_host("192.168.1.1"))
    check("link-local blocked (cloud metadata range)", not is_safe_host("169.254.169.254"))
    check("localhost name blocked", not is_safe_host("localhost"))
    check("empty hostname blocked", not is_safe_host(""))
    check("public IP allowed", is_safe_host("8.8.8.8"))


# --- domain_from_target --------------------------------------------------------------
def test_domain_from_target():
    check("bare domain unchanged", domain_from_target("example.com") == "example.com")
    check("strips https:// and path", domain_from_target("https://example.com/a/b") == "example.com")
    check("strips http:// and lowercases", domain_from_target("HTTP://Example.COM") == "example.com")


# --- parse_rdap_expiry ---------------------------------------------------------------
def test_parse_rdap_expiry():
    now = datetime.datetime(2026, 9, 1, tzinfo=datetime.timezone.utc)

    body_30d = {"events": [{"eventAction": "expiration", "eventDate": "2026-10-01T00:00:00Z"}]}
    days_left, expires_on, error = parse_rdap_expiry(body_30d, now)
    check("30 days left computed correctly", days_left == 30, str(days_left))
    check("expires_on trimmed to date", expires_on == "2026-10-01", expires_on)
    check("no error on valid body", error is None)

    body_no_events = {"events": []}
    days_left, expires_on, error = parse_rdap_expiry(body_no_events, now)
    check("missing expiration -> error, no crash", error is not None and days_left is None)

    body_bad_date = {"events": [{"eventAction": "expiration", "eventDate": "not-a-date"}]}
    days_left, expires_on, error = parse_rdap_expiry(body_bad_date, now)
    check("unparsable date -> error, no crash", error is not None and days_left is None)

    body_expired = {"events": [{"eventAction": "expiration", "eventDate": "2026-08-01T00:00:00Z"}]}
    days_left, expires_on, error = parse_rdap_expiry(body_expired, now)
    check("already-expired domain gives negative days_left", days_left == -31, str(days_left))


# --- domain_expiry_should_alert -------------------------------------------------------
def test_domain_expiry_should_alert():
    check("no threshold set -> never alert", domain_expiry_should_alert(5, None) is False)
    check("days_left above threshold -> no alert", domain_expiry_should_alert(31, 30) is False)
    check("days_left at threshold -> alert", domain_expiry_should_alert(30, 30) is True)
    check("days_left below threshold -> alert", domain_expiry_should_alert(1, 30) is True)
    check("already expired (negative days_left) -> alert", domain_expiry_should_alert(-5, 30) is True)
    check("Decimal-like threshold (DynamoDB read-back) works", domain_expiry_should_alert(10, "10") is True)


if __name__ == "__main__":
    test_normalize_url()
    test_is_safe_host()
    test_domain_from_target()
    test_parse_rdap_expiry()
    test_domain_expiry_should_alert()
    print("\n%d checks failed" % len(FAILS))
    sys.exit(1 if FAILS else 0)
