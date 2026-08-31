"""flight-ecpay-return — POST /ecpay-return (ECPay ReturnURL, first period).

The S2S source of truth for `active` (ecpay-best-practice Rule 1). Verifies the
CheckMacValue, flips the row, sets current_period_end, enqueues the welcome email,
and replies with the literal `1|OK` (Rule 3).
"""
from ecpay_callback import (
    Rejected,
    ack,
    enqueue_status,
    join_key,
    next_period_end,
    reject,
    table,
    verified_params,
)
from ecpay_common import human_date, now_ts


def handler(event, context):
    try:
        params, _cfg = verified_params(event)
        email, route = join_key(params)
    except Rejected as ex:
        return reject(ex)

    trade_no = params.get("MerchantTradeNo") or ""
    rtn_code = params.get("RtnCode")
    print(
        "ecpay-return trade_no=%s rtn=%s msg=%s email=%s route=%s simulate=%s"
        % (trade_no, rtn_code, params.get("RtnMsg"), email, route, params.get("SimulatePaid"))
    )

    # Rule 7 — the stage 模擬付款 button must never grant access.
    if params.get("SimulatePaid") == "1":
        print("SimulatePaid=1 — verified and acked, NOT activating")
        return ack()

    # RtnCode is a STRING in the AIO form-POST callback.
    if rtn_code != "1":
        print("first authorization failed — order never enters the scheduler; row stays pending")
        return ack()

    row = table().get_item(Key={"email": email, "route": route}).get("Item") or {}
    if not row:
        print("no subscription row for", email, route, "— acking anyway")
        return ack()

    # Rule 4 — idempotency keys on MerchantTradeNo + "already active?", never on Gwsr
    # (Gwsr comes back EMPTY on the real 定期定額 first-period callback).
    if row.get("subscription_status") == "active" and row.get("merchant_trade_no") == trade_no:
        print("already active for", trade_no, "— skipping writes")
        return ack()

    now = now_ts()
    period_end = next_period_end(row)
    table().update_item(
        Key={"email": email, "route": route},
        UpdateExpression=(
            "SET subscription_status = :s, merchant_trade_no = :t, current_period_end = :e,"
            " current_period_end_date = :d, activated_at = :n, last_charged_at = :n,"
            " updated_at = :n, failed_renewals = :z"
        ),
        ExpressionAttributeValues={
            ":s": "active",
            ":t": trade_no,
            ":e": period_end,
            ":d": human_date(period_end),
            ":n": now,
            ":z": 0,
        },
    )
    print("activated", email, route, trade_no, "paid through", period_end)

    enqueue_status("welcome", email, route, merchant_trade_no=trade_no, current_period_end=period_end)
    return ack()
