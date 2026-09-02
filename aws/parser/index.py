import datetime
import ipaddress
import json
import os
import re
import socket
import urllib.error
import urllib.parse
import urllib.request

from subscription_gate import gate

UA = "Mozilla/5.0 (compatible; site-watch/1.0)"
QUEUE_NAME = os.environ.get("FARE_QUEUE", "flight-fare-queue")
RDAP_BASE = "https://rdap.org/domain/%s"
CHECK_TYPES = ("uptime", "domain_expiry")

_BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal"}

_sqs = None
_table = None
_qurl = None


def sqs_client():
    global _sqs
    if _sqs is None:
        import boto3  # deferred so the pure check functions stay testable offline

        _sqs = boto3.client("sqs")
    return _sqs


def subscriptions_table():
    global _table
    if _table is None:
        import boto3

        _table = boto3.resource("dynamodb").Table("subscriptions")
    return _table


def queue_url():
    global _qurl
    if _qurl is None:
        _qurl = sqs_client().get_queue_url(QueueName=QUEUE_NAME)["QueueUrl"]
    return _qurl


# --------------------------------------------------------------------------- uptime
def normalize_url(target):
    if not re.match(r"^https?://", target, re.IGNORECASE):
        return "https://%s" % target
    return target


def resolve_host_ips(hostname):
    """-> list[str] of resolved IP literals, or None if DNS lookup failed. Kept
    separate from is_safe_host() because a DNS failure means "site is down"
    (report it as such), not "we blocked it"."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return None
    return [info[4][0] for info in infos]


def is_safe_host(hostname):
    """Blocks loopback/private/link-local targets — a paying subscriber's `target`
    is otherwise arbitrary attacker-controlled input that this Lambda then fetches
    (classic SSRF shape). Assumes DNS already resolved; call resolve_host_ips()
    first and handle a None result (DNS failure) separately."""
    if not hostname or hostname.lower() in _BLOCKED_HOSTNAMES:
        return False
    ips = resolve_host_ips(hostname)
    if ips is None:
        return False
    for raw_ip in ips:
        try:
            ip = ipaddress.ip_address(raw_ip)
        except ValueError:
            return False
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


def check_uptime(target):
    """-> (ok: bool, status_code: int|None, error: str|None)."""
    url = normalize_url(target.strip())
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False, None, "invalid target URL"
    if resolve_host_ips(parsed.hostname) is None:
        return False, None, "DNS lookup failed"
    if not is_safe_host(parsed.hostname):
        return False, None, "target host not allowed"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return True, r.status, None
    except urllib.error.HTTPError as ex:
        return False, ex.code, "HTTP %s" % ex.code
    except urllib.error.URLError as ex:
        return False, None, "connection failed: %s" % getattr(ex, "reason", ex)
    except (TimeoutError, OSError, ValueError) as ex:
        return False, None, "check failed: %s" % ex


# --------------------------------------------------------------------------- domain expiry
def domain_from_target(target):
    """Strips an accidental scheme/path if the subscriber pasted a URL, not a bare domain."""
    return re.sub(r"^https?://", "", target.strip().lower()).split("/")[0]


def parse_rdap_expiry(body, now=None):
    """Pure: -> (days_left: int|None, expires_on: str|None, error: str|None) from an
    already-fetched RDAP JSON body."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    expires_raw = None
    for e in body.get("events") or []:
        if e.get("eventAction") == "expiration":
            expires_raw = e.get("eventDate")
            break
    if not expires_raw:
        return None, None, "no expiration event in RDAP response"
    try:
        expires_dt = datetime.datetime.fromisoformat(expires_raw.replace("Z", "+00:00"))
    except ValueError:
        return None, None, "unparsable expiration date: %s" % expires_raw
    return (expires_dt - now).days, expires_raw[:10], None


def domain_expiry_should_alert(days_left, threshold):
    """Pure: threshold is the DynamoDB `threshold` field's raw value (Decimal/int/None)."""
    if threshold is None:
        return False
    return days_left <= int(threshold)


