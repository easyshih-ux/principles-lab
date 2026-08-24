# Phase 6B：Experiment Definition Architecture

第三關以 `experiment-definitions.js` 的十項 definition 為單一資料入口。每項 definition 包含學生任務、核心概念、有限工具、初始狀態契約、可選成功路徑、Validator spec、三階提示及成功／發現回饋；工程門檻不放在學生文案。

後續 Phase 6C～6F 的接入順序：

1. 取得 definition，建立 `experiment-session.js` 的隔離題目 state。
2. 以 Phase 6A constrained tools／canvas 編輯 `workingElements`。
3. 呼叫 `experiment-adapter.js` 的 `validateExperiment(definition, state)`。
4. 以 `primaryDiagnosticCode`、attemptCount 交給 `experiment-hints.js`，選擇 observe／think／action。
5. 成功時依 detectedMethods 讀取 `successFeedback.byMethod`，再顯示可選的 discoveryFeedback。

本階段不含學生 UI、正式 fixtures、隨機化或 Validator 演算法修改。
