# 形式原理視覺實驗室｜Claude Gate 4 開發交接

## 1. Git 與安全基準

- 專案：`C:\Easy's AI 製作資料夾\美的形式原理`
- Branch：`main`
- HEAD：`b232640b4555c149e9ff5c59b6a84468afc6d4dc`
- 本機相對既有追蹤分支 `origin/main`：Ahead 0／Behind 0（本次未 fetch，僅比較現有 tracking ref）。
- 工作目錄包含 Gate 2～3 尚未 commit 的成果，禁止 reset、clean、checkout、restore、stash 或覆寫。
- 未經教師明確指示，不得 commit、push、deploy、修改 Firebase／Firestore Rules 或正式學生資料。

## 2. 已完成：Gate 0～3

### Gate 0～1

- 完成 Git／遠端基準安全盤點、第三關既有架構與十項 validator 調查。
- 完成 V2 規格、對稱三模式、對比／統一防取巧、重疊 audit、完成狀態與測試矩陣設計。

### Gate 2A／2B／2B.1／2C

- 十項第三關 validator 已升級，正式學生介面工具同步調整。
- 新增第三關專用 composition audit：完全相同且高可信度重疊只計一個有效元素；保留部分重疊、可辨識同心構圖、旋轉三角形、半圓與線條交叉。
- 修補圓形與正方形等旋轉對稱造形以不同 rotation 灌水；不改實際 rotation 或 renderer。
- 均衡、律動、比例、單純保留既有核心算法；單純六個核心 ID 仍受保護。
- 重要檔案：
  - `phase6c-definitions.js`：十題正式定義、題目與工具。
  - `phase6c-validators.js`：十項正式驗證入口。
  - `phase6c-fixtures.js`：PASS／FAIL 測試資料。
  - `composition-audit.js`：有效元素與重疊診斷純函式（目前未追蹤）。
  - `geometry/`：畫布、engine、控制器；不要為 Gate 4 大幅改寫。

### Gate 3

- 已分離「歷史曾完成」與「目前畫布當次驗證有效」：
  - `completed`：歷史完成紀錄。
  - `currentValidationPassed`、`validatedFingerprint`、`validatedExperimentOption`、`validationStale`：當次畫布驗證。
- 作品新增、移動、刪除、複製、大小、色彩、明度、方向、比例變更後，成功狀態立即失效；下一題隱藏，提示重新檢查。
- 單純選取／取消選取、重繪及相同內容更新原則上不失效。
- 對稱模式切換立即失效；切回原模式仍須重新檢查。
- 歷史題目完成與整個第三關 checkpoint 不被改寫成 false；沒有 `level3Complete: false`。
- 重要檔案：
  - `experiment-session.js`：每題歷史與當次驗證狀態。
  - `phase6c-course-state.js`：fingerprint、失效、submit、advance、reset。
  - `experiment-course.js`：正式 UI 接線、失效提示、下一題顯示。
  - `app.js`、`index.html`：Gate 3 module cache marker。

### 已驗收結果

- 完整自動化基準：`node --test` = **567 tests／567 pass／0 fail／0 skip**。
- 第三關與 Geometry 直接回歸：211／211 PASS。
- Gate 4A 已在正式學生介面逐題完成十題；三種對稱模式均可操作通過。
- 1366×768、1920×1080、1024×768 無水平溢出，畫布與關鍵按鈕可見。
- `Made by WenYi` 仍顯示。
- Gate 4A 發現但尚未修補：單純初始裝飾方形位於 `(285,430)`，單擊選取會被 grid snap 成 `(280,440)`，因此被視為實際作品變更並取消成功狀態。相關位置在 `simplicity-initial-state.js`，提交移動在 `geometry/canvas.js::finishDrag()`。網格上的元素單純選取不會失效。

## 3. 尚未 commit 的修改

### 修改檔案

- `app.js`
- `experiment-course.js`
- `experiment-definitions.js`
- `experiment-session.js`
- `index.html`
- `phase6c-course-state.js`
- `phase6c-definitions.js`
- `phase6c-fixtures.js`
- `phase6c-validators.js`
- `tests/final-phase-flow.test.mjs`
- `tests/final-tool-spec.test.mjs`
- `tests/phase6b-tool-presets.test.mjs`
- `tests/phase6c-entry.test.mjs`
- `tests/phase6c-experiments.test.mjs`
- `tests/phase6c-student-flow.test.mjs`
- `tests/phase6d-experiments.test.mjs`
- `tests/phase6d-tablet-layout.test.mjs`
- `tests/phase6e-experiments.test.mjs`
- `tests/post-final-a.test.mjs`
- `tests/teacher-progress-dashboard.test.mjs`

### 未追蹤檔案

- `composition-audit.js`
- `tests/phase6-v2-composition-audit.test.mjs`

以上皆屬 Gate 2～3 工作成果或其 cache／回歸測試，不可只保留部分檔案。

## 4. 已實作的十項現行驗證條件

