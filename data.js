export const principles = [
  {
    id: 'repetition',
    name: '反覆',
    shortDescription: '相同元素依規律再次出現。',
    status: 'coming-soon',
    hasContent: false,
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
    status: 'coming-soon',
    hasContent: false,
    previewSizes: [14, 24, 34, 34, 24, 14]
  },
  {
    id: 'balance',
    name: '均衡',
    shortDescription: '不同視覺重量取得穩定。',
    status: 'coming-soon',
    hasContent: false,
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
    status: 'coming-soon',
    hasContent: false,
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
    status: 'coming-soon',
    hasContent: false,
    previewSizes: [18, 20, 18, 20, 18, 20]
  },
  {
    id: 'harmony',
    name: '調和',
    shortDescription: '元素彼此協調並形成和諧關係。',
    status: 'coming-soon',
    hasContent: false,
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
  }
];

export function getPrinciple(principleId) {
  return principles.find((principle) => principle.id === principleId);
}

export function getStagesForPrinciple(principleId) {
  return stages.filter((stage) => stage.principleId === principleId);
}
