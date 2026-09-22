# shop.goboss.tw 改版 — 文案定稿（已逐塊核准 2026-09-22）

> 骨架與決策依據：`SHOP-COPY-SKELETON-2026-09-22.md`、`SHOP-REDESIGN-DECISION-2026-09-22.md`。
> 本檔是**實作時的唯一文案來源**。所有數字規格都已從 code 實測，出處記在下方「規格出處」。

## 設計方向（已定案）

- **Anchor：Swiss**（frontend-design 八選一）。理由：用冷靜理性的格線排版講一件焦慮的事，張力來自內容與形式的反差；對付費訂閱頁的信任感也有利。底色 `#F8F8F6` 本就近似 Swiss 的 `#F7F7F8`。
- **品牌色覆蓋 anchor palette**（決策 3 已定，非隨意混搭）：`src/styles.css` 既有 goboss token 不動——橘 `#EDAA4C`（唯一 accent，只給 CTA）、天藍 `#55C8F1`、奶油 `#FBF2E7`、底 `#F8F8F6`、深墨 `#182737`、hairline `#E4E4E0`。
  - **Swiss 純度處理**：Swiss 禁 warm paper，而奶油 `#FBF2E7` 正是。故**奶油只用於極小面積**（引言、FAQ 卡背），大面積底一律 `#F8F8F6` / `#EFEFEC`。
- **Dial：DESIGN_VARIANCE 7｜MOTION_INTENSITY 2｜VISUAL_DENSITY 4**
  - MOTION 壓到 2 是刻意的：全靜態、只保留 hover。同時滿足「不要捲動觸發淡入」（決策遺留風險 4）與避開 `ui-verify` 拍空白的驗證死角。
- **Differentiator**：整頁以 1px hairline **刻度軸**貫穿，所有數字用等寬 tabular numerals 當構圖元素而非裝飾——`30`、`24`、`01–05`、`1999`、`2017`、`99`、`499`。整頁讀起來像一份儀表刻度。
- **禁止**：emoji 當圖示（現有 🛰️🟢📅🚫 全移除）、漸層、發光、捲動淡入、假客戶／假 logo／假統計。

---

## 區塊 1　Header

品牌名 `Site Watch`（移除 🛰️）。右側：`價格` 錨點連結 + `登入 / Sign in` 主鈕。

## 區塊 2　Hero

**主標**：你的網站掛了，多半是客人先發現

**副標**：Site Watch 每 30 分鐘檢查一次，出事就寄信給你。網域到期也一併盯著，不用等續約通知躺在垃圾郵件裡。

**Eyebrow**：網站監控 · 網域到期提醒
**CTA**：主「登入 / Sign in」（橘）／次「看方案價格 ↓」（hairline 外框，錨點到區塊 7）

**版面**：左對齊非對稱（不再滿版置中）。左 7 欄標題＋CTA；右 5 欄以 hairline 分隔，放刻度數字組——大型 `30` 配 `分鐘一次`，下方 `24` 配 `小時內不重複打擾`。兩個數字即產品規格本身。

## 區塊 3　痛點對照

三格橫排，hairline 分隔，無卡片陰影。

| 編號 | 標題 | 內文 |
|---|---|---|
| 01 | 靠客人告訴你 | 客人截圖問你網站是不是壞了。那時候通常已經掛了一段時間。 |
| 02 | 靠自己剛好打開 | 沒有人整天盯著自己的網站。晚上、假日、出差，都是空窗。 |
| 03 | 等續約信通知 | 網域到期信一年才寄一次。真的過期，有人會立刻把它買走。 |

## 區塊 4　5 Why

左側大標題固定：**為什麼現在就要裝**。右側五條掛在刻度軸上，編號 `01`–`05` 等寬數字。

**01　你不是第一個知道的人**
網站出事到你發現，中間流失的訂單和信任都算你的。Site Watch 把這段壓到 30 分鐘內。

**02　自動續約也會失敗**
2017 年 Marketo 設了自動續約，照樣過期，全球客戶網站上的表單掛了 7 個多小時。

**03　過期當天，網站就打不開**
網域一進贖回期，註冊局依規定停止 DNS 解析。不是「晚幾天補繳」，是當下就掛。

**04　沒有 IT，也要有人看著**
中小企業多半沒有專人盯網站。一封 email 就能補上這個位置。

**05　不出事的時候，它不吵你**
同一個問題 24 小時內只寄一次。不會因為網站一直沒修好就灌爆你的信箱。

## 區塊 5　功能三格

