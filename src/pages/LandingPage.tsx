import { useEffect } from "react";
import { Link } from "react-router-dom";

import { useDocumentMeta } from "@/lib/document-meta";

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

const features = [
  {
    icon: "🟢",
    title: "網站正常運行監控",
    subtitle: "Uptime monitoring",
    description: "定期檢查你的網站是否能正常連線,一旦掛掉立刻寄 email 通知你。",
    delay: "reveal-delay-1",
  },
  {
    icon: "📅",
    title: "網域到期提醒",
    subtitle: "Domain expiry alerts",
    description: "到期前 30 / 14 / 7 / 1 天自動提醒,不怕忘記續約網域被搶走。",
    delay: "reveal-delay-2",
  },
  {
    icon: "🚫",
    title: "隨時取消",
    subtitle: "Cancel anytime",
    description: "月訂閱制,不想用隨時停,沒有綁約。",
    delay: "reveal-delay-3",
  },
];

const incidentArticles = [
  {
    slug: "ddos-attack-guide",
    title:
      "網站被DDoS攻擊了嗎？中小企業3步驟自救教學，檢測清單、應變流程與法律責任一次看懂",
    summary:
      "DDoS攻擊來得又急又猛，沒有IT團隊的中小企業也能自救。從辨識流量異常徵兆、聯繫主機商開票，到啟動緊急防護模式，完整三步驟教學帶你把停機時間與營收損失降到最低。",
    url: "https://www.goboss.tw/ddos-attack-guide/",
    image: "/articles/ddos-attack-guide.jpeg",
  },
  {
    slug: "502-bad-gateway",
    title: "網站出現 502 Bad Gateway 怎麼辦？5 個常見錯誤碼代表誰壞了，非工程師也看得懂的排查步驟",
    summary:
      "502 Bad Gateway 出現的當下，多數老闆其實是靠客人截圖才知道網站掛了，中間往往已經隔了好幾十分鐘的營業損失。這篇整理 3 分鐘自我排查法與 5 個常見錯誤碼對照表，別再讓客人比你先知道。",
    url: "https://www.goboss.tw/502-bad-gateway/",
    image: "/articles/502-bad-gateway.jpeg",
  },
  {
    slug: "lets-encrypt-ssl-guide",
    title: "Let's Encrypt 免費 SSL 憑證是什麼？中小企業老闆該不該用？完整申請與續期指南",
    summary:
      "Let's Encrypt 免費 SSL 憑證到底安不安全？中小企業該裝免費版還是花錢買付費憑證，才不會白花冤枉錢？從加密強度、DV／OV／EV 驗證等級差異，拆解到沒有工程師也能完成的申請與續期設定。",
    url: "https://www.goboss.tw/lets-encrypt-ssl-guide/",
    image: "/articles/lets-encrypt-ssl-guide.jpeg",
  },
  {
    slug: "vulnerability-scanning-guide",
    title: "2026 網站弱點掃描是什麼？2026 最新費用、工具與 5 步驟自查教學一次搞懂",
    summary:
      "弱點掃描費用多少？5 步驟就能自查網站漏洞。本文一次講清弱點掃描是什麼、跟滲透測試差在哪、免費與付費工具怎麼選，並附完整自查教學流程。",
    url: "https://www.goboss.tw/vulnerability-scanning-guide/",
    image: "/articles/vulnerability-scanning-guide.jpeg",
  },
];

export default function LandingPage() {
  useDocumentMeta({
    title: "Site Watch — 網站健康監控",
    description:
      "網站掛了、網域忘記續約——一個 email 通知搞定。Uptime monitoring and domain expiry alerts, delivered by email.",
  });
  useScrollReveal();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ambient glow */}
      <div className="glow-orb left-1/2 top-[-200px] h-[480px] w-[720px] -translate-x-1/2" />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">🛰️</span>
          <span className="text-base font-bold tracking-tight text-foreground">
            Site Watch
          </span>
        </Link>
        <Link
          to="/sign-in"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40"
        >
          Sign in / 登入
        </Link>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
          <div className="reveal inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs font-medium text-secondary-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            網站監控 · 網域到期提醒
          </div>

          <h1 className="reveal reveal-delay-1 mt-8 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl">
            Site Watch
            <span className="mt-3 block bg-gradient-to-r from-primary via-accent-foreground to-primary bg-clip-text text-2xl font-bold text-transparent sm:text-4xl">
              網站掛了、網域忘記續約,一個 email 通知搞定
            </span>
          </h1>

          <p className="reveal reveal-delay-2 mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Uptime monitoring and domain expiry alerts, delivered by email.
          </p>

          <div className="reveal reveal-delay-3 mt-10">
            <Link
              to="/sign-in"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] hover:bg-primary/90 hover:shadow-primary/50"
            >
              Sign in / 登入
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                className={`reveal ${f.delay} group rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/50`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl transition-transform group-hover:scale-110">
                  {f.icon}
                </div>
                <h2 className="mt-5 text-lg font-bold text-card-foreground">{f.title}</h2>
                <p className="mt-1 text-sm font-medium text-primary">{f.subtitle}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </article>
            ))}
          </div>
        </section>
        {/* 網站出事了怎麼辦 */}
        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              網站出事了，你會第一個知道嗎？
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              4 篇顧問實戰整理，帶你看懂網站最常見的意外
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {incidentArticles.map((a) => (
              <a
                key={a.slug}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="reveal group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50"
              >
                <img
                  src={a.image}
                  alt={a.title}
                  width={600}
                  height={448}
                  loading="lazy"
                  className="h-40 w-full object-cover"
                />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-card-foreground">
                    {a.title}
                  </h3>
                  <p className="mt-2 line-clamp-4 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {a.summary}
                  </p>
                  <span className="mt-4 text-xs font-semibold text-primary group-hover:underline">
                    閱讀完整文章 →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Site Watch</p>
        <p className="mt-2">
          客服信箱：fred88wen@gmail.com　·　客服電話：0906-680082
        </p>
      </footer>
    </div>
  );
}
