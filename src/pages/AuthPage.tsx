import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/lib/document-meta";

type Mode = "sign-in" | "sign-up";

export default function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useDocumentMeta({
    title: "Sign in — Flight Price Notifier",
    description: "Sign in to manage your fare alerts. 登入以管理你的機票降價通知。",
  });

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/app", { replace: true });
    });
  }, [navigate]);

  // Clear transient messages when switching between /sign-in and /sign-up.
  useEffect(() => {
    setError(null);
    setNotice(null);
  }, [mode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        navigate("/app");
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          navigate("/app");
        } else {
          setNotice("帳號已建立!請到信箱點擊確認連結後再登入。");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="glow-orb left-1/2 top-[-160px] h-[400px] w-[600px] -translate-x-1/2" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Flight Price Notifier
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/40">
          <h1 className="text-2xl font-bold text-card-foreground">
            {mode === "sign-in" ? "Welcome back.登入" : "建立帳號"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "sign-in"
              ? "Sign in to manage your fare alerts."
              : "Create an account to start watching fares."}
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-card-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive-foreground">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2.5 text-sm text-foreground">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in / 登入"
                  : "Create account / 註冊"}
            </button>
          </form>

          <Link
            to={mode === "sign-in" ? "/sign-up" : "/sign-in"}
            className="mt-6 block w-full text-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {mode === "sign-in" ? "No account yet? Create one" : "Already have an account? Sign in"}
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
