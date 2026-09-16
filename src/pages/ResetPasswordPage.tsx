import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useDocumentMeta } from "@/lib/document-meta";

function translatePasswordError(message: string): string {
  const map: Record<string, string> = {
    "Password should be at least 6 characters": "密碼至少需要 6 個字元。",
    "New password should be different from the old password.": "新密碼不能跟舊密碼一樣。",
    "Auth session missing!": "重設連結已失效，請重新申請一次。",
  };
  for (const [key, zh] of Object.entries(map)) {
    if (message.includes(key)) return zh;
  }
  return `發生未預期的錯誤，請稍後再試。（${message}）`;
}

// 使用者點信件裡的連結進來時，網址帶著 Supabase 的恢復用 token，
// SDK 會自動解析並觸發 PASSWORD_RECOVERY 事件、建立一個臨時 session。
// 在事件真的來、或確認 session 已存在之前，不能讓使用者看到表單。
type Status = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useDocumentMeta({
    title: "重設密碼 — Site Watch",
    description: "設定你的 Site Watch 新密碼。",
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // 頁面重新整理時 PASSWORD_RECOVERY 事件不會再觸發一次，
    // 但 session 通常已經存在，用這個當備援判斷。
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((s) => (s === "checking" ? "ready" : s));
    });

    // 4 秒內都等不到，代表連結多半已失效或被打開過一次。
    const timer = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("兩次輸入的密碼不一致，請確認後再試一次。");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(translatePasswordError(updateError.message));
      return;
    }

    setDone(true);
    setTimeout(() => navigate("/app"), 2000);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="glow-orb left-1/2 top-[-160px] h-[400px] w-[600px] -translate-x-1/2" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="text-2xl">🛰️</span>
            <span className="text-lg font-bold tracking-tight text-foreground">Site Watch</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/40">
          {status === "checking" && (
            <p className="text-sm text-muted-foreground">確認重設連結中…</p>
          )}

          {status === "invalid" && (
            <>
              <h1 className="text-2xl font-bold text-card-foreground">連結已失效</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                這個重設密碼連結可能已經過期或使用過了，請重新申請一次。
              </p>
              <Link
                to="/forgot-password"
                className="mt-6 block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
              >
                重新申請重設密碼
              </Link>
            </>
          )}

          {status === "ready" && done && (
            <>
              <h1 className="text-2xl font-bold text-card-foreground">密碼已更新</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                正在為你導向控制台…
              </p>
            </>
          )}

          {status === "ready" && !done && (
            <>
              <h1 className="text-2xl font-bold text-card-foreground">設定新密碼</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                請輸入你的新密碼，設定完成後會自動登入。
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-card-foreground"
                  >
                    新密碼
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm"
                    className="mb-1.5 block text-sm font-medium text-card-foreground"
                  >
                    確認新密碼
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "處理中…" : "更新密碼"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← 回首頁
          </Link>
        </p>
      </div>
    </div>
  );
}
