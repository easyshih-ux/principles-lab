# Phase 6C：第一組形式原理實驗

正式學生流程：`#level/experiment/start` → 反覆 → 漸層 → 均衡 → 律動 → `#level/experiment/complete`。四題共用 `experiment-course.js` renderer、Phase 6A Geometry Engine／Control Panel，以及隔離的 `phase6c-course-state.js`；成功後不自動換題。

- `phase6c-definitions.js`：四題正式文案、穩定初始元素、工具、診斷提示與回饋。
- `phase6c-validators.js`：正式題目的最小判定擴充；不取代 Phase 3 Lab validators。
- `phase6c-fixtures.js`：穩定 PASS／FAIL 開發案例，不做正式隨機化。
- `experiment-course.js`：學生共用 renderer 與 `#dev/experiments` 開發驗收模式。
- `phase6c.css`：沿用全站設計變數的第三關版面。

Dev Lab 可切換四題、載入 PASS／FAIL、Reset、查看 diagnostic code、detectedMethods、metrics，並模擬三階提示。這些資訊不會出現在學生頁。

Phase 6C 不開放對稱、對比、比例、統一、調和或單純，也不建立第三關隨機化。
