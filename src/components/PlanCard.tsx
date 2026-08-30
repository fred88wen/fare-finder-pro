import { useEffect, useState } from "react";

import type { Plan, Subscription } from "@/lib/flight-api";

type Props = {
  plan: Plan;
  subscription?: Subscription | undefined;
  saving: boolean;
  onSubscribe: (targetPrice: number) => void;
};

const twd = new Intl.NumberFormat("zh-TW");

export function PlanCard({ plan, subscription, saving, onSubscribe }: Props) {
  const subscribed = Boolean(subscription);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(subscription?.target_price ?? plan.hintTwd));

  useEffect(() => {
    if (subscription) setValue(String(subscription.target_price));
  }, [subscription]);

  const showForm = !subscribed || editing;

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
        {subscribed && (
          <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            已訂閱
          </span>
        )}
      </div>

      {subscribed && !editing && (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">
            目標價{" "}
            <span className="text-base font-bold text-foreground">
              NT${twd.format(subscription!.target_price)}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-accent"
          >
            更新目標價
          </button>
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
            {saving ? "儲存中…" : subscribed ? "儲存新目標價" : "開始追蹤"}
          </button>
          {subscribed && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="w-full text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              取消
            </button>
          )}
        </form>
      )}
    </div>
  );
}
