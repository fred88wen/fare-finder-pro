# 產品轉型規劃書：網站健康監控（Uptime + 網域到期通知）

## 執行結果（2026-09-02）

| # | 任務 | 狀態 | 執行內容 |
|---|------|------|---------|
| 1 | LandingPage 文案改版 | ✅ 完成 | `src/pages/LandingPage.tsx`：品牌名/features/hero/meta 全換成 Site Watch 定位（commit `0fcde73`）|
| 2 | save_subscription 欄位改 target/check_type/threshold | ✅ 完成 | 移除 PLANS/target_price；DynamoDB sort key 屬性沿用 `route`，值改存 target 字串，讓 ECPay callback Lambda 不用動（commit `6896653`）|
| 3 | parser 新增 uptime/domain_expiry 分支 | ✅ 完成 | 取代 `fetch_cheapest()`；uptime 走 HTTP 檢查＋SSRF 防護（擋 loopback/private/link-local host），domain_expiry 走 RDAP；RDAP 查詢失敗時整輪跳過不誤報（commit `191a9c2`）|
| 補件 | parser_wrapper 改用 DynamoDB distinct target fan-out | ✅ 完成 | 原本讀 S3 `flight-routes.json` 固定清單已與新 schema 不符（會靜默 0 派工），改成掃 `subscriptions` 表算 distinct (target, check_type)，套用 `gate()` 付費閘門後才派工；`build_zips.py` 補 `subscription_gate.py` 依賴（commit `d995e1e`）|
| 4 | fare_notification 兩套新信件文案 | ✅ 完成 | 舊 price-drop dedup（`should_send`）改成扁平 floor-based dedup（`should_send_floor`），兩套模板 subject/render_text/render_html（commit `e8556cc`）|
| 5 | aws/tests/ 補 parser 分支測試 | ✅ 完成 | 新增 `aws/tests/test_parser_checks.py`（24 項全綠）；順手把 `parser/index.py` 的 `import boto3` 改延遲載入，比照 `ecpay_common.py` 既有慣例，讓純邏輯測試不需要本機裝 boto3（commit `8665f91`）|
| 6 | 本機假資料測 uptime/domain_expiry | ✅ 完成 | 詳見下方「.tw RDAP 已知限制」——過程中發現並修復一個真 bug（DNS 查詢失敗被誤標成 SSRF 封鎖，commit `3cf1817`），並確認 `.tw` 網域到期查詢系統性失敗 |
| 7 | 部署 + cache-bust 驗證 | ✅ 完成 | 4支 Lambda（`flight-save-subscription`/`flight-parser`/`flight-parser-wrapper`/`flight-fare-notification`）`update-function-code` 上線；前端 `git push`（commit `96d176b`→`f679364`）觸發 Vercel 自動部署。Read-back：①實測 invoke `flight-parser-wrapper` 對真實 DynamoDB 資料——掃到 2 筆舊版機票測試列，正確判斷無 `check_type` 而跳過，fanned out 0（不會誤觸發）②cache-bust curl `fly.goboss.tw` 確認 `<title>`/og:title/meta description 全部是新版文案。過程中發現 `index.html` 靜態 `<title>`/`<meta>` 沒跟著步驟1一起改（ECPay審核與社群分享爬蟲看的是這份，不是 JS 動態注入的），已補上並重新部署驗證（commit `f679364`）|

**新發現、本次規劃書未列的斷點（已詢問使用者，決定先不動）**：`src/pages/DashboardPage.tsx`（登入後訂閱管理頁）仍是機票版表單（`plan_name` tokyo/seoul、`target_price`），與後端新的 `target`/`check_type`/`threshold` 契約不一致，會導致既有訂閱者的 Dashboard 提交失敗。範圍比步驟1的 LandingPage 大（新表單欄位＋訂閱列表渲染邏輯都要重寫），使用者選擇留到下次 session 再處理，不併入本次。

**⚠️ 已知限制：`.tw` 網域到期查詢系統性失敗（2026-09-02 實測確認，先接受上線）**

