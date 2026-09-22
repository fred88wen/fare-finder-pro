import { Link } from "react-router-dom";

import { useDocumentMeta } from "@/lib/document-meta";

/**
 * Swiss anchor. Copy is frozen in SHOP-COPY-FINAL-2026-09-22.md — every number
 * on this page traces back to code (see that file's 規格出處 table). No scroll-
 * triggered reveals here on purpose: they render blank under headless capture
 * and on clients that never scroll.
 */

const painPoints = [
  {
    n: "01",
    title: "靠客人告訴你",
    body: "客人截圖問你網站是不是壞了。那時候通常已經掛了一段時間。",
  },
  {
    n: "02",
    title: "靠自己剛好打開",
    body: "沒有人整天盯著自己的網站。晚上、假日、出差，都是空窗。",
  },
  {
    n: "03",
    title: "等續約信通知",
    body: "網域到期信一年才寄一次。真的過期，有人會立刻把它買走。",
  },
];

const whys = [
  {
    n: "01",
    title: "你不是第一個知道的人",
    body: "網站出事到你發現，中間流失的訂單和信任都算你的。Site Watch 把這段壓到 30 分鐘內。",
  },
  {
    n: "02",
    title: "自動續約也會失敗",
    body: "2017 年 Marketo 設了自動續約，照樣過期，全球客戶網站上的表單掛了 7 個多小時。",
  },
  {
    n: "03",
    title: "過期當天，網站就打不開",
    body: "網域一進贖回期，註冊局依規定停止 DNS 解析。不是「晚幾天補繳」，是當下就掛。",
  },
  {
    n: "04",
    title: "沒有 IT，也要有人看著",
    body: "中小企業多半沒有專人盯網站。一封 email 就能補上這個位置。",
  },
  {
    n: "05",
    title: "不出事的時候，它不吵你",
    body: "同一個問題 24 小時內只寄一次。不會因為網站一直沒修好就灌爆你的信箱。",
  },
];

const features = [
  {
    title: "網站運行監控",
    en: "Uptime monitoring",
    body: "每 30 分鐘連一次你的網站，連不上就寄信給你。",
  },
  {
    title: "網域到期提醒",
    en: "Domain expiry alerts",
    body: "到期前 30、14、7、1 天提醒，天數你自己設。",
  },
  {
    title: "隨時取消",
    en: "Cancel anytime",
    body: "月訂閱制，不想用隨時停，沒有綁約、沒有違約金。",
  },
];

const cases = [
  {
    year: "1999",
    who: "微軟",
    body: "聖誕夜，微軟忘了繳 35 美元，passport.com 過期，Hotmail 登入全掛。隔天由一位工程師自費繳清才恢復。2003 年又在另一個網域重演一次。",
    sourceLabel: "Slashdot",
    sourceUrl:
      "https://slashdot.org/story/99/12/25/114201/microsoft-hotmailpassport-service-interruptedupdated",
  },
  {
    year: "2017",
    who: "Marketo",
    body: "行銷軟體公司 Marketo 主網域過期，服務中斷約 7 小時。全球客戶網站上的表單同時失效，連寄信給該公司員工都退信，最後由一位客戶自掏腰包代為贖回。",
    sourceLabel: "The Register",
    sourceUrl:
      "https://www.theregister.com/2017/07/26/marketo_forgot_to_renew_domain/",
  },
];

/**
 * ⚠️ 頁面價格與後端尚未一致（SHOP-REDESIGN-DECISION-2026-09-22.md 決策 2）。
 * aws/shared/ecpay_common.py 只有單一全域 amount（預設 300）且沒有年繳週期，
 * 綠界仍是 stage 測試商店。轉正式商店前必須先把雙方案與年繳扣款補上，
 * 不可只改這裡的數字就上線。
 */
const plans = [
  {
    name: "月繳",
    price: "99",
    unit: "元 / 月",
    featured: false,
    points: ["每 30 分鐘檢查一次", "網域到期自動提醒", "隨時取消，不綁約"],
  },
  {
    name: "年繳",
    price: "499",
    unit: "元 / 年",
    featured: true,
    points: ["功能與月繳完全相同", "一年省 689 元", "等於只付 5 個月"],
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
    title:
      "網站出現 502 Bad Gateway 怎麼辦？5 個常見錯誤碼代表誰壞了，非工程師也看得懂的排查步驟",
    summary:
      "502 Bad Gateway 出現的當下，多數老闆其實是靠客人截圖才知道網站掛了，中間往往已經隔了好幾十分鐘的營業損失。這篇整理 3 分鐘自我排查法與 5 個常見錯誤碼對照表，別再讓客人比你先知道。",
    url: "https://www.goboss.tw/502-bad-gateway/",
    image: "/articles/502-bad-gateway.jpeg",
  },
  {
    slug: "lets-encrypt-ssl-guide",
    title:
      "Let's Encrypt 免費 SSL 憑證是什麼？中小企業老闆該不該用？完整申請與續期指南",
    summary:
      "Let's Encrypt 免費 SSL 憑證到底安不安全？中小企業該裝免費版還是花錢買付費憑證，才不會白花冤枉錢？從加密強度、DV／OV／EV 驗證等級差異，拆解到沒有工程師也能完成的申請與續期設定。",
    url: "https://www.goboss.tw/lets-encrypt-ssl-guide/",
    image: "/articles/lets-encrypt-ssl-guide.jpeg",
  },
  {
    slug: "vulnerability-scanning-guide",
    title:
      "2026 網站弱點掃描是什麼？2026 最新費用、工具與 5 步驟自查教學一次搞懂",
    summary:
      "弱點掃描費用多少？5 步驟就能自查網站漏洞。本文一次講清弱點掃描是什麼、跟滲透測試差在哪、免費與付費工具怎麼選，並附完整自查教學流程。",
    url: "https://www.goboss.tw/vulnerability-scanning-guide/",
    image: "/articles/vulnerability-scanning-guide.jpeg",
  },
];

