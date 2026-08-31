"""Zip each Lambda source dir into aws/build/<name>.zip (forward-slash arcnames).

Functions that need shared code get the modules from aws/shared/ copied in at the
zip root, so the Lambda imports them as plain top-level modules.
"""
import hashlib
import os
import zipfile

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "build")
SHARED = os.path.join(BASE, "shared")

ECPAY_CALLBACK = ["ecpay_cmv.py", "ecpay_common.py", "ecpay_callback.py"]

FUNCS = {
    "save_subscription": ["ecpay_cmv.py", "ecpay_common.py"],
    "list_subscriptions": [],
    "parser": ["subscription_gate.py"],
    "parser_wrapper": [],
    "fare_notification": [],
    "ecpay_return": ECPAY_CALLBACK,
    "ecpay_period": ECPAY_CALLBACK,
    "ecpay_result": ["ecpay_common.py"],
    "cancel_subscription": ECPAY_CALLBACK,
    "status_notification": [],
}

os.makedirs(OUT, exist_ok=True)
for fn, shared in sorted(FUNCS.items()):
    src = os.path.join(BASE, fn)
    zpath = os.path.join(OUT, fn + ".zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _dirs, files in os.walk(src):
            for f in files:
                if f.endswith(".pyc"):
                    continue
                full = os.path.join(root, f)
                arc = os.path.relpath(full, src).replace(os.sep, "/")
                z.write(full, arc)
        for mod in shared:
            z.write(os.path.join(SHARED, mod), mod)
        assert not [n for n in z.namelist() if "\\" in n]
    md5 = hashlib.md5(open(zpath, "rb").read()).hexdigest()
    print("%-22s %7d bytes  md5=%s" % (fn, os.path.getsize(zpath), md5))
