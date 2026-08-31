import { useEffect, useState } from "react";

import {
  MONTHLY_PRICE_TWD,
  statusOf,
  type Plan,
  type Subscription,
  type SubscriptionStatus,
} from "@/lib/flight-api";

type Props = {
  plan: Plan;
  subscription?: Subscription | undefined;
  saving: boolean;
  cancelling: boolean;
  onSubscribe: (targetPrice: number) => void;
  onCancel: () => void;
};

const twd = new Intl.NumberFormat("zh-TW");

const BADGE: Record<SubscriptionStatus, { label: string; className: string }> = {
  active: { label: "已訂閱（有效）", className: "bg-primary/15 text-primary" },
  pending_payment: { label: "未完成付款", className: "bg-amber-500/15 text-amber-500" },
  cancelled: { label: "已取消", className: "bg-muted text-muted-foreground" },
  expired: { label: "已結束", className: "bg-muted text-muted-foreground" },
};

export function PlanCard({
  plan,
  subscription,
  saving,
  cancelling,
  onSubscribe,
  onCancel,
}: Props) {
  const status = statusOf(subscription);
  const known = status !== "none";
  const paid = status === "active" || status === "cancelled";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(subscription?.target_price ?? plan.hintTwd));

  useEffect(() => {
    if (subscription) setValue(String(subscription.target_price));
  }, [subscription]);

  // A paying subscriber edits in place; everyone else sees the form that starts checkout.
  const showForm = !paid || editing;
  const submitLabel = paid ? "儲存新目標價" : known ? "完成付款" : "訂閱並付款";
  const gracefulUntil = subscription?.current_period_end_date;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const target = Number(value);
    if (!Number.isFinite(target) || target <= 0) return;
    onSubscribe(target);
    setEditing(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-3xl">{plan.emoji}</div>
          <h3 className="mt-3 text-lg font-bold text-card-foreground">{plan.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.route} · 目前最低約 NT${twd.format(plan.hintTwd)}
          </p>
        </div>
        {known && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BADGE[status].className}`}
          >
            {BADGE[status].label}
          </span>
        )}
      </div>

      {status === "cancelled" && (
        <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          已停止續扣，{gracefulUntil ?? "本期結束"} 前仍會收到降價通知。
        </p>
      )}
      {status === "pending_payment" && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          尚未完成付款，目前不會發送通知。完成付款後才會開始追蹤。
        </p>
      )}
      {status === "expired" && (
        <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          訂閱已結束，重新訂閱即可恢復通知。
        </p>
      )}

      {paid && !editing && (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">
            目標價{" "}
            <span className="text-base font-bold text-foreground">
              NT${twd.format(subscription!.target_price)}
            </span>
          </p>
          {status === "active" && gracefulUntil && (
            <p className="mt-1 text-xs text-muted-foreground">本期至 {gracefulUntil} 自動續訂</p>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-accent"
          >
            更新目標價
          </button>
          {status === "active" && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="mt-2 w-full text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            >
              {cancelling ? "取消中…" : "取消訂閱"}
            </button>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-foreground">
            目標價（TWD）
            <input
              type="number"
              min={1}
              step={100}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "處理中…" : submitLabel}
          </button>
          {!paid && (
            <p className="text-center text-xs text-muted-foreground">
              月費 NT${twd.format(MONTHLY_PRICE_TWD)}，由綠界信用卡定期定額扣款，可隨時取消
            </p>
          )}
          {paid && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="w-full text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              取消編輯
            </button>
          )}
        </form>
      )}
    </div>
  );
}
