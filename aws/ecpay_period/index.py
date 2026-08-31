"""flight-ecpay-period — POST /ecpay-period (ECPay PeriodReturnURL, 2nd charge onward).

Successful renewal keeps `active` and extends current_period_end. A single failed
charge does NOT expire the row — ECPay retries and only auto-terminates after 6
consecutive failures (ecpay-best-practice Rule 10).
"""
from decimal import Decimal

from ecpay_callback import (
    Rejected,
    ack,
    join_key,
    next_period_end,
    reject,
    table,
    verified_params,
)
from ecpay_common import human_date, now_ts

MAX_FAILURES = 6


def handler(event, context):
    try:
        params, _cfg = verified_params(event)
        email, route = join_key(params)
    except Rejected as ex:
        return reject(ex)

    trade_no = params.get("MerchantTradeNo") or ""
    rtn_code = params.get("RtnCode")
    print(
        "ecpay-period trade_no=%s rtn=%s msg=%s success_times=%s total_times=%s simulate=%s"
        % (
            trade_no,
            rtn_code,
            params.get("RtnMsg"),
            params.get("TotalSuccessTimes"),
            params.get("ExecTimes") or params.get("TotalTimes"),
            params.get("SimulatePaid"),
        )
    )

    if params.get("SimulatePaid") == "1":
        print("SimulatePaid=1 — verified and acked, no renewal bookkeeping")
        return ack()

    row = table().get_item(Key={"email": email, "route": route}).get("Item") or {}
    if not row:
        print("no subscription row for", email, route, "— acking anyway")
        return ack()

    now = now_ts()

    if rtn_code == "1":
        # Renewal succeeded — extend paid-through from the current end when it is
        # still in the future, so consecutive charges never lose a day.
        current_end = row.get("current_period_end") or ""
        base = None
        if current_end and current_end > now:
            try:
                import datetime

                base = datetime.datetime.strptime(current_end, "%Y-%m-%dT%H:%M:%SZ").replace(
                    tzinfo=datetime.timezone.utc
                )
            except ValueError:
                base = None
        period_end = next_period_end(row, base)
        success_times = params.get("TotalSuccessTimes") or ""
        table().update_item(
            Key={"email": email, "route": route},
            UpdateExpression=(
                "SET subscription_status = :s, current_period_end = :e,"
                " current_period_end_date = :d, last_charged_at = :n, updated_at = :n,"
                " failed_renewals = :z, total_success_times = :c"
            ),
            ExpressionAttributeValues={
                ":s": "active",
                ":e": period_end,
                ":d": human_date(period_end),
                ":n": now,
                ":z": 0,
                ":c": str(success_times),
            },
        )
        print("renewed", email, route, trade_no, "paid through", period_end)
        return ack()

    # Failed charge — count the strike, expire only when ECPay's series has ended.
    failures = int(Decimal(str(row.get("failed_renewals") or 0))) + 1
    expired = failures >= MAX_FAILURES
    table().update_item(
        Key={"email": email, "route": route},
        UpdateExpression=(
            "SET failed_renewals = :f, last_failed_at = :n, updated_at = :n"
            + (", subscription_status = :s" if expired else "")
        ),
        ExpressionAttributeValues=(
            {":f": failures, ":n": now, ":s": "expired"} if expired else {":f": failures, ":n": now}
        ),
    )
    print(
        "renewal failed (%d/%d) for %s %s rtn=%s%s"
        % (failures, MAX_FAILURES, email, route, rtn_code, " -> expired" if expired else "")
    )
    return ack()
