const option = (id, label) => ({ id, label });

function element(id, shape, x, y, size, hue, lightness = 3, rotation = 0) {
  return { id, shape, x, y, size, hue, lightness, rotation, proportion: 1 };
}

export const recognizeQuestions = Object.freeze([
  {
    id: 'recognize-repetition', principleId: 'repetition', title: '反覆',
    prompt: '這張構圖最明顯的形式原理是什麼？', shortHint: '看重複。',
    elements: [180, 340, 500, 660, 820].map((x, index) => element(`triangle-${index}`, 'triangle', x, 300, 3, 'red')),
    options: [option('repetition', '反覆'), option('gradation', '漸層'), option('rhythm', '律動')],
    correctAnswer: 'repetition',
    wrongFeedback: {
      gradation: '每個圖形有一步一步改變嗎？還是相同元素一直再次出現？',
      rhythm: '有重複，但視線有明顯的高低起伏嗎？'
    },
    successFeedback: '相同或相似的元素再次出現，形成反覆。'
  },
  {
    id: 'recognize-gradation', principleId: 'gradation', title: '漸層',
    prompt: '這張構圖最明顯的形式原理是什麼？', shortHint: '看逐步變化。',
    elements: [5, 4, 3, 2, 1].map((size, index) => element(`square-${index}`, 'square', 180 + index * 160, 310, size, 'blue')),
    options: [option('gradation', '漸層'), option('repetition', '反覆'), option('proportion', '比例')],
    correctAnswer: 'gradation',
    wrongFeedback: {
      repetition: '圖形確實重複了，但每一個都完全一樣嗎？',
      proportion: '這裡最重要的是固定比例關係，還是一步一步的變化？'
    },
    successFeedback: '元素逐步產生變化，形成漸層。'
  },
  {
    id: 'recognize-symmetry', principleId: 'symmetry', title: '對稱',
    prompt: '這張構圖最明顯的形式原理是什麼？', shortHint: '看兩側。',
    guides: [{ type: 'vertical-axis', x: 500 }],
    elements: [
      element('left-circle', 'circle', 320, 150, 2, 'blue'), element('right-circle', 'circle', 680, 150, 2, 'blue'),
      element('left-triangle', 'triangle', 250, 310, 3, 'red'), element('right-triangle', 'triangle', 750, 310, 3, 'red'),
      element('left-square', 'square', 350, 470, 2, 'yellow'), element('right-square', 'square', 650, 470, 2, 'yellow')
    ],
    options: [option('symmetry', '對稱'), option('balance', '均衡')],
    correctAnswer: 'symmetry',
    wrongFeedback: { balance: '如果沿著中間對折，左右兩邊會發生什麼？' },
    successFeedback: '左右沿中軸形成鏡像關係，形成對稱。'
  },
  {
    id: 'recognize-balance', principleId: 'balance', title: '均衡',
    prompt: '這張構圖最明顯的形式原理是什麼？', shortHint: '均衡：不同 → 穩定',
    elements: [
      element('large-left', 'circle', 280, 300, 5, 'blue', 2),
      element('right-square-top', 'square', 750, 180, 2, 'blue', 2),
      element('right-square-middle', 'square', 750, 300, 2, 'blue', 2),
      element('right-square-bottom', 'square', 750, 420, 2, 'blue', 2)
    ],
    options: [option('balance', '均衡'), option('symmetry', '對稱'), option('proportion', '比例')],
    correctAnswer: 'balance',
    wrongFeedback: {
      symmetry: '左右真的一模一樣嗎？還是雖然不同，畫面仍然很穩定？',
      proportion: '這張圖雖然有大小差異，但重點是固定的比例關係，還是整個畫面的穩定感？'
    },
    successFeedback: '左右不必相同，也能形成穩定的視覺重量。'
  },
  {
    id: 'recognize-rhythm', principleId: 'rhythm', title: '律動',
    prompt: '這張構圖最明顯的形式原理是什麼？', shortHint: '看節奏與起伏。',
    elements: [420, 300, 150, 300, 420, 300, 150].map((y, index) => element(`rhythm-${index}`, 'semicircle', 110 + index * 130, y, 2, 'red', 3, index % 2 ? 180 : 0)),
    options: [option('rhythm', '律動'), option('repetition', '反覆'), option('gradation', '漸層')],
    correctAnswer: 'rhythm',
    wrongFeedback: {
      repetition: '你已經看到重複了，再看看視線是不是會跟著畫面上下移動？',
      gradation: '它是一路朝同一方向逐步改變，還是出現反覆的高低起伏？'
    },
    successFeedback: '節奏、起伏與動勢，讓視線在畫面中移動。'
  },
  {
    id: 'recognize-contrast', principleId: 'contrast', title: '對比',
    prompt: '這張構圖最明顯的形式原理是什麼？', shortHint: '看差異。',
    elements: [170, 330, 490].flatMap((y, rowIndex) => (
      [340, 500, 660].map((x, columnIndex) => (
        rowIndex === 1 && columnIndex === 1
          ? element('contrast-triangle', 'triangle', x, y, 2, 'red')
          : element(`contrast-circle-${rowIndex}-${columnIndex}`, 'circle', x, y, 2, 'blue')
      ))
    )),
    options: [option('contrast', '對比'), option('harmony', '調和'), option('proportion', '比例')],
    correctAnswer: 'contrast',
    wrongFeedback: {
      harmony: '哪一個元素最先吸引你的眼睛？它和其他元素相近，還是差很多？',
      proportion: '先觀察最醒目的元素；這裡強調的是指定比例，還是非常明顯的差異？'
    },
    successFeedback: '明顯的差異產生強烈的視覺效果。'
  },
  {
    id: 'recognize-harmony', principleId: 'harmony', title: '調和',
    prompt: '這張構圖最明顯的形式原理是什麼？', shortHint: '調和：相近 → 協調。',
    elements: [
      { ...element('h-circle', 'circle', 230, 210, 3, 'blue', 3), displayColor: '#3E78B2' },
      { ...element('h-triangle', 'triangle', 720, 180, 3, 'green', 3), displayColor: '#4F9D78' },
      { ...element('h-square', 'square', 470, 420, 3, 'green', 3), displayColor: '#3E8F91' },
      { ...element('h-rectangle', 'rectangle', 810, 430, 3, 'blue', 3), displayColor: '#3E78B2' }
    ],
    options: [option('harmony', '調和'), option('unity', '統一'), option('gradation', '漸層')],
    correctAnswer: 'harmony',
    wrongFeedback: {
      unity: '再看看這些顏色，它們是完全相同，還是彼此相近？',
      gradation: '這些顏色有按照固定順序一步一步改變嗎？'
    },
    wrongFeedbackSecond: {
      unity: '統一重視「共同要素」，這張圖更重要的是不同顏色之間的相近與協調。',
      gradation: '漸層需要明顯的「逐步變化」，再看看這些相近色是不是刻意沒有排成順序。'
    },
    successFeedback: '不同元素因為色彩彼此相近，產生協調感。'
  },
  {
    id: 'recognize-unity', principleId: 'unity', title: '統一',
    prompt: '這張構圖不只一種原理，最明顯的是哪一個？', shortHint: '統一：共同 → 一致。',
    secondaryPrinciples: ['repetition', 'contrast'],
    elements: [
      element('u-circle-1', 'circle', 190, 180, 2, 'yellow'),
      element('u-triangle', 'triangle', 430, 360, 4, 'yellow'),
      element('u-square', 'square', 650, 170, 3, 'yellow'),
      element('u-rectangle', 'rectangle', 790, 400, 2, 'yellow'),
      element('u-circle-2', 'circle', 260, 455, 1, 'yellow'),
      element('u-line', 'line', 520, 500, 3, 'yellow')
    ],
    options: [option('unity', '統一'), option('repetition', '反覆'), option('contrast', '對比'), option('harmony', '調和')],
    correctAnswer: 'unity',
    wrongFeedback: {
      repetition: '你沒有看錯，畫面確實具有反覆。但這題問的是「最明顯」。再看看，是什麼共同特徵把整張畫面連在一起？',
      contrast: '畫面也有大小或形狀差異，但什麼共同特徵讓這些不同圖形看起來屬於同一個整體？',
      harmony: '調和強調彼此相近、協調；這張圖是否有一個更明確的共同要素？'
    },
    successFeedback: '不同圖形透過共同要素，形成一致的整體。一張作品可以同時具有多種形式原理。'
  }
]);

export function getRecognizeQuestion(questionId) {
  return recognizeQuestions.find((question) => question.id === questionId);
}
