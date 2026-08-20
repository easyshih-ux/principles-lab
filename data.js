export const principles = [
  { id: 'repetition', name: '重複', description: '相同元素依規律再次出現。', status: 'soon', dots: [18,18,18,18,18,18] },
  { id: 'gradation', name: '漸層', description: '元素依順序持續產生變化。', status: 'open', dots: [10,14,19,25,32,40] },
  { id: 'symmetry', name: '對稱', description: '中線兩側形成相互呼應。', status: 'soon', dots: [14,24,34,34,24,14] },
  { id: 'balance', name: '均衡', description: '不同視覺重量取得穩定。', status: 'soon', dots: [42,12,12,12,12,12] },
  { id: 'contrast', name: '對比', description: '差異讓彼此更清楚醒目。', status: 'soon', dots: [12,38,12,38,12,38] },
  { id: 'rhythm', name: '律動', description: '反覆與方向形成視覺節奏。', status: 'soon', dots: [14,22,14,22,14,22] },
  { id: 'proportion', name: '比例', description: '大小關係改變整體感受。', status: 'soon', dots: [44,16,10,26,12,18] },
  { id: 'unity', name: '統一', description: '共同特徵讓畫面成為整體。', status: 'soon', dots: [18,20,18,20,18,20] }
];

export const tasks = {
  observe: { step: 1, name: '觀察辨識', question: '哪一張最明顯呈現「漸層」？', hint: '觀察圓點的大小是否按照順序持續改變。', success: '圓點依照順序逐漸變大，形成清楚的漸層。', choices: [
    { id: 'a', sizes: [12,18,25,33,42], correct: true }, { id: 'b', sizes: [30,14,40,20,34], correct: false }, { id: 'c', sizes: [24,24,24,24,24], correct: false }
  ]},
  diagnose: { step: 2, name: '構圖診斷', question: '有一顆圓點打亂了漸層，請把它找出來。', hint: '比較這顆圓點和左右兩邊的大小關係。', success: '找到了！這顆圓點讓大小變化突然中斷。', sizes: [18,28,39,26,61,74], wrongIndex: 3, fixedSize: 50 },
  repair: { step: 3, name: '拖曳修復', question: '拖曳圓點，讓大小變化從左到右逐漸增加。', success: '修復完成！連續而有順序的變化，讓畫面形成漸層。', sizes: [58,28,70,18,48,38] }
};
