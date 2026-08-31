# -*- coding: utf-8 -*-
"""Replay a validly-signed ECPay callback against the deployed API — no card needed.

ecpay-best-practice Rule 8: the cashier run needs a human, but the callback ->
activation path can be proven by signing a callback yourself with the real
flight/ecpay secret. Keeps the empty CustomField3/4 in the signed body on purpose:
that is the exact shape Rule 2 protects.

Usage (credentials come from the env so nothing is hard-coded):
  ECPAY_MERCHANT_ID=... ECPAY_HASH_KEY=... ECPAY_HASH_IV=... \
  python aws/tools/synthetic_callback.py --endpoint <api>/ecpay-return \
      --trade-no FPN... --email you@example.com --route TPE-TYO [--rtn-code 1] [--simulate]
"""
import argparse
import os
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shared"))
from ecpay_cmv import gen_cmv  # noqa: E402


def build_body(args):
    now = time.strftime("%Y/%m/%d %H:%M:%S")
    params = {
        "MerchantID": os.environ["ECPAY_MERCHANT_ID"],
        "MerchantTradeNo": args.trade_no,
        "TradeNo": "SYN%s" % time.strftime("%y%m%d%H%M%S"),
        "RtnCode": args.rtn_code,
        "RtnMsg": "交易成功" if args.rtn_code == "1" else "付款失敗",
        "TradeAmt": args.amount,
        "PaymentDate": now,
        "PaymentType": "Credit_CreditCard",
        "PaymentTypeChargeFee": "0",
        "TradeDate": now,
        "SimulatePaid": "1" if args.simulate else "0",
        "CustomField1": args.email,
        "CustomField2": args.route,
        # ECPay echoes AND signs these empty fields — keeping them is the point (Rule 2)
        "CustomField3": "",
        "CustomField4": "",
    }
    if args.total_success_times:
        params["TotalSuccessTimes"] = args.total_success_times
        params["TotalSuccessAmount"] = args.amount
    params["CheckMacValue"] = gen_cmv(
        params, os.environ["ECPAY_HASH_KEY"], os.environ["ECPAY_HASH_IV"]
    )
    return params


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", required=True)
    ap.add_argument("--trade-no", required=True)
    ap.add_argument("--email", required=True)
    ap.add_argument("--route", required=True)
    ap.add_argument("--rtn-code", default="1")
    ap.add_argument("--amount", default="300")
    ap.add_argument("--total-success-times", default="")
    ap.add_argument("--simulate", action="store_true")
    ap.add_argument("--break-cmv", action="store_true", help="corrupt the MAC to test rejection")
    ap.add_argument("--drop-empty", action="store_true", help="sign WITHOUT the empty CustomFields")
    args = ap.parse_args()

    params = build_body(args)
    if args.drop_empty:  # reproduces the #1 ECPay bug — the callback must reject this
        signed = {k: v for k, v in params.items() if v != "" and k != "CheckMacValue"}
        params = dict(signed)
        params["CustomField3"] = ""
        params["CustomField4"] = ""
        params["CheckMacValue"] = gen_cmv(
            signed, os.environ["ECPAY_HASH_KEY"], os.environ["ECPAY_HASH_IV"]
        )
    if args.break_cmv:
        params["CheckMacValue"] = "0" * 64

    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(
        args.endpoint,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print("HTTP %s -> %r" % (r.status, r.read().decode()))
    except urllib.error.HTTPError as ex:
        print("HTTP %s -> %r" % (ex.code, ex.read().decode()))


if __name__ == "__main__":
    main()