三色塊網格。**移除 emoji**，改用編號與 hairline。

| 標題 | 內文 |
|---|---|
| 網站運行監控 | 每 30 分鐘連一次你的網站，連不上就寄信給你。 |
| 網域到期提醒 | 到期前 30、14、7、1 天提醒，天數你自己設。 |
| 隨時取消 | 月訂閱制，不想用隨時停，沒有綁約、沒有違約金。 |

## 區塊 6　兩則真實案例

年份 `1999` / `2017` 用超大等寬數字當構圖主體（differentiator 在此塊的具體長相）。

**1999 — 微軟**
聖誕夜，微軟忘了繳 35 美元，passport.com 過期，Hotmail 登入全掛。隔天由一位工程師自費繳清才恢復。2003 年又在另一個網域重演一次。

**2017 — Marketo**
行銷軟體公司 Marketo 主網域過期，服務中斷約 7 小時。全球客戶網站上的表單同時失效，連寄信給該公司員工都退信，最後由一位客戶自掏腰包代為贖回。

**轉折句（接價格區）**：這兩家都有專職 IT。他們忘記的不是技術，是日期。

## 區塊 7　價格

兩張並排方案卡，hairline 外框，價格數字超大等寬。

**月繳　NT$99 / 月**
- 每 30 分鐘檢查一次
- 網域到期自動提醒
- 隨時取消，不綁約

**年繳　NT$499 / 年**（標記推薦）
- 功能與月繳完全相同
- 一年省 689 元
- 等於只付 5 個月

> 算式：99 × 12 = 1188；1188 − 499 = **689**；499 ÷ 99 ≈ **5.04 個月**。（骨架初版誤寫「省 2 個月」，已更正。）

## 區塊 8　4 篇文章

沿用現有四篇標題／摘要／圖片／URL，內容不改。版面改為四格網格、圖在上、hairline 分隔。區塊標題沿用「網站出事了，你會第一個知道嗎？」。

## 區塊 9　FAQ（5 題）

**我自己設個提醒不就好了？**
可以，但提醒只管網域到期，管不到網站半夜掛掉。而且 Marketo 設了自動續約，2017 年照樣過期。

**網站掛掉多久會通知我？**
每 30 分鐘檢查一次，連不上就寄信，最慢 30 分鐘內你會知道。

**會不會一直寄信很煩？**
同一個問題 24 小時內只寄一次。網站持續沒修好，也不會重複轟炸你的信箱。

**怎麼取消？**
登入後自己按取消，立刻生效。已經付的那一期照常服務到期滿，不會馬上斷掉。

**跟免費的監控工具差在哪？**
多數工具把「網站」和「網域」分開賣，或要你自己接 API、開儀表板。這裡只做一件事：出事寄一封信給你。

> 最後一題刻意**不宣稱競品缺點**（未查證的比較宣稱站不住），改講自己的取捨。

## 區塊 10　收尾 CTA

橘 `#EDAA4C` 整塊，單一按鈕。
**下次出事，讓你第一個知道**　／　［登入 / Sign in］

## 區塊 11　Footer

沿用現有（© 2026 Site Watch、客服信箱、客服電話）。

---

## 規格出處（文案裡的每個數字都對得上 code）

| 數字 | 出處 | 備註 |
|---|---|---|
| 每 30 分鐘檢查一次 | `aws/M1-驗收報告.md` L14：EventBridge `rate(30 minutes)` | rule 名還叫 `flight-price-check`（轉型前遺留）。**上線前用 AWS CLI 實測確認仍為 30 分鐘**，不只信驗收報告 |
| 24 小時內不重複寄信 | `aws/fare_notification/index.py` L22：`NOTIFY_FLOOR_HOURS=24` | 首次告警必送，之後滿 24h 才再送 |
| 到期前 30/14/7/1 天 | `aws/save_subscription/index.py` L138 | 實際天數由使用者自訂，30/14/7/1 為建議值 |
| 取消後服務到期滿 | `aws/cancel_subscription/index.py` docstring | 狀態轉 `cancelled` 非 `expired`，保留 `current_period_end` |
| 取消是自助 | `src/components/MonitorCard.tsx` L89「取消訂閱」按鈕 | 不需寫信或等客服 |

## 外部事實查證