const faqs = [
  {
    q: "我自己設個提醒不就好了？",
    a: "可以，但提醒只管網域到期，管不到網站半夜掛掉。而且 Marketo 設了自動續約，2017 年照樣過期。",
  },
  {
    q: "網站掛掉多久會通知我？",
    a: "每 30 分鐘檢查一次，連不上就寄信，最慢 30 分鐘內你會知道。",
  },
  {
    q: "會不會一直寄信很煩？",
    a: "同一個問題 24 小時內只寄一次。網站持續沒修好，也不會重複轟炸你的信箱。",
  },
  {
    q: "怎麼取消？",
    a: "登入後自己按取消，立刻生效。已經付的那一期照常服務到期滿，不會馬上斷掉。",
  },
  {
    q: "跟免費的監控工具差在哪？",
    a: "多數工具把「網站」和「網域」分開賣，或要你自己接 API、開儀表板。這裡只做一件事：出事寄一封信給你。",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

export default function LandingPage() {
  useDocumentMeta({
    title: "Site Watch — 網站掛了，多半是客人先發現",
    description:
      "每 30 分鐘檢查一次你的網站，連不上就寄信給你；網域到期前自動提醒。月繳 99 元，隨時取消。",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="text-base font-bold tracking-tight text-ink-deep"
          >
            Site Watch
          </Link>
          <nav className="flex items-center gap-6">
            <a
              href="#pricing"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              價格
            </a>
            <Link
              to="/sign-in"
              className="bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#d4913a]"
            >
              登入 / Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-12 lg:gap-0 lg:py-28">
            <div className="lg:col-span-7 lg:pr-16">
              <SectionLabel>網站監控 · 網域到期提醒</SectionLabel>
              <h1 className="mt-6 text-4xl font-bold leading-[1.15] tracking-tight text-ink-deep sm:text-5xl lg:text-6xl">
                你的網站掛了，
                <br />
                多半是客人先發現
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-foreground sm:text-lg">
                Site Watch 每 30 分鐘檢查一次，出事就寄信給你。網域到期也一併盯著，不用等續約通知躺在垃圾郵件裡。
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/sign-in"
                  className="bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-[#d4913a]"
                >
                  登入 / Sign in
                </Link>
                <a
                  href="#pricing"
                  className="border border-ink-deep px-7 py-3.5 text-base font-semibold text-ink-deep transition-colors hover:bg-ink-deep hover:text-background"
                >
                  看方案價格 ↓
                </a>
              </div>
            </div>

            {/* Spec dial — the numbers are the product spec, not decoration */}
            <div className="border-t border-border pt-10 lg:col-span-5 lg:border-t-0 lg:border-l lg:pl-16 lg:pt-0">
              <div>
                <div className="text-[88px] font-bold leading-none tracking-tighter tabular-nums text-ink-deep lg:text-[112px]">
                  30
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  分鐘檢查一次
                </p>
              </div>
              <div className="mt-10 border-t border-border pt-10">
                <div className="text-[88px] font-bold leading-none tracking-tighter tabular-nums text-ink-deep lg:text-[112px]">
                  24
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  小時內不重複打擾
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pain points */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionLabel>你現在靠什麼發現</SectionLabel>
            <div className="mt-10 grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
              {painPoints.map((p) => (
                <div key={p.n} className="bg-background p-8 sm:px-8 sm:py-10">
                  <span className="text-3xl font-bold leading-none tabular-nums text-muted-foreground/45">
                    {p.n}
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-ink-deep">
                    {p.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 Why */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-12 lg:gap-0">
            <div className="lg:col-span-4 lg:pr-12">
              <div className="lg:sticky lg:top-16">
                <SectionLabel>五個理由</SectionLabel>
                <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-ink-deep sm:text-4xl">
                  為什麼現在
                  <br />
                  就要裝
                </h2>
              </div>
            </div>
            <ul className="lg:col-span-8">
              {whys.map((w, i) => (
                <li
                  key={w.n}
                  className={`grid grid-cols-[3rem_1fr] gap-6 py-8 sm:grid-cols-[4rem_1fr] ${
                    i === 0 ? "border-t border-border" : ""
                  } border-b border-border`}
                >
                  <span className="text-2xl font-bold tabular-nums text-ink-deep sm:text-3xl">
                    {w.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-ink-deep sm:text-xl">
                      {w.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {w.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionLabel>它做什麼</SectionLabel>
            <div className="mt-10 grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="bg-background p-8 sm:py-10">
                  <h2 className="text-xl font-bold text-ink-deep">{f.title}</h2>
                  <p className="mt-1 text-xs tracking-wide text-muted-foreground">
                    {f.en}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-foreground">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real incidents */}
        <section className="border-b border-border bg-[#EFEFEC]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionLabel>真實事件</SectionLabel>
            <h2 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-ink-deep sm:text-4xl">
              忘記續約網域，代價是這樣
            </h2>

            <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
              {cases.map((c) => (
                <article key={c.year} className="border-t-2 border-ink-deep pt-6">
                  <div className="flex items-baseline gap-4">
                    <span className="text-[64px] font-bold leading-none tracking-tighter tabular-nums text-ink-deep sm:text-[80px]">
                      {c.year}
                    </span>
                    <span className="text-lg font-bold text-ink-deep">
                      {c.who}
                    </span>
                  </div>
                  <p className="mt-6 text-sm leading-relaxed text-foreground sm:text-base">
                    {c.body}
                  </p>
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-ink-deep"
                  >
                    來源：{c.sourceLabel}
                  </a>
                </article>
              ))}
            </div>

            <p className="mt-14 border-t border-border pt-8 text-lg font-bold text-ink-deep sm:text-xl">
              這兩家都有專職 IT。他們忘記的不是技術，是日期。
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-8 border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionLabel>方案</SectionLabel>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-ink-deep sm:text-4xl">
              一個月 99 元
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-4xl">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`border p-8 ${
                    p.featured
                      ? "border-2 border-ink-deep"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-ink-deep">
                      {p.name}
                    </h3>
                    {p.featured && (
                      <span className="bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                        推薦
                      </span>
                    )}
                  </div>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-[64px] font-bold leading-none tracking-tighter tabular-nums text-ink-deep">
                      {p.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {p.unit}
                    </span>
                  </div>
                  <ul className="mt-8 space-y-3 border-t border-border pt-6">
                    {p.points.map((pt) => (
                      <li
                        key={pt}
                        className="text-sm leading-relaxed text-foreground"
                      >
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/sign-in"
                    className={`mt-8 block px-6 py-3 text-center text-sm font-semibold transition-colors ${
                      p.featured
                        ? "bg-primary text-primary-foreground hover:bg-[#d4913a]"
                        : "border border-ink-deep text-ink-deep hover:bg-ink-deep hover:text-background"
                    }`}
                  >
                    登入 / Sign in
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Articles */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionLabel>顧問實戰整理</SectionLabel>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-ink-deep sm:text-4xl">
              網站出事了，你會第一個知道嗎？
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {incidentArticles.map((a) => (
                <a
                  key={a.slug}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col border-t border-border pt-5"
                >
                  <img
                    src={a.image}
                    alt={a.title}
                    width={600}
                    height={448}
                    loading="lazy"
                    className="h-36 w-full object-cover"
                  />
                  <h3 className="mt-4 line-clamp-3 text-sm font-bold leading-snug text-ink-deep group-hover:underline">
                    {a.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {a.summary}
                  </p>
                  <span className="mt-4 text-xs font-semibold text-primary">
                    閱讀完整文章 →
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-12 lg:gap-0">
            <div className="lg:col-span-4 lg:pr-12">
              <SectionLabel>常見問題</SectionLabel>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-ink-deep sm:text-4xl">
                買之前
                <br />
                會想問的
              </h2>
            </div>
            <div className="lg:col-span-8">
              {faqs.map((f, i) => (
                <details
                  key={f.q}
                  className={`group bg-[#FBF2E7] ${
                    i === 0 ? "border-t border-border" : ""
                  } border-b border-border`}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-base font-bold text-ink-deep [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="shrink-0 text-xl font-normal text-primary group-open:hidden">
                      +
                    </span>
                    <span className="hidden shrink-0 text-xl font-normal text-primary group-open:inline">
                      −
                    </span>
                  </summary>
                  <p className="px-6 pb-6 text-sm leading-relaxed text-foreground">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-primary">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              下次出事，讓你第一個知道
            </h2>
            <Link
              to="/sign-in"
              className="shrink-0 bg-ink-deep px-8 py-4 text-base font-semibold text-background transition-opacity hover:opacity-90"
            >
              登入 / Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
          <p>© 2026 Site Watch</p>
          <p className="mt-2">
            客服信箱：fred88wen@gmail.com　·　客服電話：0906-680082
          </p>
        </div>
      </footer>
    </div>
  );
}