`check_domain_expiry()` 程式邏輯本身正確（`google.com` 實測：正確算出到期天數與日期；不存在網域正確回 404 訊息）。但 `.tw` 網域（IANA bootstrap 唯一登記的 RDAP 伺服器 `ccrdap.twnic.tw`）對任何標準 HTTP/1.1 或自動協商 HTTP/2 的 client 一律回 `HTTP 426`，`rdap.org` 的 bootstrap 代理則是逾時。已排除的假設：UA/Header 偽裝（換完整瀏覽器 header 組合無效）、HTTP/2 協商問題（Node.js `fetch` 自動走 h2 仍 426）、地區/來源 IP 問題（用 WebFetch 從 Anthropic 網路測是 socket 斷線、**部署到真實 AWS us-east-1 Lambda 直接測試仍是 426/timeout，兩種網路結果一致**——已排除「換到 production 網路就會通」的可能）。IANA 官方 bootstrap 沒有列出 `.tw` 的備援 RDAP 伺服器。傳統 WHOIS（port 43）本機被拒但未在 Lambda 測（可作為下次調查方向）。

**影響範圍**：訂閱 `.tw` 網域做 domain_expiry 監控的使用者，目前實質上不會收到到期提醒（系統不會誤報，只是靜默收不到）；.com/.net 等 Verisign 系 gTLD 已驗證正常運作。**決策（2026-09-02）**：先接受此限制上線，待實際觀察訂閱者的網域分佈後再決定是否要修（選項包括：改探付費 WHOIS API 專收失敗的 TLD、或嘗試 Lambda 內測 port 43 WHOIS）。

---

**日期**：2026-09-01
**狀態**：規劃階段，尚未執行
**背景文件**：`aws/M1-驗收報告.md`、`aws/M2-驗收報告.md`、`.claude/skills/ecpay-go-live/SKILL.md`

---

## 一、為什麼要轉型

現有產品「Flight Price Notifier（機票降價通知）」有兩個問題，是這次要申請綠界正式金流商店時發現的：

1. **商業面**：Google Flights 本身就有免費的價格追蹤功能，使用者很難為一個免費就有的東西每月付 NT$300。
2. **審核面**：綠界不受理行業清單裡有「仲介公司」「海外度假村」，「機票」這個關鍵字容易讓審核人員多問一輪、拖慢 3-5 工作天的審核（雖然本服務不代訂機票，性質上不構成仲介，但措辭上容易被誤讀）。

**這份規劃書涵蓋什麼、不涵蓋什麼**：涵蓋「網站正常運行監控＋網域到期提醒」這個新產品定義、後端資料結構異動、前端文案改版、綠界申請文案建議；**不涵蓋** SEO 排名監控（列為未來加購方案，本次不做）、ECPay 正式上線流程本身（那是 `ecpay-go-live` skill 的範圍，本規劃書只處理「賣的東西換了」這件事）。

## 二、新產品定義

**產品名稱（暫定）**：Site Watch / 網站健康監控
**核心價值**：網站掛了、SSL 過期、網域忘記續約——三件最容易讓小型網站主措手不及的事，用一個 email 通知搞定。
**基礎方案（NT$300/月，沿用現有定價）包含**：
- 網站正常運行監控（HTTP 狀態碼檢查，異常時通知）
- 網域到期提醒（WHOIS/RDAP 查詢，到期前 30/14/7/1 天通知）

**明確排除**：SEO 關鍵字排名監控——留給未來的加購/進階方案，理由見對話討論（成本結構不同：DataForSEO 是計次付費 API，WHOIS/HTTP 檢查幾乎零成本；受眾也不同，工程師關心的是「網站是否正常」，行銷/老闆才關心排名，硬塞進同一個基礎方案會讓賣點模糊，對綠界審核文案的「一句話講清楚」也不利）。

## 三、架構異動範圍（哪些不用動、哪些要動）

**完全不用動**（沿用現有 AWS 資源，物理名稱不重新命名，避免不必要的重新佈建）：
- SQS `flight-fare-queue`、`flight-status-queue`
- EventBridge `flight-price-check`（30 分鐘排程規則不變）
- DynamoDB 表結構（`subscriptions`、`notification_history`）本身，只加欄位不砍欄位
- 5 支 ECPay 相關 Lambda（`flight-ecpay-return`/`-period`/`-result`/`-cancel-subscription`、`flight-status-notification`）——付費閘門邏輯完全不用改
- API Gateway 路由、Secrets Manager（`flight/ecpay`）

**要動的地方**：

