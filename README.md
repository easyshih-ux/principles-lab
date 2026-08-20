# 形式原理視覺實驗室

供七年級視覺藝術課使用的視覺與互動實驗室。學生透過「觀察 → 辨認 → 發現變化 → 實際操作 → 驗證」理解形式原理；目前只有「漸層」保留第一版互動內容，其他形式原理只提供 metadata、樣本縮圖與「即將開放」。

## 啟動方式

本專案是無後端、無資料庫、無外部 API 的靜態前端網站，可直接部署至 GitHub Pages。

1. 在專案根目錄啟動任一靜態檔案伺服器，例如 `python -m http.server 8765`。
2. 在瀏覽器開啟 `http://localhost:8765/`。

核心功能不依賴網路。若直接雙擊 `index.html`，部分瀏覽器會因 ES module 安全限制阻擋資料載入，因此建議使用本機靜態伺服器。

## 檔案結構

- `index.html`：網站進入點與基本中繼資料。
- `styles.css`：全站設計變數、響應式版面、互動與減少動態效果設定。
- `data.js`：十項形式原理 metadata 與現有漸層 stage definitions。
- `app.js`：應用程式入口與路由協調。
- `router.js`：通用 Hash 路由解析、fallback 與下一步路由。
- `state.js`：navigation、各關卡暫存狀態與完成狀態。
- `validators.js`：validator registry 與現有漸層判定器。
- `renderers.js`：首頁、樣本牆、通用 task frame 與三種 stage renderer。
- `tests/phase1a.test.mjs`：路由、validator、state 與漸層資料流程的最小測試。
- `screenshots/`：三種尺寸的驗收截圖。

## 正式形式原理名稱

本專案統一使用以下十項名稱：反覆、漸層、對稱、均衡、對比、律動、比例、統一、調和、單純。

目前只有「漸層」的 `hasContent` 為 `true`；其餘原理尚未建立正式題目。

## 通用教學架構

資料結構依照以下關係組成：

`principle → stages → question data → validator → feedback`

現有三種 `stageType`：

1. `recognize`：第一關｜你看得出來嗎？——辨認。
2. `discover`：第二關｜是哪裡變了？——理解變化。
3. `experiment`：第三關｜換你做——有限操作與驗證。

通用關卡路由格式為：

`#stage/{stageType}/{stageId}`

例如：`#stage/recognize/gradation-observe`。無效路由會安全返回首頁；舊版三個漸層 Hash 仍保留相容轉址。

## 增加其他形式原理

1. 在 `data.js` 的 `principles` 陣列更新 `status` 與 `hasContent`。
2. 在 `stages` 增加符合通用資料模型的關卡資料。
3. 若使用現有 stage type，直接沿用對應 renderer，不需要新增路由分支。
4. 若需要新的判定條件，在 `validators.js` 註冊新的 validator。
5. 只有在新增全新的操作類型時，才需要在 `renderers.js` 增加 stage renderer。

目前資料、狀態、路由、判定與畫面已分離，新增原理時不需要重寫首頁、樣本牆或建立大量固定路由。

## 第一階段範圍

已完成首頁、形式原理選擇頁、漸層三任務、完成畫面及 Phase 1A 通用骨架。尚未製作其他形式原理的正式題目與 Geometry Engine，也未加入登入、教師後台、排行榜、資料庫、學習紀錄或複雜計分。

## 最小測試

使用 Node.js 執行：

`node --test tests/phase1a.test.mjs`
