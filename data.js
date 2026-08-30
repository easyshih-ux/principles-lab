export const principles = [
  {
    id: 'repetition',
    name: '反覆',
    shortDescription: '相同元素依規律再次出現。',
    completionDescription: '相同的元素或組合再次出現，<br>就能形成反覆。',
    status: 'available',
    hasContent: true,
    previewSizes: [18, 18, 18, 18, 18, 18]
  },
  {
    id: 'gradation',
    name: '漸層',
    shortDescription: '元素依順序持續產生變化。',
    completionDescription: '漸層不是只有大小不同，<br>而是依照順序持續產生變化。',
    status: 'available',
    hasContent: true,
    previewSizes: [10, 14, 19, 25, 32, 40]
  },
  {
    id: 'symmetry',
    name: '對稱',
    shortDescription: '中線兩側形成相互呼應。',
    completionDescription: '以中線為基準，<br>兩側形成互相對應的關係。',
    status: 'available',
    hasContent: true,
    previewSizes: [14, 24, 34, 34, 24, 14]
  },
  {
    id: 'balance',
    name: '均衡',
    shortDescription: '不同視覺重量取得穩定。',
    completionDescription: '大小、數量和位置不同，<br>也能讓畫面取得穩定。',
    status: 'available',
    hasContent: true,
    previewSizes: [42, 12, 12, 12, 12, 12]
  },
  {
    id: 'contrast',
    name: '對比',
    shortDescription: '差異讓彼此更清楚醒目。',
    status: 'coming-soon',
    hasContent: false,
    previewSizes: [12, 38, 12, 38, 12, 38]
  },
  {
    id: 'rhythm',
    name: '律動',
    shortDescription: '反覆與方向形成視覺節奏。',
    completionDescription: '反覆加上有方向的變化，<br>讓畫面產生律動。',
    status: 'available',
    hasContent: true,
    previewSizes: [14, 22, 14, 22, 14, 22]
  },
  {
    id: 'proportion',
    name: '比例',
    shortDescription: '大小關係改變整體感受。',
    status: 'coming-soon',
    hasContent: false,
    previewSizes: [44, 16, 10, 26, 12, 18]
  },
  {
    id: 'unity',
    name: '統一',
    shortDescription: '共同特徵讓畫面成為整體。',
    completionDescription: '元素不必完全相同，<br>只要具有共同特徵，就能形成整體。',
    status: 'available',
    hasContent: true,
    previewSizes: [18, 20, 18, 20, 18, 20]
  },
  {
    id: 'harmony',
    name: '調和',
    shortDescription: '元素彼此協調並形成和諧關係。',
    completionDescription: '彼此接近、能互相呼應的色彩，<br>會讓畫面更加協調。',
    status: 'available',
    hasContent: true,
    previewSizes: [14, 18, 22, 26, 22, 18]
  },
  {
    id: 'simplicity',
    name: '單純',
    shortDescription: '以簡潔明確的元素表現重點。',
    status: 'coming-soon',
    hasContent: false,
    previewSizes: [28, 28, 28]
  }
];

export const stageTypes = Object.freeze({
  recognize: {
    id: 'recognize',
    label: '第一關｜你看得出來嗎？',
    learningGoal: '辨認'
  },
  discover: {
    id: 'discover',
    label: '第二關｜是哪裡變了？',
    learningGoal: '理解變化'
  },
  experiment: {
    id: 'experiment',
    label: '第三關｜換你做',
    learningGoal: '有限操作與驗證'
  }
});

