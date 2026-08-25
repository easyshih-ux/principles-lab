# 形式原理視覺實驗室

供七年級視覺藝術課使用的視覺與互動實驗室。正式學生流程以「看得出來 → 找得到問題 → 自己做得出來」逐步理解十項形式原理，最後進入整套課程完成頁。

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
- `geometry/`：Phase 1B 共用元素模型、座標、格點、邊界、操作引擎、Canvas 與 Playground。
- `tests/geometry-engine.test.mjs`：Geometry Engine 純資料操作與權限測試。
- `geometry/control-panel.js`：依 `allowedTools` 顯示的共用固定尺標與操作面板。
- `geometry/palette.js`：Size logical mapping 與六色系 × 五階深淺 palette。
- `geometry/controls.js`：控制器合法值、`allowedValues`、`lockedValues` 與預設值規則。
- `tests/phase2-controls.test.mjs`：固定級距、權限、限制值、Undo 與 palette 測試。
- `experiment-validators.js`：十項形式原理的規格驅動實驗條件判定器與 registry 相容層。
- `validator-fixtures.js`：每項原理的明確通過／失敗開發案例。
- `validator-lab.js`：Phase 3 Validator Lab 開發驗收介面。
- `tests/phase3-validators.test.mjs`：十項判定器的通過、失敗與邊界測試。
- `recognize-questions.js`：Phase 4 第一關八題正式題庫與靜態幾何構圖資料。
- `recognize-course-state.js`：第一關選答、嘗試、完成與解鎖狀態。
- `recognize-course.js`：第一關開始頁、題目頁、回饋與完成頁 renderer。
- `tests/phase4-recognize.test.mjs`：題序、資料、答題狀態、路由與構圖 metrics 測試。
- `discover-questions.js`：Phase 5 第二關十六題正式題庫與 logical geometry fixtures。
- `discover-generators.js`：十六種題型的動態實例生成、選項洗牌與畫布／重疊安全檢查。
- `discover-randomizer.js`：可 seeded、可測試的受限制題序產生器。
- `discover-course-state.js`：第二關 session 題序、選取、嘗試與完成狀態。
- `discover-validators.js`：第二關選取、複選與配對判定器。
- `discover-course.js`：第二關五種通用互動、開始／完成與 dev renderer。
- `tests/phase5-discover.test.mjs`：第二關資料、題序、fixtures、validators 與 state 測試。
- `screenshots/`：三種尺寸的驗收截圖。

## 正式形式原理名稱

本專案統一使用以下十項名稱：反覆、漸層、對稱、均衡、對比、律動、比例、統一、調和、單純。

樣本牆保留既有單一原理漸層原型作為相容入口；正式三關皆由 `#principles` 直接進入，不鎖定關卡。

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

## Geometry Playground（開發驗收）

啟動網站後開啟 `#dev/geometry`。此頁只用於驗收六種形狀、選取、Pointer 拖曳、格點吸附、邊界、複製、刪除、Undo 與鍵盤操作，不屬於學生正式關卡。

Geometry Engine 使用 `1000 × 600` 邏輯畫布與集中管理的 `20` 單位隱形格點。Canvas 只回傳乾淨 element state，不包含任何形式原理判定。

Phase 2 的 Geometry Element 使用教學級距，而不是 CSS 數值：`size` 與 `lightness` 為 `1～5`，`hue` 為六種固定色系 ID，`rotation` 為八個固定角度，`proportion` 為 `1／2／3`。Control Panel 只顯示 `allowedTools` 開放的控制器，Engine 仍會在底層拒絕未授權工具與未開放數值。

## Validator Lab（開發驗收）

開啟 `#dev/validators`，可切換十項形式原理以及明確通過／失敗案例。所有實驗型 Validator 接受 element state 與題目 `spec`，並統一回傳 `passed`、`fulfilledConditions`、`missingConditions`、`feedback`、`metrics`；`isValid` 與 `code` 保留供既有 renderer 相容使用。Metrics 是開發／教師資料，不是藝術美感評分。

## 第一關｜你看得出來嗎？

正式入口為 `#level/recognize/start`，也可由形式原理選擇頁進入。固定八題順序為：反覆、漸層、對稱、均衡、律動、對比、調和、統一。每題沿用 `selected-option-equals`；答錯可重新選擇且不公布答案，答對後才顯示下一題。比例與單純刻意不在本關獨立出題。

## 第二關｜哪裡不對勁？

正式入口為 `#level/discover/start`。每次完整進行十六題，題序遵守同原理不相鄰、調和／統一先於收束題、單純位於後半與容易題起步等限制。支援元素、gap、單選比較、複選、配對與 Before／After。

每次重新開始第二關時，系統依 `question template → random parameters → generated question → safety validation → correctAnswer` 產生十六個新題目實例。題目圖形、色彩、尺寸、方向、位置、間距、錯誤元素位置及 A／B／C 排列會依題型安全範圍變化；不符合唯一答案、畫布邊界或不重疊規則的結果會重新生成。同一輪生成結果會保存在 course state，提示、答錯與畫面重繪不會改變當次答案。開發驗收入口為 `#dev/phase5`。

## 正式學生流程

`#home` → `#principles` → 第一關辨識 `#level/recognize/start` → 第二關診斷 `#level/discover/start` → 第三關有限工具製作 `#level/experiment/start` → `#level/experiment/complete` 整套完成頁。

第三關依序包含反覆、漸層、均衡、律動、對稱、對比、比例、統一、調和、單純。三關入口均可直接進入，方便教師示範或重複練習；連續流程則由各關完成頁的明確按鈕串接，不自動跳頁。

開發驗收 routes 保留 `#dev/geometry`、`#dev/validators`、`#dev/phase5`、`#dev/experiments`，不出現在學生正式導航。舊漸層 routes 仍保留底層相容。專案未加入登入、教師後台、排行榜、資料庫、學習紀錄或複雜計分。

## 最小測試

使用 Node.js 執行：

`node --test tests/*.test.mjs`
