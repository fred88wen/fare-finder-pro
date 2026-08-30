import json
import os

import boto3

_s3 = boto3.client("s3")
_lambda = boto3.client("lambda")

BUCKET = os.environ["CONFIG_BUCKET"]
KEY = os.environ.get("ROUTES_KEY", "flight-routes.json")
PARSER = os.environ.get("PARSER_FUNCTION", "flight-parser")


def handler(event, context):
    routes = json.loads(_s3.get_object(Bucket=BUCKET, Key=KEY)["Body"].read())
    fanned = 0
    for r in routes:
        payload = {
            "origin": r["origin"],
            "destination": r["destination"],
            "route": "%s-%s" % (r["origin"], r["destination"]),
            "plan": r.get("plan"),
        }
        _lambda.invoke(
            FunctionName=PARSER,
            InvocationType="Event",
            Payload=json.dumps(payload).encode(),
        )
        fanned += 1
        print("dispatched parser for", payload["route"])
    print("fanned out %d route(s)" % fanned)
    return {"ok": True, "routes": fanned}
