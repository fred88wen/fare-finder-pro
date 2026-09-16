import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { useDocumentMeta } from "@/lib/document-meta";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useDocumentMeta({
    title: "忘記密碼 — Site Watch",
    description: "重設你的 Site Watch 帳號密碼。",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // 不走 Supabase 內建寄信（免費方案未設自訂 SMTP 時只寄得到專案團隊成員的信箱，
      // 真客戶收不到），改打自己的 /api/forgot-password，用 Resend 寄中文信。
      await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      // 不論這個 email 是否已註冊、或請求本身是否成功，一律顯示同一句成功訊息——
      // 避免有心人拿這個表單去試探哪些信箱已經有帳號，也避免暴露內部錯誤細節。
      setLoading(false);
      setSent(true);
    }
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
          {sent ? (
            <>
              <h1 className="text-2xl font-bold text-card-foreground">請檢查你的信箱</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                如果 <span className="font-medium text-card-foreground">{email}</span>{" "}
                這個信箱有註冊帳號，我們已經寄出重設密碼的連結。信件幾分鐘內沒收到，記得看看垃圾信件匣。
              </p>
              <Link
                to="/sign-in"
                className="mt-6 block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
              >
                回到登入頁
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-card-foreground">忘記密碼？</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                輸入註冊時使用的 email，我們會寄一封重設密碼的連結給你。
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-card-foreground"
                  >
                    Email / 電子信箱
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "處理中…" : "寄送重設連結"}
                </button>
              </form>

              <Link
                to="/sign-in"
                className="mt-6 block w-full text-center text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                想起密碼了？前往登入
              </Link>
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
