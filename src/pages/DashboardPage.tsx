import { Link, useNavigate } from "react-router-dom";

import { useAuthedUser } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/lib/document-meta";

export default function DashboardPage() {
  const user = useAuthedUser();
  const navigate = useNavigate();

  useDocumentMeta({
    title: "Dashboard — Flight Price Notifier",
    description: "Manage your fare alerts.",
    robots: "noindex",
  });

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

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          你的降價通知儀表板
        </h1>
        <p className="mt-3 text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </p>

        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card/60 p-12">
          <div className="text-4xl">🔔</div>
          <h2 className="mt-4 text-lg font-bold text-card-foreground">航線訂閱功能即將推出</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Route subscriptions, target prices, and fare tracking are coming in the next milestone.
            很快就能在這裡設定你想追蹤的航線與目標價。
          </p>
        </div>
      </main>
    </div>
  );
}