| 檔案 | 現況 | 異動內容 |
|---|---|---|
| `aws/parser/index.py` | `fetch_cheapest()` 呼叫 travelpayouts API，比對 `target_price` | 新增 `check_type` 分支：`uptime` 呼叫 HTTP HEAD/GET 取狀態碼；`domain_expiry` 呼叫 WHOIS/RDAP 取到期日，比對「距今剩幾天」而非價格 |
| `aws/save_subscription/index.py` | 表單寫入 `route`（如 `TPE-TYO`）、`target_price` | 欄位改寫入 `target`（網址或網域字串）、`check_type`（`uptime`/`domain_expiry`）、`threshold`（uptime 免填，domain_expiry 填提醒天數）|
| `aws/fare_notification/index.py` | 信件文案「機票降價到 X 元」 | 改寫兩套文案模板：「你的網站 X 目前無法連線」、「你的網域 X 將於 N 天後到期」 |
| `src/pages/LandingPage.tsx` / `DashboardPage.tsx` | 機票/航線相關文案與表單欄位（出發地/目的地/目標價）| 改成「監控目標網址」「提醒方式」等欄位；features 區塊三張卡片文案全換 |
| WHOIS 查詢方式 | 無 | 需新增：Python 環境沒有內建 WHOIS，建議用 RDAP（`https://rdap.org/domain/{domain}`，公開、免金鑰、比傳統 WHOIS 協議穩定）取代，Lambda 內用 `urllib` 直接打 HTTP，不需要額外套件 |

**新增的唯一外部依賴**：RDAP 查詢（免費、公開、無需申請帳號，比 M1 的 travelpayouts 還單純）。網站 uptime 檢查是 Lambda 自己打 `requests`/`urllib` 對目標 URL 做 HTTP 請求，同樣不需要新帳號。

## 四、綠界申請文案建議

- 主要販售商品名稱：「網站監控與網域到期提醒訂閱服務」
- 服務說明避免出現「仲介」「代訂」「度假」等關鍵字（雖然新產品本來就不會用到這些字）
- `shop.goboss.tw` 首頁文案需在提送綠界申請**前**完成改版（Landing Page 是綠界審核時會實際打開看的頁面，內容必須跟申請表單填的服務說明一致，否則會被要求補件）

## 五、執行步驟（本次規劃書涵蓋到這裡，實際動工待你確認後另開任務）

1. `src/pages/LandingPage.tsx` 文案改版（hero、features、footer 服務說明維持聯絡資訊不變）
2. `aws/save_subscription/index.py`：表單欄位與寫入邏輯改成 `target`/`check_type`/`threshold`
3. `aws/parser/index.py`：新增 uptime 與 domain_expiry 兩種檢查分支，取代 `fetch_cheapest()`
4. `aws/fare_notification/index.py`：兩套新信件文案模板
5. `aws/tests/`：比照現有 `test_ecpay_logic.py` 的模式，為新的 parser 分支寫測試
6. 本機用 `synthetic_callback.py` 的思路，先用假資料測過 uptime/domain_expiry 兩條路徑，再上線
7. 部署 + cache-bust 驗證 `shop.goboss.tw` 文案已更新，才送綠界申請

## 六、建議 Model / Effort

- **步驟 1-4（改文案 + 改 Lambda 邏輯）**：Sonnet／Medium——都是照抄既有模式改欄位名稱和文案，沒有新架構決策
- **步驟 3 的 uptime/domain_expiry 檢查邏輯**：建議切一次 **High**，因為這段要處理「網域從沒查過/查詢失敗/RDAP 回傳格式不一致」這些邊界情況，錯了會變成誤報或漏報，跟 M2 當初 ECPay callback 的「錯一步全錯」性質類似
- **步驟 6-7 部署驗證**：Low
- **是否開新 session**：**建議開**。目前這個 session 已經橫跨了 DNS/Vercel 網域設定、整站改配色、線上驗證、加上這次的產品轉型研究與規劃書，context 已經累積不少；實際動手改 Lambda 程式碼是全新的一段工作，開新 session 可以省用量、也讓下一階段有乾淨的起點。
- **繼續指令建議**：
  ```
  讀 fare-finder-pro/PRODUCT-PIVOT-PLAN-2026-09-01.md 確認產品轉型規劃，
  讀 aws/parser/index.py 與 aws/save_subscription/index.py 現況，
  執行步驟 1（LandingPage 文案改版）
  ```
  建議 Model：Sonnet｜Effort：Medium（步驟 3 進行到 uptime/domain_expiry 檢查邏輯時再切 High）
