# TODO

## 待辦

- [ ] **測試把 `node_modules` 移出 OneDrive**（2026-10-05 建立）
  - **背景**：fare-finder-pro 的檔案數約 26,000 個，其中 `node_modules` 約 25,451 個。OneDrive 個人版不遵守 GPO 排除名單（2026-10-05 實測），目前只能靠移出 OneDrive 解決。
  - **目標**：刪除 `node_modules`，改在 `C:\dev-env\fare-finder-pro\` 重建依賴，並讓 Node 找得到它。
  - **步驟**：
    1. 在複本上測試（不動原專案）：`npm install` 到 `C:\dev-env` 的方式，以及用 junction 指向該目錄的方式，二擇一。
    2. 驗證：`npm run build`、本機啟動、`aws` 建置與部署腳本都能正常運作。
    3. 通過後才套用到原專案，刪除 `node_modules` 並重建，再確認 OneDrive 不再同步它。
  - **注意**：junction 放在 OneDrive 內時，OneDrive 處理方式不穩定，可能又把真正檔案同步上去，需要實測確認。
  - **狀態**：❌ 2026-10-25 實測 junction 不可行——OneDrive 會跟著捷徑把目標內容上傳，且 CPU 飆高（見 memory `feedback_onedrive_junction_uploads_target`）。node_modules 維持原位；要根治只能把整個專案搬出 OneDrive、改靠 GitHub 同步（另案評估）。
