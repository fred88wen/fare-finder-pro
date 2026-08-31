"""Shared ECPay/subscription helpers (stdlib + boto3 only).

Bundled into every ECPay-touching Lambda zip by aws/build_zips.py.
"""
import datetime
import json
import os
import urllib.parse

SECRET_ID = os.environ.get("ECPAY_SECRET_ID", "flight/ecpay")
API_BASE = os.environ.get(
    "API_BASE", "https://bmzjswvj8l.execute-api.us-east-1.amazonaws.com"
).rstrip("/")
SITE_URL = os.environ.get("SITE_URL", "https://flight-price-notifier.vercel.app").rstrip("/")
STATUS_QUEUE = os.environ.get("STATUS_QUEUE", "flight-status-queue")

STAGE_CASHIER = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
PROD_CASHIER = "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5"
STAGE_PERIOD_ACTION = "https://payment-stage.ecpay.com.tw/Cashier/CreditCardPeriodAction"
PROD_PERIOD_ACTION = "https://payment.ecpay.com.tw/Cashier/CreditCardPeriodAction"

# Fixed-width UTC — the grace check is a lexicographic STRING compare, so every
# writer and the parser MUST use this exact format (ecpay-best-practice Rule 9).
TS_FMT = "%Y-%m-%dT%H:%M:%SZ"

_secret_cache = None


def ecpay_config():
    """{'merchant_id','hash_key','hash_iv','env','amount'} from Secrets Manager."""
    global _secret_cache
    if _secret_cache is None:
        import boto3  # imported lazily so the pure helpers stay testable offline

        raw = boto3.client("secretsmanager").get_secret_value(SecretId=SECRET_ID)["SecretString"]
        cfg = json.loads(raw)
        cfg["amount"] = str(int(str(cfg.get("amount", "300")).strip()))
        _secret_cache = cfg
    return _secret_cache


def is_stage(cfg):
    return str(cfg.get("env", "stage")).lower() != "prod"


def cashier_url(cfg):
    return STAGE_CASHIER if is_stage(cfg) else PROD_CASHIER


def period_action_url(cfg):
    return STAGE_PERIOD_ACTION if is_stage(cfg) else PROD_PERIOD_ACTION


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)


def ts(dt):
    return dt.strftime(TS_FMT)


def now_ts():
    return ts(utc_now())


def taipei_trade_date(dt=None):
    """ECPay MerchantTradeDate: 'yyyy/MM/dd HH:mm:ss' in Taiwan time (UTC+8)."""
    dt = dt or utc_now()
    tpe = dt.astimezone(datetime.timezone(datetime.timedelta(hours=8)))
    return tpe.strftime("%Y/%m/%d %H:%M:%S")


def add_months(dt, months=1):
    """Same day-of-month next month; clamps to the last valid day (ECPay bills that way)."""
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    day = dt.day
    while day > 1:
        try:
            return dt.replace(year=year, month=month, day=day)
        except ValueError:
            day -= 1
    return dt.replace(year=year, month=month, day=1)


def period_end_from(dt=None, months=1):
    return ts(add_months(dt or utc_now(), months))


def human_date(iso_ts):
    return (iso_ts or "")[:10]


def parse_form_body(event):
    """ECPay callbacks are application/x-www-form-urlencoded (base64 when binary)."""
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        import base64

        body = base64.b64decode(body).decode("utf-8", "replace")
    if isinstance(body, bytes):
        body = body.decode("utf-8", "replace")
    # keep_blank_values: ECPay signs CustomField3=&CustomField4= (Rule 2)
    pairs = urllib.parse.parse_qsl(body, keep_blank_values=True)
    return {k: v for k, v in pairs}


def text_response(body, status=200):
    """ECPay wants the literal bytes 1|OK (Rule 3) — never JSON, never quoted."""
    return {
        "statusCode": status,
        "headers": {"Content-Type": "text/plain; charset=utf-8"},
        "body": body,
    }