1. **反覆**：至少 7 個相同元素；或 4 組完整 AB；允許不等距排列，以有效元素計數。
2. **漸層**：至少 5 個；大小、明度、色相、間距等既有通道中形成可辨識的有序逐步變化。
3. **對稱**：左右／上下至少 4 組一對一鏡像；十字至少 2 組完整四向群組；排除自配對及軸上湊數，保留造形、大小、方向鏡射判定。
4. **均衡**：維持既有非對稱視覺重量規則，不新增最低數量。
5. **對比**：至少 6 個有效元素；大小與色彩對比同時成立，兩個主要群組須有足夠覆蓋率，不能只用兩個極端元素加雜訊；造形對比只能加強，不能取代必要條件。
6. **律動**：至少 5 個，維持既有路徑／方向／節奏判定。
7. **比例**：至少 6 個，須使用 1×、2×、3× 三種比例級。
8. **統一**：至少 7 個；具客觀共同特徵並有可見變化，不能七個完全相同只靠位置不同過關。
9. **調和**：至少 6 個；保留同色深淺、相近色／短色相弧關係。
10. **單純**：保留十元素花朵整理題；六個核心不可刪；可用減少、整理、減少變化等方法，但不能只留下核心或大量完全堆疊。

所有數量規則應使用 composition audit 的有效元素；不要以原始陣列長度取代。

## 5. 尚未實作：Gate 4 新規格

以下為新需求，**目前程式仍是上一節的現行規格，尚未修改**：

1. **反覆**：必須由兩種視覺元素組成 AB，完整反覆至少 5 次，可自由排列。
2. **漸層**：至少 7 階，且同時呈現兩種有順序的漸層變化。
3. **對稱**：保留左右／上下／十字鏡像門檻，作品同時至少包含 4 種造形或色彩搭配。
4. **對比**：維持至少 6 個、大小與色彩雙重對比，兩組須清楚可辨。
5. **均衡、律動、比例、統一、調和、單純**：維持目前已實作規格。

Gate 4 不得新增第二張創作、第二階段、第四關或其他強制流程。

## 6. Gate 4 題目與提示要求

每題正式學生文案必須同時具備：

- 創作任務：學生要做什麼作品。
- 明確過關條件：數量、組合或關係，用七年級能理解的語言表達。
- 創作提示：提供可嘗試方向，但不洩漏唯一配置或要求 pixel-perfect。
- 失敗改善提示：依診斷告訴學生下一步如何修正；不得顯示 failure code、threshold、比例、座標、元素 ID 或工程術語。

題目與 validator 必須一致；不要只改文字，也不要只改測試期待值。

## 7. 接手時必須保護的邊界

- 登入與權限：學生匿名身分、教師 Google Auth、active teacher／admin 規則、Teacher Teaching Mode 必須保持隔離。
- Firebase／Firestore：禁止用正式學生資料測試；不得修改 Rules 或把 checkpoint 寫成 false。
- 歷史進度：不得清除其他題、其他關卡、學年、班級、學生紀錄或 historical cache marker。
- 第三關 checkpoint：只有完成正式第三關流程才寫 `level3Complete: true`；重新開題、fingerprint 缺失或作品失效不得寫 false。
- Gate 3：作品變更後的當次通過失效、重新檢查、對稱模式失效與下一題控制不可退步。
- 自由複習：不計分、不寫 unlock／正式 completion；不要修改正式 validator 來配合自由複習。
- 教師功能：Classroom Control、Dashboard、學年／班級設定、申請與審核不可受影響。
- 既有 Geometry／Canvas、legacy／dev routes、平板操作、成功動畫與 `Made by WenYi` 必須保留。
- composition audit 必須保留合法部分重疊、同心構圖、集中式構圖及留白。

## 8. 建議 Claude 下一步

1. 先讀取本文件、專案 `AGENTS.md`、`git status --short` 與完整 diff；不要 fetch／pull 或清理工作目錄。
2. 先把 Gate 4 四項新規格轉成失敗測試，確認舊行為確實不符合，再做最小修改。
3. 調查反覆目前 single／AB 分流，確認新規格是否完全移除單元素通過路徑；AB 的不同 ID、effective elements 與不等距配對不可被重疊灌水。
4. 調查漸層 validator 的 channel 結果結構，定義「兩種有順序變化」是兩個獨立通道同時成立，並避免同一欄位重複計算。
5. 定義對稱「至少 4 種造形或色彩搭配」的客觀計數單位，確認鏡像 pair／orbit 內外如何計算，避免要求每個元素都不同。
6. 對比先確認現行條件已符合新文字；若已符合，只更新題目／提示與測試，不增加位置或鋪滿畫布限制。
7. 先處理或至少建立測試記錄 Gate 4A 的單純未對齊網格單擊吸附問題；不要讓真正拖曳失效機制退步。
8. 直接相關測試通過後，再跑第三關完整相關測試、`node --check`、`git diff --check`；只有教師要求交接／發布前才跑完整 `node --test`。
9. 完成後先回報，不得自行 commit、push、deploy 或進入下一 Gate。