def check_domain_expiry(target):
    """-> (days_left: int|None, expires_on: str|None, error: str|None)."""
    domain = domain_from_target(target)
    if not domain:
        return None, None, "invalid domain"
    req = urllib.request.Request(
        RDAP_BASE % urllib.parse.quote(domain),
        headers={"User-Agent": UA, "Accept": "application/rdap+json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read())
    except urllib.error.HTTPError as ex:
        if ex.code == 404:
            return None, None, "domain not found in RDAP (unregistered or unsupported TLD)"
        return None, None, "RDAP HTTP %s" % ex.code
    except (urllib.error.URLError, ValueError) as ex:
        return None, None, "RDAP query failed: %s" % ex
    return parse_rdap_expiry(body)


# --------------------------------------------------------------------------- handler
def handler(event, context):
    from boto3.dynamodb.conditions import Attr

    check_type = event.get("check_type")
    target = event.get("target")
    if check_type not in CHECK_TYPES or not target:
        print("bad event: check_type=%s target=%s - skipping" % (check_type, target))
        return {"ok": True, "matched": 0}

    route = target  # DynamoDB sort key attribute stays "route"; value is the target
    table = subscriptions_table()

    rows = table.scan(
        FilterExpression=Attr("route").eq(route) & Attr("check_type").eq(check_type)
    ).get("Items", [])
    if not rows:
        print("no subscriber(s) for %s %s" % (check_type, target))
        return {"ok": True, "route": route, "check_type": check_type, "matched": 0}

    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if check_type == "uptime":
        ok, status_code, error = check_uptime(target)
        print("uptime check", target, "UP" if ok else "DOWN", status_code, error)
        extra = {"status_code": status_code, "error": error}
        site_down = not ok
    else:
        days_left, expires_on, error = check_domain_expiry(target)
        if error:
            # RDAP query itself failed (not "domain is fine") — don't fan out a
            # false-negative or false-positive alert on transient RDAP trouble.
            print("domain_expiry check failed", target, error)
            return {"ok": True, "route": route, "check_type": check_type, "matched": 0, "error": error}
        print("domain_expiry check", target, "%d day(s) left (expires %s)" % (days_left, expires_on))
        extra = {"days_left": days_left, "expires_on": expires_on}

    # NOTE: this enqueues on every scan while the condition holds (matches the
    # M1 price-check pattern — dedup/re-alert throttling lives downstream in
    # fare_notification, step 4 of the pivot; not yet updated for these two
    # check types as of this commit).
    matched = 0
    skipped = 0
    for it in rows:
        serve, expire, why = gate(it, now)
        if expire:
            table.update_item(
                Key={"email": it["email"], "route": it["route"]},
                UpdateExpression="SET subscription_status = :s, updated_at = :n",
                ExpressionAttributeValues={":s": "expired", ":n": now},
            )
            print("expired grace-lapsed row", it["email"], route, why)
        if not serve:
            skipped += 1
            print("skipped (not paid)", it["email"], route, why)
            continue

        if check_type == "uptime":
            notify = site_down
        else:
            threshold = it.get("threshold")
            if threshold is None:
                skipped += 1
                print("skipped (no threshold set)", it["email"], route)
                continue
            notify = domain_expiry_should_alert(days_left, threshold)

        if not notify:
            continue

        body = {
            "email": it["email"],
            "route": route,
            "target": target,
            "check_type": check_type,
            "plan_name": it.get("plan_name"),
        }
        body.update(extra)
        sqs_client().send_message(QueueUrl=queue_url(), MessageBody=json.dumps(body, ensure_ascii=False))
        matched += 1
        print("enqueued alert", it["email"], route, check_type, extra)

    print(
        "%s %s scanned %d subscriber(s), %d unpaid/skipped, matched %d"
        % (check_type, route, len(rows), skipped, matched)
    )
    return {"ok": True, "route": route, "check_type": check_type, "matched": matched}
