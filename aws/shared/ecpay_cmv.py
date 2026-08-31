"""ECPay CheckMacValue helpers (stdlib only) — shared by every ECPay Lambda.

Algorithm (SHA256, AIO), per ecpay-best-practice Rule 2:
  1. drop CheckMacValue; KEEP empty-string fields, drop only truly-absent keys
  2. sort remaining keys case-insensitively
  3. HashKey={key}&k1=v1&...&HashIV={iv}
  4. ecpayUrlEncode: quote_plus -> ~ becomes %7E -> lowercase -> restore - _ . ! * ( )
  5. sha256 hex, uppercased
"""
import hashlib
import urllib.parse

_RESTORE = (
    ("%2d", "-"),
    ("%5f", "_"),
    ("%2e", "."),
    ("%21", "!"),
    ("%2a", "*"),
    ("%28", "("),
    ("%29", ")"),
)


def ecpay_url_encode(s):
    e = urllib.parse.quote_plus(str(s)).replace("~", "%7E")
    e = e.lower()
    for old, new in _RESTORE:
        e = e.replace(old, new)
    return e


def gen_cmv(params, hash_key, hash_iv):
    items = {k: v for k, v in params.items() if k != "CheckMacValue"}
    body = "&".join("%s=%s" % (k, items[k]) for k in sorted(items, key=str.lower))
    raw = "HashKey=%s&%s&HashIV=%s" % (hash_key, body, hash_iv)
    return hashlib.sha256(ecpay_url_encode(raw).encode()).hexdigest().upper()


def verify_cmv(params, hash_key, hash_iv):
    received = (params.get("CheckMacValue") or "").upper()
    return bool(received) and received == gen_cmv(params, hash_key, hash_iv)