export const stages = [
  {
    id: 'gradation-observe',
    stageType: 'recognize',
    principleId: 'gradation',
    title: '觀察辨識',
    prompt: '哪一張最明顯呈現「漸層」？',
    description: '',
    progress: { current: 1, total: 3 },
    elements: [],
    initialState: { selectedOptionId: null },
    options: [
      { id: 'a', sizes: [12, 18, 25, 33, 42] },
      { id: 'b', sizes: [30, 14, 40, 20, 34] },
      { id: 'c', sizes: [24, 24, 24, 24, 24] }
    ],
    hints: [
      '觀察圓點的大小是否按照順序持續改變。',
      '再比較一次每一顆圓點和下一顆的大小關係。'
    ],
    feedbackByCode: {
      incomplete: '請先選擇一張作品，再完成檢測。'
    },
    successFeedback: '圓點依照順序逐漸變大，形成清楚的漸層。',
    validatorId: 'selected-option-equals',
    validation: { correctOptionId: 'a' },
    allowedTools: ['select-option', 'hint', 'validate'],
    nextStep: { type: 'stage', stageId: 'gradation-discover' }
  },
  {
    id: 'gradation-discover',
    stageType: 'discover',
    principleId: 'gradation',
    title: '構圖診斷',
    prompt: '有一顆圓點打亂了漸層，請把它找出來。',
    description: '',
    progress: { current: 2, total: 3 },
    elements: [
      { id: 'dot-1', size: 18 },
      { id: 'dot-2', size: 28 },
      { id: 'dot-3', size: 39 },
      { id: 'dot-4', size: 26 },
      { id: 'dot-5', size: 61 },
      { id: 'dot-6', size: 74 }
    ],
    initialState: { selectedElementId: null },
    options: [],
    hints: [
      '比較這顆圓點和左右兩邊的大小關係。',
      '注意大小變化突然中斷的位置。'
    ],
    feedbackByCode: {
      incomplete: '請先選出打亂漸層的圓點。'
    },
    successFeedback: '找到了！這顆圓點讓大小變化突然中斷。',
    validatorId: 'selected-element-equals',
    validation: { correctElementId: 'dot-4', fixedSize: 50 },
    allowedTools: ['select-element', 'hint', 'validate'],
    nextStep: { type: 'stage', stageId: 'gradation-experiment' }
  },
  {
    id: 'gradation-experiment',
    stageType: 'experiment',
    principleId: 'gradation',
    title: '拖曳修復',
    prompt: '拖曳圓點，讓大小變化從左到右逐漸增加。',
    description: '',
    progress: { current: 3, total: 3 },
    elements: [
      { id: 'size-58', size: 58 },
      { id: 'size-28', size: 28 },
      { id: 'size-70', size: 70 },
      { id: 'size-18', size: 18 },
      { id: 'size-48', size: 48 },
      { id: 'size-38', size: 38 }
    ],
    initialState: { order: [58, 28, 70, 18, 48, 38] },
    options: [],
    hints: [
      '從最小的圓點開始排列看看。',
      '比較相鄰兩顆圓點的大小。'
    ],
    feedbackByCode: {
      'single-interruption': '有一處大小順序中斷了。',
      'smallest-not-first': '從最小的圓點開始排列看看。',
      'compare-neighbors': '比較相鄰兩顆圓點的大小。'
    },
    successFeedback: '修復完成！連續而有順序的變化，讓畫面形成漸層。',
    validatorId: 'strict-ascending',
    validation: { direction: 'ascending', uniqueValues: true },
    allowedTools: ['reorder', 'undo', 'hint', 'validate'],
    nextStep: { type: 'complete', principleId: 'gradation' }
  },
  {
    id: 'repetition-observe',
    stageType: 'recognize',
    principleId: 'repetition',
    interactionType: 'symbol-options',
    title: '觀察辨識',
    prompt: '哪一張可以找到清楚「再次出現」的規律？',
    description: '反覆可以是單一元素，也可以由兩個元素組成一個重複單位。',
    progress: { current: 1, total: 3 },
    elements: [],
    initialState: { selectedOptionId: null },
    options: [
      { id: 'a', symbols: ['●', '▲', '■', '●', '★'] },
      { id: 'b', symbols: ['●', '■', '●', '■', '●', '■'] },
      { id: 'c', symbols: ['●', '▲', '■', '★', '◆'] }
    ],
    hints: ['把相鄰的圖形看成小組，哪一個小組再次出現？', '找找「● ■」是否一次又一次出現。'],
    feedbackByCode: { incomplete: '請先選擇一張作品，再完成檢測。' },
    successFeedback: '找到了！兩個元素也可以組成一個重複單位。',
    validatorId: 'selected-option-equals',
    validation: { correctOptionId: 'b' },
    allowedTools: ['select-option', 'hint', 'validate'],
    nextStep: { type: 'stage', stageId: 'repetition-discover' }
  },
  {
    id: 'repetition-discover',
    stageType: 'discover',
    principleId: 'repetition',
    interactionType: 'symbol-diagnose',
    title: '構圖診斷',
    prompt: '哪一個元素破壞了原本穩定的反覆？',
    description: '',
    progress: { current: 2, total: 3 },
    elements: [
      { id: 'repeat-1', symbol: '●' }, { id: 'repeat-2', symbol: '■' },
      { id: 'repeat-3', symbol: '●' }, { id: 'repeat-4', symbol: '■' },
      { id: 'repeat-5', symbol: '●' }, { id: 'repeat-wrong', symbol: '▲' }
    ],
    initialState: { selectedElementId: null },
    options: [],
    hints: ['先找出一直再次出現的「● ■」小組。', '最後一個圖形還能和前一個組成同樣的小組嗎？'],
    feedbackByCode: { incomplete: '請先選出破壞反覆的元素。' },
    successFeedback: '找到了！最後一個元素讓重複單位中斷了。',
    validatorId: 'selected-element-equals',
    validation: { correctElementId: 'repeat-wrong', fixedSymbol: '■' },
    allowedTools: ['select-element', 'hint', 'validate'],
    nextStep: { type: 'stage', stageId: 'repetition-experiment' }
  },
  {
    id: 'repetition-experiment',
    stageType: 'experiment',
    principleId: 'repetition',
    interactionType: 'symbol-reorder',
    title: '拖曳修復',
    prompt: '拖曳圖形，讓相同的「● ■」小組再次出現。',
    description: '',
    progress: { current: 3, total: 3 },
    elements: [],
    initialState: { order: ['●', '■', '■', '●', '●', '■'] },
    options: [],
    hints: ['先排出一組「● ■」，再讓同一組再次出現。', '每兩個圖形分成一組，比較三組是否相同。'],
    feedbackByCode: { 'repeat-unit-unclear': '再把每兩個圖形看成一組，哪一組還不一樣？' },
    successFeedback: '反覆完成！相同的元素或組合再次出現，就能形成反覆。',
    validatorId: 'repeating-unit',
    validation: { unitLength: 2, unit: ['●', '■'] },
    allowedTools: ['reorder', 'undo', 'hint', 'validate'],
    nextStep: { type: 'complete', principleId: 'repetition' }
  },
  {
    id: 'symmetry-observe',
    stageType: 'recognize',
    principleId: 'symmetry',
    interactionType: 'symmetry-options',
    title: '觀察辨識',
    prompt: '哪一張以中線為基準，左右形成互相對應？',
    description: '左右都有東西，不一定真正對稱。',
    progress: { current: 1, total: 3 },
    elements: [],
    initialState: { selectedOptionId: null },
    options: [
      { id: 'a', pairs: [[26, 28, 72], [42, 30, 70], [58, 36, 64]] },
      { id: 'b', pairs: [[26, 28, 68], [42, 30, 74], [58, 36, 64]] },
      { id: 'c', pairs: [[26, 28, null], [42, 30, 58], [58, 36, 82]] }
    ],
    hints: ['從中線往左右比較：距離、高低與造形都對上了嗎？', '作品 A 的三組圖形都在中線兩側互相對應。'],
    feedbackByCode: { incomplete: '請先選擇一張作品，再完成檢測。' },
    successFeedback: '找到了！左右兩側的位置與造形都以中線互相對應。',
    validatorId: 'selected-option-equals',
    validation: { correctOptionId: 'a' },
    allowedTools: ['select-option', 'hint', 'validate'],
    nextStep: { type: 'stage', stageId: 'symmetry-discover' }
  },
  {
    id: 'symmetry-discover',
    stageType: 'discover',
    principleId: 'symmetry',
    interactionType: 'symmetry-diagnose',
    title: '構圖診斷',
    prompt: '右側哪一個元素沒有對上左側的鏡像位置？',
    description: '',
    progress: { current: 2, total: 3 },
    elements: [
      { id: 'symmetry-top', y: 24, correctY: 24, symbol: '●' },
      { id: 'symmetry-middle', y: 52, correctY: 42, symbol: '■' },
      { id: 'symmetry-bottom', y: 72, correctY: 72, symbol: '▲' }
    ],
    initialState: { selectedElementId: null },
    options: [],
    hints: ['沿著中線比較左右兩邊相同圖形的高度。', '中間那一組方形還沒有在同一個高度。'],
    feedbackByCode: { incomplete: '請先選出跑錯位置的元素。' },
    successFeedback: '找到了！中間的方形偏離了正確鏡像位置。',
    validatorId: 'selected-element-equals',
    validation: { correctElementId: 'symmetry-middle' },
    allowedTools: ['select-element', 'hint', 'validate'],
    nextStep: { type: 'stage', stageId: 'symmetry-experiment' }
  },
  {
    id: 'symmetry-experiment',
    stageType: 'experiment',
    principleId: 'symmetry',
    interactionType: 'mirror-drag',
    title: '拖曳修復',
    prompt: '拖曳右側方形，讓它回到左側方形的鏡像位置。',
    description: '接近正確位置時，圖形會輕輕吸附。',
    progress: { current: 3, total: 3 },
    elements: [
      { id: 'pair-top', symbol: '●', y: 24 },
      { id: 'pair-middle', symbol: '■', y: 42 },
      { id: 'pair-bottom', symbol: '▲', y: 72 }
    ],
    initialState: { position: { x: 78, y: 58 } },
    options: [],
    hints: ['先看左側方形離中線多遠，再到右側找相同距離。', '讓左右方形保持相同高度，並離中線一樣遠。'],
    feedbackByCode: { 'mirror-not-aligned': '再看看中線兩邊的位置，哪一個還沒有真正對上？' },
    successFeedback: '對稱完成！以中線為基準，兩側形成互相對應的關係。',
    validatorId: 'mirror-position',
    validation: { target: { x: 70, y: 42 }, tolerance: 5, snapTolerance: 7 },
    allowedTools: ['drag', 'undo', 'hint', 'validate'],
    nextStep: { type: 'complete', principleId: 'symmetry' }
  },
  {
    id: 'balance-observe', stageType: 'recognize', principleId: 'balance', interactionType: 'balance-options',
    title: '觀察辨識', prompt: '哪一張雖然左右不同，看起來還是很穩？',
    description: '均衡不一定左右一模一樣。', progress: { current: 1, total: 3 }, elements: [],
    initialState: { selectedOptionId: null },
    options: [
      { id: 'a', kind: 'symmetric', colors: ['red', 'yellow', 'blue'] },
      { id: 'b', kind: 'asymmetric-balanced', colors: ['red', 'blue', 'yellow'] },
      { id: 'c', kind: 'unbalanced', colors: ['blue', 'yellow', 'black'] }
    ],
    hints: ['比較中央兩側的視覺重量，不只看圖形是否相同。', '作品 B 用一個大圓和三個小方形取得穩定。'],
    feedbackByCode: { incomplete: '請先選擇一張作品，再完成檢測。' },
    successFeedback: '找到了！左右不同，也能用大小、數量與位置取得均衡。',
    validatorId: 'selected-option-equals', validation: { correctOptionId: 'b' },
    allowedTools: ['select-option', 'hint', 'validate'], nextStep: { type: 'stage', stageId: 'balance-discover' }
  },
  {
    id: 'balance-discover', stageType: 'discover', principleId: 'balance', interactionType: 'balance-diagnose',
    title: '構圖診斷', prompt: '哪一個元素讓視覺重量明顯偏向右側？', description: '',
    progress: { current: 2, total: 3 },
    elements: [
      { id: 'balance-large', size: 72, x: 30, y: 52, color: 'blue' },
      { id: 'balance-small-1', size: 28, x: 68, y: 45, color: 'yellow' },
      { id: 'balance-small-2', size: 28, x: 74, y: 52, color: 'black' },
      { id: 'balance-wrong', size: 28, x: 90, y: 59, color: 'yellow' }
    ],
    initialState: { selectedElementId: null }, options: [],
    hints: ['右側的小圖形離中央越遠，視覺重量也會更偏向那一側。', '看看最靠右的小方形。'],
    feedbackByCode: { incomplete: '請先選出讓畫面失衡的元素。' },
    successFeedback: '找到了！最外側的圖形讓右側視覺重量過重。',
    validatorId: 'selected-element-equals', validation: { correctElementId: 'balance-wrong' },
    allowedTools: ['select-element', 'hint', 'validate'], nextStep: { type: 'stage', stageId: 'balance-experiment' }
  },
  {
    id: 'balance-experiment', stageType: 'experiment', principleId: 'balance', interactionType: 'balance-drag',
    title: '拖曳修復', prompt: '左右的圖形不一樣重，試著移動右側的小方形，讓畫面重新穩定。',
    description: '左右不需要相同；水平移動方形，改變它離中心的距離。', progress: { current: 3, total: 3 },
    elements: [
      { id: 'balance-large', size: 72, x: 30, y: 52, shape: 'circle', color: 'red' },
      { id: 'balance-small-1', size: 28, x: 68, y: 45, shape: 'square', color: 'blue' },
      { id: 'balance-small-2', size: 28, x: 72, y: 52, shape: 'square', color: 'yellow' }
    ],
    initialState: { position: { x: 90, y: 59 }, color: 'blue' }, options: [],
    hints: ['把最外側的方形往中央靠近一些，觀察畫面是否穩定。', '三個小方形可以共同回應左側的大圓。'],
    feedbackByCode: { 'balance-unstable': '右側的視覺重量還是偏重，再調整最外側方形的位置。' },
    successFeedback: '平衡完成！大小、數量和位置不同，也能讓畫面取得穩定。',
    validatorId: 'visual-balance', validation: { targetMoment: 24, tolerance: 5 },
    allowedTools: ['drag', 'undo', 'hint', 'validate'], nextStep: { type: 'complete', principleId: 'balance' }
  },
  {
    id: 'rhythm-observe', stageType: 'recognize', principleId: 'rhythm', interactionType: 'rhythm-options',
    title: '觀察辨識', prompt: '哪一張不只反覆，還讓你的視線「動起來」？',
    description: '律動是反覆加上有方向的變化。', progress: { current: 1, total: 3 }, elements: [],
    initialState: { selectedOptionId: null },
    options: [
      { id: 'a', ys: [50, 50, 50, 50, 50, 50] },
      { id: 'b', ys: [65, 48, 32, 44, 61, 75] },
      { id: 'c', ys: [28, 72, 38, 76, 30, 55] }
    ],
    hints: ['觀察視線能不能順著元素的位置連續前進。', '作品 B 的位置有連續起伏，不只是同高反覆。'],
    feedbackByCode: { incomplete: '請先選擇一張作品，再完成檢測。' },
    successFeedback: '找到了！連續起伏讓反覆的元素產生視覺動勢。',
    validatorId: 'selected-option-equals', validation: { correctOptionId: 'b' },
    allowedTools: ['select-option', 'hint', 'validate'], nextStep: { type: 'stage', stageId: 'rhythm-discover' }
  },
  {
    id: 'rhythm-discover', stageType: 'recognize', principleId: 'rhythm', interactionType: 'rhythm-follow',
    title: '跟著節奏', prompt: '跟著畫面的節奏，依序點擊圓點。', description: '',
    progress: { current: 2, total: 3 },
    elements: [], initialState: { nextIndex: 0, demoComplete: false }, options: [],
    positions: [68, 51, 34, 46, 63, 76],
    hints: ['跟著節奏，從左往右試試看。'], feedbackByCode: {},
    successFeedback: '感覺到了嗎？視線跟著圖形一個接一個動起來了！',
    validatorId: 'sequential-clicks', validation: { count: 6 },
    allowedTools: ['follow-rhythm', 'hint'], nextStep: { type: 'stage', stageId: 'rhythm-experiment' }
  },
  {
    id: 'rhythm-experiment', stageType: 'experiment', principleId: 'rhythm', interactionType: 'rhythm-drag',
    title: '創造律動', prompt: '上下拖曳圓點，創造一個有波動起伏的律動。',
    description: '只要拉出肉眼看得見的高低差，就能形成律動。', progress: { current: 3, total: 3 },
    elements: [], initialState: { positions: [50, 50, 50, 50, 50, 50] }, options: [],
    hints: ['讓相鄰元素逐步向上或向下，形成可以追隨的方向。', '試著做出先上升、再下降的一次連續起伏。'],
    feedbackByCode: { 'height-difference-small': '再拉開一些高低差，讓節奏更明顯。' },
    successFeedback: '節奏出現了！反覆加上位置的高低變化，就能形成律動。',
    validatorId: 'visible-height-difference', validation: { minRange: 12 },
    allowedTools: ['drag', 'undo', 'hint', 'validate'], nextStep: { type: 'complete', principleId: 'rhythm' }
  },
  {
    id: 'unity-observe', stageType: 'recognize', principleId: 'unity', interactionType: 'unity-options',
    title: '看出統一', prompt: '哪一組雖然顏色不同，看起來還是像「同一家族」？', description: '共同特徵能把不同元素連成一個整體。',
    progress: { current: 1, total: 3 }, elements: [], initialState: { selectedOptionId: null },
    options: [
      { id: 'a', shapes: ['circle','circle','circle','circle','circle','circle'], colors: ['red','blue','yellow','red','black','blue'] },
      { id: 'b', shapes: ['circle','square','triangle','circle','square','triangle'], colors: ['blue','yellow','red','black','blue','yellow'] },
      { id: 'c', shapes: ['square','triangle','circle','triangle','square','circle'], colors: ['yellow','red','blue','black','yellow','red'] }
    ],
    hints: ['先不看顏色，找找哪一組有清楚的共同形狀。'], feedbackByCode: { incomplete: '請先選擇一組作品。' },
    successFeedback: '找到了！顏色不同，只要有共同特徵，也能形成統一。',
    validatorId: 'selected-option-equals', validation: { correctOptionId: 'a' }, allowedTools: ['select-option','hint','validate'],
    nextStep: { type: 'stage', stageId: 'unity-discover' }
  },
  {
    id: 'unity-discover', stageType: 'discover', principleId: 'unity', interactionType: 'unity-direction-diagnose',
    title: '發現共同方向', prompt: '哪一個元素讓這個家族看起來不太一樣？', description: '', progress: { current: 2, total: 3 },
    elements: [
      { id:'u1', x:14, y:58, rotation:45, color:'red' }, { id:'u2', x:29, y:40, rotation:45, color:'blue' },
      { id:'u3', x:44, y:61, rotation:45, color:'yellow' }, { id:'u4', x:59, y:38, rotation:135, color:'black' },
      { id:'u5', x:74, y:57, rotation:45, color:'red' }, { id:'u6', x:88, y:42, rotation:45, color:'blue' }
    ],
    initialState: { selectedElementId: null }, options: [], hints: ['再看看，它們有什麼共同的方向？'],
    feedbackByCode: { incomplete: '請先選出方向不同的箭頭。' }, successFeedback: '發現了！共同的方向，也能讓不同元素形成統一。',
    validatorId: 'selected-element-equals', validation: { correctElementId:'u4' }, allowedTools: ['select-element','hint','validate'],
    nextStep: { type:'stage', stageId:'unity-experiment' }
  },
  {
    id: 'unity-experiment', stageType: 'experiment', principleId: 'unity', interactionType: 'unity-rotate',
    title: '修復統一', prompt: '轉動不一樣的箭頭，讓它重新回到這個家族。', description: '只調整方向，保留每個箭頭原本的顏色與位置。', progress: { current:3, total:3 },
    elements: [
      { x:14,y:42,rotation:45,color:'blue' }, { x:29,y:62,rotation:45,color:'yellow' }, { x:44,y:39,rotation:45,color:'red' },
      { x:59,y:60,rotation:45,color:'black' }, { x:74,y:41,rotation:45,color:'yellow' }, { x:88,y:59,rotation:45,color:'blue' }
    ],
    targetIndex: 3, initialState: { rotation:135 }, options: [], hints: ['把不同的箭頭轉到和大家接近的方向。'],
    feedbackByCode: { 'angle-not-aligned':'再轉一些，讓箭頭和大家朝向相近。' },
    successFeedback: '統一完成！元素不必完全相同，只要具有共同特徵，就能形成整體。',
    validatorId:'angle-near', validation:{ targetAngle:45, tolerance:12 }, allowedTools:['rotate','undo','hint','validate'],
    nextStep:{ type:'complete', principleId:'unity' }
  },
  {
    id:'harmony-observe', stageType:'recognize', principleId:'harmony', interactionType:'harmony-options',
    title:'看出調和', prompt:'哪一組色彩放在一起，看起來最能互相呼應？', description:'形狀與位置相同，只比較色彩之間的關係。', progress:{current:1,total:3}, elements:[], initialState:{selectedOptionId:null},
    options:[
      {id:'a',colors:['red','red-orange','orange','red','orange','red-orange']},
      {id:'b',colors:['red','blue','yellow','red','blue','yellow']},
      {id:'c',colors:['blue','yellow','red-violet','blue','yellow','red-violet']}
    ],
    hints:['找找色相彼此接近、能互相呼應的一組。'], feedbackByCode:{incomplete:'請先選擇一組色彩。'},
    successFeedback:'找到了！彼此接近、能互相呼應的色彩，會讓畫面更調和。', validatorId:'selected-option-equals', validation:{correctOptionId:'a'}, allowedTools:['select-option','hint','validate'],
    nextStep:{type:'stage',stageId:'harmony-discover'}
  },
  {
    id:'harmony-discover', stageType:'discover', principleId:'harmony', interactionType:'harmony-color-diagnose',
    title:'找出離群色', prompt:'哪一個顏色突然跳出了原本的色彩關係？', description:'', progress:{current:2,total:3},
    elements:[
      {id:'h1',color:'blue',x:14},{id:'h2',color:'blue-green',x:29},{id:'h3',color:'green',x:44},
      {id:'h4',color:'red',x:59},{id:'h5',color:'blue-green',x:74},{id:'h6',color:'blue',x:88}
    ],
    initialState:{selectedElementId:null}, options:[], hints:['再看看，哪一個顏色和其他色彩比較難互相呼應？'], feedbackByCode:{incomplete:'請先選出跳出色彩關係的元素。'},
    successFeedback:'看見了！有一個顏色離開了原本互相呼應的色彩範圍。', validatorId:'selected-element-equals', validation:{correctElementId:'h4'}, allowedTools:['select-element','hint','validate'],
    nextStep:{type:'stage',stageId:'harmony-experiment'}
  },
  {
    id:'harmony-experiment', stageType:'experiment', principleId:'harmony', interactionType:'harmony-palette',
    title:'修復調和', prompt:'幫它換一個更能和大家互相呼應的顏色。', description:'從候選色中替換離群色，不需要完整調色工具。', progress:{current:3,total:3},
    elements:[{color:'yellow-orange'},{color:'orange'},{color:'red-orange'},{color:'blue'},{color:'orange'},{color:'yellow-orange'}], targetIndex:3,
    initialState:{selectedHue:'blue'}, candidates:['red','red-orange','yellow-orange','blue'], options:[], hints:['選擇靠近紅、橙色家族的顏色。'],
    feedbackByCode:{'hue-not-harmonious':'再試一個更接近紅、橙色家族的顏色。'}, successFeedback:'調和完成！彼此接近、能互相呼應的色彩，讓畫面更協調。',
    validatorId:'hue-in-set', validation:{acceptableHues:['red','red-orange','yellow-orange']}, allowedTools:['select-color','hint','validate'], nextStep:{type:'complete',principleId:'harmony'}
  }
];

export function getPrinciple(principleId) {
  return principles.find((principle) => principle.id === principleId);
}

export function getStagesForPrinciple(principleId) {
  return stages.filter((stage) => stage.principleId === principleId);
}
