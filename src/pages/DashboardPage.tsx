import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PlanCard } from "@/components/PlanCard";
import { useAuthedUser } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/lib/document-meta";
import { listSubscriptions, PLANS, saveSubscription, type Subscription } from "@/lib/flight-api";

export default function DashboardPage() {
  const user = useAuthedUser();
  const navigate = useNavigate();
  const email = user.email ?? "";

  useDocumentMeta({
    title: "Dashboard — Flight Price Notifier",
    description: "Manage your fare alerts.",
    robots: "noindex",
  });

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!email) return;
    try {
      setSubscriptions(await listSubscriptions(email));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入訂閱資料");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSubscribe(planName: "tokyo" | "seoul", targetPrice: number) {
    setSavingPlan(planName);
    setNotice(null);
    try {
      const saved = await saveSubscription({ email, planName, targetPrice });
      setSubscriptions((rows) => [
        ...rows.filter((row) => row.route !== saved.route),
        { ...saved } as Subscription,
      ]);
      setNotice(`已設定 ${saved.route} 目標價 NT$${targetPrice.toLocaleString("zh-TW")}`);
      setError(null);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSavingPlan(null);
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
          <span className="text-xl">✈️</span>
          <span className="text-base font-bold tracking-tight text-foreground">
            Flight Price Notifier
          </span>
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
            你的降價通知儀表板
          </h1>
          <p className="mt-3 text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            選一條航線、設一個目標價。每 30 分鐘自動抓最低票價，低於目標價就寄信通知你。
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

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.planName}
              plan={plan}
              subscription={subscriptions.find((row) => row.route === plan.route)}
              saving={savingPlan === plan.planName}
              onSubscribe={(targetPrice) => void handleSubscribe(plan.planName, targetPrice)}
            />
          ))}
        </div>

        {loading && <p className="mt-6 text-center text-sm text-muted-foreground">載入訂閱中…</p>}
      </main>
    </div>
  );
}
