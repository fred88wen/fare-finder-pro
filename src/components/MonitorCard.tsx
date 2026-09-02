import {
  CHECK_TYPE_META,
  MONTHLY_PRICE_TWD,
  type Subscription,
  type SubscriptionStatus,
} from "@/lib/flight-api";

type Props = {
  subscription: Subscription;
  cancelling: boolean;
  onEdit: () => void;
  onCancel: () => void;
};

const BADGE: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: { label: "已訂閱（有效）", className: "bg-primary/15 text-primary" },
  pending_payment: { label: "未完成付款", className: "bg-amber-500/15 text-amber-500" },
  cancelled: { label: "已取消", className: "bg-muted text-muted-foreground" },
  expired: { label: "已結束", className: "bg-muted text-muted-foreground" },
};

/** Read-only card for an existing monitor — editing target/check_type is not supported
 * because `route` (== target) is the DynamoDB key; changing it would create a new row. */
export function MonitorCard({ subscription, cancelling, onEdit, onCancel }: Props) {
  const status: SubscriptionStatus = subscription.subscription_status ?? "pending_payment";
  const meta = CHECK_TYPE_META[subscription.check_type];
  const paid = status === "active" || status === "cancelled";
  const gracefulUntil = subscription.current_period_end_date;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-3xl">{meta?.emoji ?? "🛰️"}</div>
          <h3 className="mt-3 truncate text-lg font-bold text-card-foreground">
            {subscription.target}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {meta?.label ?? subscription.check_type}
            {subscription.check_type === "domain_expiry" && subscription.threshold
              ? ` · 到期前 ${subscription.threshold} 天提醒`
              : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BADGE[status].className}`}
        >
          {BADGE[status].label}
        </span>
      </div>

      {status === "cancelled" && (
        <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          已停止續扣，{gracefulUntil ?? "本期結束"} 前仍會持續監控。
        </p>
      )}
      {status === "pending_payment" && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          尚未完成付款，目前不會開始監控。完成付款後才會開始追蹤。
        </p>
      )}
      {status === "expired" && (
        <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          訂閱已結束，重新訂閱即可恢復監控。
        </p>
      )}

      {paid && status === "active" && gracefulUntil && (
        <p className="mt-4 text-xs text-muted-foreground">本期至 {gracefulUntil} 自動續訂</p>
      )}

      <div className="mt-5 flex gap-2">
        {subscription.check_type === "domain_expiry" && paid && (
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-accent"
          >
            更新提醒天數
          </button>
        )}
        {status === "active" && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {cancelling ? "取消中…" : "取消訂閱"}
          </button>
        )}
      </div>

      {status === "pending_payment" && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          月費 NT${MONTHLY_PRICE_TWD.toLocaleString("zh-TW")}，由綠界信用卡定期定額扣款，可隨時取消
        </p>
      )}
    </div>
  );
}
