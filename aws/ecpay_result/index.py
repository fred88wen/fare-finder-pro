"""flight-ecpay-result — ANY /ecpay-result (ECPay OrderResultURL).

ECPay returns the browser with a POST; a static SPA answers 405 to that, so this
Lambda exists only to turn the POST into a 302 (ecpay-best-practice Rule 11).
It does NO activation — that is the ReturnURL callback's job (Rule 1).
"""
from ecpay_common import SITE_URL, parse_form_body


def handler(event, context):
    params = {}
    try:
        params = parse_form_body(event)
    except Exception as ex:  # never let a parse issue break the redirect
        print("could not parse OrderResultURL body:", ex)

    rtn_code = params.get("RtnCode")
    outcome = "success" if rtn_code == "1" else ("failed" if rtn_code else "unknown")
    print(
        "ecpay-result trade_no=%s rtn=%s msg=%s -> %s"
        % (params.get("MerchantTradeNo"), rtn_code, params.get("RtnMsg"), outcome)
    )
    return {
        "statusCode": 302,
        "headers": {
            "Location": "%s/app?purchase=%s" % (SITE_URL, outcome),
            "Cache-Control": "no-store",
        },
        "body": "",
    }
