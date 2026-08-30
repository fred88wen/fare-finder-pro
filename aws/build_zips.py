"""Zip each Lambda source dir into aws/build/<name>.zip (forward-slash arcnames)."""
import hashlib
import os
import zipfile

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "build")
FUNCS = [
    "save_subscription",
    "list_subscriptions",
    "parser",
    "parser_wrapper",
    "fare_notification",
]

os.makedirs(OUT, exist_ok=True)
for fn in FUNCS:
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
        assert not [n for n in z.namelist() if "\\" in n]
    md5 = hashlib.md5(open(zpath, "rb").read()).hexdigest()
    print("%-20s %7d bytes  md5=%s" % (fn, os.path.getsize(zpath), md5))
