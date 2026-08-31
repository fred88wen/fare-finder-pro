"""The paywall gate (ecpay-best-practice Rule 12) — pure logic, no I/O.

A row is served if it is `active`, OR `cancelled` and still inside the period the
user already paid for. A `cancelled` row whose period has lapsed is retired to
`expired` lazily by the parser (the only thing that scans every row).

current_period_end is compared as a fixed-width UTC STRING ("%Y-%m-%dT%H:%M:%SZ"),
so every writer must use that exact format or the comparison silently misbehaves.
"""


def gate(row, now_ts):
    """-> (serve: bool, expire: bool, why: str)"""
    status = (row or {}).get("subscription_status")
    if status == "active":
        return True, False, "active"
    if status == "cancelled":
        end = row.get("current_period_end") or ""
        if end and end >= now_ts:
            return True, False, "cancelled but paid through %s" % end
        return False, True, "cancelled and grace lapsed (%s)" % (end or "no period end")
    if status in ("pending_payment", "expired"):
        return False, False, status
    return False, False, "no subscription_status (legacy M1 row)"
