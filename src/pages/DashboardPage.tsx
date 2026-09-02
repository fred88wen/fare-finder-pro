import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { MonitorCard } from "@/components/MonitorCard";
import { useAuthedUser } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/lib/document-meta";
import {
  CHECK_TYPE_META,
  DEFAULT_THRESHOLD_DAYS,
  MONTHLY_PRICE_TWD,
  cancelSubscription,
  goToCheckout,
  listSubscriptions,
  saveSubscription,
  type CheckType,
  type Subscription,
} from "@/lib/flight-api";

export default function DashboardPage() {
  const user = useAuthedUser();
  const navigate = useNavigate();
  const email = user.email ?? "";

  useDocumentMeta({
    title: "Dashboard — Site Watch",
    description: "Manage your uptime and domain expiry monitors.",
    robots: "noindex",
  });

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancellingRoute, setCancellingRoute] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Add-monitor form state
  const [target, setTarget] = useState("");
  const [checkType, setCheckType] = useState<CheckType>("uptime");
  const [threshold, setThreshold] = useState(String(DEFAULT_THRESHOLD_DAYS));

  // Editing an existing domain_expiry monitor's threshold (target/check_type are fixed
  // once paid — the target string is the DynamoDB key, changing it creates a new row).
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState("");

  const refresh = useCallback(async () => {
    if (!email) return;
    try {
      setSubscriptions(await listSubscriptions(email));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入監控項目");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ECPay returns the browser through the /ecpay-result redirect Lambda. The row is
  // activated by the S2S ReturnURL callback, not here — this only shows the outcome
  // and re-reads the row (the callback usually lands first, but may take a moment).
  useEffect(() => {
    const purchase = searchParams.get("purchase");
    if (!purchase) return;
    if (purchase === "success") {
      setNotice("付款完成！監控啟用中，稍候幾秒重新整理即可看到「已訂閱」。");
      const timer = setTimeout(() => void refresh(), 4000);
      searchParams.delete("purchase");
      setSearchParams(searchParams, { replace: true });
      return () => clearTimeout(timer);
    }
    setError("付款未完成，可以再試一次。");
    searchParams.delete("purchase");
    setSearchParams(searchParams, { replace: true });
    return undefined;
  }, [searchParams, setSearchParams, refresh]);

  async function handleAddMonitor(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = target.trim();
    if (!trimmed) {
      setError("請輸入網址或網域");
      return;
    }
    let thresholdDays: number | undefined;
    if (checkType === "domain_expiry") {
      thresholdDays = Number(threshold);
      if (!Number.isFinite(thresholdDays) || thresholdDays <= 0) {
        setError("提醒天數必須是正整數");
        return;
      }
    }

    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const result = await saveSubscription(
        thresholdDays === undefined
          ? { email, target: trimmed, checkType }
          : { email, target: trimmed, checkType, threshold: thresholdDays },
      );
      if (result.kind === "checkout") {
        goToCheckout(result.html); // leaves this page for ECPay's cashier
        return;
      }
      const saved = result.subscription;
      setSubscriptions((rows) => [...rows.filter((row) => row.route !== saved.route), saved]);
      setNotice(`已更新 ${saved.target} 的監控設定`);
      setTarget("");
      setThreshold(String(DEFAULT_THRESHOLD_DAYS));
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  function startEditThreshold(subscription: Subscription) {
    setEditingRoute(subscription.route);
    setEditThreshold(String(subscription.threshold ?? DEFAULT_THRESHOLD_DAYS));
    setNotice(null);
    setError(null);
  }

  async function handleSaveThreshold(event: React.FormEvent, subscription: Subscription) {
    event.preventDefault();
    const days = Number(editThreshold);
    if (!Number.isFinite(days) || days <= 0) {
      setError("提醒天數必須是正整數");
      return;
    }
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const result = await saveSubscription({
        email,
        target: subscription.target,
        checkType: subscription.check_type,
        threshold: days,
      });
      if (result.kind === "checkout") {
        goToCheckout(result.html);
        return;
      }
      const saved = result.subscription;
      setSubscriptions((rows) => [...rows.filter((row) => row.route !== saved.route), saved]);
      setNotice(`已更新 ${saved.target} 的提醒天數`);
      setEditingRoute(null);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(route: string) {
    if (!window.confirm("取消後不再自動續扣，本期到期前仍會持續監控。確定取消訂閱？")) return;
    setCancellingRoute(route);
    setNotice(null);
    try {
      const cancelled = await cancelSubscription({ email, route });
      setNotice(
        `已取消 ${route} 的自動續訂，${cancelled.current_period_end_date ?? "本期結束"} 前仍會持續監控。`,
      );
      setError(null);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消失敗");
    } finally {
      setCancellingRoute(null);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="glow-orb left-1/2 top-[-200px] h-[400px] w-[640px] -translate-x-1/2" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">🛰️</span>
          <span className="text-base font-bold tracking-tight text-foreground">Site Watch</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-accent"
        >
          Sign out / 登出
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            你的網站監控儀表板
          </h1>
          <p className="mt-3 text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            輸入網址或網域，選擇監控類型。掛掉或即將到期時，寄信通知你。
          </p>
          <p className="mx-auto mt-2 max-w-lg text-xs text-muted-foreground">
            每個監控月費 NT${MONTHLY_PRICE_TWD.toLocaleString("zh-TW")}，綠界信用卡定期定額，隨時可取消。
          </p>
        </div>

        {error && (
          <p className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-8 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
            {notice}
          </p>
        )}

        <form
          onSubmit={handleAddMonitor}
          className="mt-10 space-y-4 rounded-2xl border border-border bg-card/60 p-6"
        >
          <h2 className="text-sm font-bold text-card-foreground">新增監控</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(CHECK_TYPE_META) as CheckType[]).map((type) => {
              const meta = CHECK_TYPE_META[type];
              const active = checkType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCheckType(type)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  <div className="text-2xl">{meta.emoji}</div>
                  <div className="mt-2 text-sm font-semibold text-foreground">{meta.label}</div>
                  <div className="text-xs text-muted-foreground">{meta.subtitle}</div>
                </button>
              );
            })}
          </div>

          <label className="block text-sm font-medium text-foreground">
            {checkType === "uptime" ? "網站網址" : "網域名稱"}
            <input
              type="text"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder={CHECK_TYPE_META[checkType].placeholder}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>

          {checkType === "domain_expiry" && (
            <label className="block text-sm font-medium text-foreground">
              到期前幾天提醒
              <input
                type="number"
                min={1}
                step={1}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <span className="mt-1 block text-xs text-muted-foreground">建議 30 / 14 / 7 / 1 天</span>
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "處理中…" : "訂閱並付款"}
          </button>
        </form>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {subscriptions.map((subscription) =>
            editingRoute === subscription.route ? (
              <form
                key={subscription.route}
                onSubmit={(event) => void handleSaveThreshold(event, subscription)}
                className="rounded-2xl border border-primary/40 bg-card/60 p-6 text-left"
              >
                <h3 className="text-sm font-bold text-card-foreground">{subscription.target}</h3>
                <label className="mt-4 block text-sm font-medium text-foreground">
                  到期前幾天提醒
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={editThreshold}
                    onChange={(event) => setEditThreshold(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? "儲存中…" : "儲存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRoute(null)}
                    className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                  >
                    取消編輯
                  </button>
                </div>
              </form>
            ) : (
              <MonitorCard
                key={subscription.route}
                subscription={subscription}
                cancelling={cancellingRoute === subscription.route}
                onEdit={() => startEditThreshold(subscription)}
                onCancel={() => void handleCancel(subscription.route)}
              />
            ),
          )}
        </div>

        {loading && <p className="mt-6 text-center text-sm text-muted-foreground">載入監控項目中…</p>}
        {!loading && subscriptions.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            還沒有監控項目，用上面的表單新增一個吧。
          </p>
        )}
      </main>
    </div>
  );
}
