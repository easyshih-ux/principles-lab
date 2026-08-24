# Phase 6A：有限操作工具系統

本階段只建立第三關共用規格，不新增正式題目或學生路由。

- `geometry/constrained-tools.js`：造形 metadata、五階大小、1:2:3 線性比例、12 色相 × 5 明度、四方向、格線、allowedTools 與 Validator payload adapter。
- `geometry/constrained-canvas.js`：沿用既有 Pointer／觸控／鍵盤 Canvas，增加可選淡色格線及垂直、水平、十字中軸。
- `tests/phase6a-constrained-tools.test.mjs`：資料與限制的最小測試。

正式題目應使用 `allowedTools` 只開放必要工具，並用 `createValidatorPayload()` 傳遞標準化 logical element state。Validator 不讀取 DOM、CSS class 或畫面 pixel。
