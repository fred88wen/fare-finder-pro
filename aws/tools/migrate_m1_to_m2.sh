#!/usr/bin/env bash
# M1 -> M2 migration (idempotent, keeps every row — never deletes).
#
#  1. rows with no subscription_status (legacy M1) -> pending_payment, so the UI
#     shows 未完成付款 + a 完成付款 button and users self-migrate by paying.
#  2. active rows with no current_period_end -> now + 1 month, so the parser's
#     grace math (a lexicographic string compare) does not expire them at once.
#
# Usage: aws/tools/migrate_m1_to_m2.sh [--apply]     (default: dry run)
set -euo pipefail
export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2"
export MSYS_NO_PATHCONV=1
REGION=us-east-1
TABLE=subscriptions
APPLY=${1:-}
NOW=$(python -c "import datetime;print(datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")
END=$(python -c "
import datetime
n=datetime.datetime.now(datetime.timezone.utc)
y,m=(n.year+(n.month==12)), (1 if n.month==12 else n.month+1)
d=n.day
while d>1:
    try:
        print(n.replace(year=y,month=m,day=d).strftime('%Y-%m-%dT%H:%M:%SZ')); break
    except ValueError:
        d-=1
else:
    print(n.replace(year=y,month=m,day=1).strftime('%Y-%m-%dT%H:%M:%SZ'))
")

echo "now=$NOW  fallback_period_end=$END  apply=${APPLY:-no}"

aws dynamodb scan --table-name "$TABLE" --region "$REGION" \
  --query 'Items[].[email.S,route.S,subscription_status.S,current_period_end.S]' --output text |
while IFS=$'\t' read -r EMAIL ROUTE STATUS END_TS; do
  KEY="{\"email\":{\"S\":\"$EMAIL\"},\"route\":{\"S\":\"$ROUTE\"}}"
  if [ "$STATUS" = "None" ] || [ -z "$STATUS" ]; then
    echo "legacy -> pending_payment: $EMAIL $ROUTE"
    [ "$APPLY" = "--apply" ] && aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
      --key "$KEY" \
      --update-expression "SET subscription_status = :s, updated_at = :n" \
      --condition-expression "attribute_not_exists(subscription_status)" \
      --expression-attribute-values "{\":s\":{\"S\":\"pending_payment\"},\":n\":{\"S\":\"$NOW\"}}"
  elif [ "$STATUS" = "active" ] && { [ "$END_TS" = "None" ] || [ -z "$END_TS" ]; }; then
    echo "active without period end -> $END: $EMAIL $ROUTE"
    [ "$APPLY" = "--apply" ] && aws dynamodb update-item --table-name "$TABLE" --region "$REGION" \
      --key "$KEY" \
      --update-expression "SET current_period_end = :e, current_period_end_date = :d, updated_at = :n" \
      --expression-attribute-values "{\":e\":{\"S\":\"$END\"},\":d\":{\"S\":\"${END:0:10}\"},\":n\":{\"S\":\"$NOW\"}}"
  else
    echo "ok, no change: $EMAIL $ROUTE ($STATUS)"
  fi
done
echo "done"