| 主張 | 來源 |
|---|---|
| Marketo 2017-07-25 主網域過期，約 7.5 小時（4:25am→noon PDT），客戶表單全失效、mail server 不通，CEO Steve Lucas 說自動續約失敗，客戶 Travis Prebble 自付 $38 + $35.99 恢復費 | [The Register](https://www.theregister.com/2017/07/26/marketo_forgot_to_renew_domain/)、[ThousandEyes](https://www.thousandeyes.com/blog/what-happened-when-marketos-domain-name-expired)、[CMSWire](https://www.cmswire.com/marketing-automation/marketo-outage-caused-by-failure-to-renew-its-domain/) |
| 微軟 1999-12-24 未繳 $35 致 passport.com 過期、Hotmail 認證中斷；Michael Chaney 於聖誕節自費繳清；2003 年 hotmail.co.uk 再犯 | [Slashdot](https://slashdot.org/story/99/12/25/114201/microsoft-hotmailpassport-service-interruptedupdated)、[Techdirt](https://www.techdirt.com/2003/11/06/microsoft-forgets-to-renew-domain-again/) |
| 網域到期時間軸：1–30 天原價續約；31–60 天贖回期需贖回費；61–65 天 pending delete；65 天後公開釋出。**贖回期內註冊局必須停止 DNS 解析** | [ICANN RGP](https://www.icann.org/resources/pages/grace-2013-05-03-en)、[ICANN ERRP](https://www.icann.org/resources/pages/errp-2013-02-28-en) |

---

## 實作硬約束（違反即重做）

1. **全頁不得出現暗示支援 `.tw` / `.com.tw` 的字樣或範例**（含 placeholder、案例網域、截圖）。原因：`.tw` 網域到期查詢目前系統性失敗（TWNIC 一律 426），暗示支援等於賣做不到的功能。FAQ 已刪除「支援哪些網域」一題。
2. **不得使用捲動觸發淡入**（`IntersectionObserver` + `.reveal`）。改預設可見。
3. **不得出現假客戶、假 logo 牆、假統計數字**。Jasper 版面裡的這些槽位一律留白不做。
4. **價格與後端不一致是已知待辦**：頁面 99/499，後端 `aws/shared/ecpay_common.py` 唯一 `amount` 預設 300、無年繳邏輯，綠界仍 stage 測試店。**實作時要在價格區加 code 註解標明**，避免日後有人只改頁面就轉正式商店。
5. **`index.html` 靜態 `<title>`/`<meta>` 與 `useDocumentMeta()` 是兩個來源**，改標語時兩處都要改（09-02 轉型時漏改過一次，`f679364` 才補）。
6. **git**：正常 commit + push 可以；**禁止 force-push / rebase / amend 已推送的 commit**（`AGENTS.md` 明載，repo 連著 Lovable）。

## 本次附帶完成（非版面）

- **Vercel Web Analytics 已接上程式端**：`npm i @vercel/analytics`、`src/App.tsx` 加 `<Analytics />`，`tsc` 通過。
  **未完成**：Vercel 後台的 Enable 開關（MCP 無對應 API）。**部署後必須實測** `count_pageviews` 是否仍回 `web_analytics_not_enabled`；若是，需使用者到 Vercel 專案（`flight-price-notifier`，`prj_TEbexLk4oAIMS7kXiBPvDknYF2Nj`）Analytics 分頁點一次 Enable，再複測。

## 執行最佳建議

| 項目 | 建議 |
|---|---|
| **Model** | **Opus**。雖然文案與 anchor 已定案（表面符合「施工階段用 sonnet」），但本階段產出本身是視覺品質——間距節奏、字級對比、非對稱平衡、hairline 疏密屬判斷非執行，且本案起點就是「缺乏設計感」，降級有做出「規格都對但依然呆板」的實際風險。 |
| **Effort** | **Medium**。非錯一步全錯的連動步驟，改壞可 `git checkout` 還原。 |
| **是否開新 session** | 不建議中途開新。接下來是「寫版面 → 截圖 → 調整」的連續回圈，斷掉重建成本高。 |
| **繼續關鍵字**（若真的需要開新 session） | 在 `d:/OneDrive/Claude/projects/fare-finder-pro` 下（PC 為 `D:/Users/OneDrive/...`），讀 `SHOP-COPY-FINAL-2026-09-22.md` 全文與 `SHOP-REDESIGN-DECISION-2026-09-22.md`，依 Swiss anchor／dial 7-2-4 改寫 `src/pages/LandingPage.tsx` 十一個區塊，遵守「實作硬約束」六條，完成後跑 `npx tsc --noEmit` + `npm run build`，`npm run preview` 以 ui-verify 截桌機＋手機，再問使用者是否 commit + push。建議 Model：Opus｜Effort：Medium。 |
