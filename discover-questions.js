const element = (id, shape, x, y, size = 3, hue = 'blue', extra = {}) => ({
  id, shape, x, y, size, hue, lightness: 3, rotation: 0, proportion: 1, layer: 1, ...extra
});
const option = (id, label, elements, description = '') => ({ id, label, elements, description });
const base = (data) => ({
  allowedTools: ['select', 'hint', 'validate'], prerequisite: [], randomizationGroup: data.principleId,
  difficulty: 2, feedbackByCode: { incomplete: '請先完成選擇，再確認答案。' }, ...data
});
const row = (prefix, shape, count, y, hue = 'blue', size = 2) => Array.from({ length: count }, (_, index) => element(`${prefix}-${index + 1}`, shape, 180 + index * 130, y, size, hue));
const waves = (prefix, ys, shape = 'circle') => ys.map((y, index) => element(`${prefix}-${index + 1}`, shape, 170 + index * 130, y, 2, 'red'));
const group = (prefix, accent = {}) => [
  element(`${prefix}-1`, 'circle', 300, 220, 2, 'blue'), element(`${prefix}-2`, 'circle', 430, 220, 2, 'blue'),
  element(`${prefix}-3`, 'circle', 560, 220, 2, 'blue'), element(`${prefix}-4`, 'circle', 690, 220, 2, 'blue'),
  element(`${prefix}-5`, 'circle', 365, 365, 2, 'blue'), element(`${prefix}-6`, accent.shape ?? 'circle', 495, 365, 2, accent.hue ?? 'blue', accent)
];

const questionList = [
  base({ id: 'discover-repetition-single', principleId: 'repetition', conceptVariant: 'single-element', interactionType: 'element-select', overlapPolicy: 'avoid', prompt: '這組構圖正在使用「反覆」，哪一個元素破壞了反覆？', elements: row('r1', 'triangle', 6, 310).map((item, i) => i === 3 ? { ...item, shape: 'square', id: 'r1-wrong' } : item), selectableElementIds: ['r1-1','r1-2','r1-3','r1-wrong','r1-5','r1-6'], correctAnswer: 'r1-wrong', hints: ['再看看，哪一個造形和其他反覆出現的元素不一樣？','找找看：哪一個不是三角形？'], successFeedback: '找到了！相同或相似的元素再次出現，可以形成反覆。', validatorId: 'discover-selection' }),
  base({ id: 'discover-repetition-group', principleId: 'repetition', conceptVariant: 'group', interactionType: 'element-select', overlapPolicy: 'allowed', prompt: '這次反覆的不是一個圖形，而是一個「組合」。哪裡不對勁？', elements: [0,1,2,3].flatMap((g) => [element(`rg-c-${g}`,'circle',210+g*200,300,3,'blue',{layer:1}),element(g===2?'rg-wrong':`rg-s-${g}`,g===2?'triangle':'square',250+g*200,300,2,'yellow',{layer:2})]), selectableElementIds: ['rg-c-0','rg-s-0','rg-c-1','rg-s-1','rg-c-2','rg-wrong','rg-c-3','rg-s-3'], correctAnswer: 'rg-wrong', hints: ['不一定要全部長一樣。先看看哪兩個圖形正在一組一組地再次出現？','原本是「圓形＋正方形」反覆出現，哪一組被改變了？'], successFeedback: '沒錯！反覆的不一定只有單一圖形，也可以是一組元素再次出現。', validatorId: 'discover-selection' }),
  base({ id: 'discover-gradation-size', principleId: 'gradation', conceptVariant: 'size', interactionType: 'element-select', overlapPolicy: 'avoid', prompt: '這組大小原本應該逐步變化，哪一個元素讓漸層中斷了？', elements: [[260,330,5],[434,346,4],[578,346,4],[722,372,2],[818,382,1]].map(([x,y,size],i)=>element(i===2?'gs-wrong':`gs-${i+1}`,'square',x,y,size,'blue')), selectableElementIds: ['gs-1','gs-2','gs-wrong','gs-4','gs-5'], correctAnswer: 'gs-wrong', hints: ['從最大的開始往右看，大小是不是一直朝同一個方向改變？','找找看，哪一個大小突然破壞了「大 → 小」的順序？'], successFeedback: '找到了！漸層的變化具有逐步的方向。', validatorId: 'discover-selection' }),
  base({ id: 'discover-gradation-lightness', principleId: 'gradation', conceptVariant: 'lightness', interactionType: 'element-select', overlapPolicy: 'avoid', prompt: '大小完全沒變，但這裡也能形成漸層。哪一個色彩深淺破壞了逐步變化？', elements: [1,2,2,4,5].map((lightness,i)=>element(i===2?'gl-wrong':`gl-${i+1}`,'square',220+i*140,310,3,'blue',{lightness})), selectableElementIds: ['gl-1','gl-2','gl-wrong','gl-4','gl-5'], correctAnswer: 'gl-wrong', hints: ['這次不要看大小，看看顏色的深淺。','從最深開始往右看，哪一格沒有順著「深 → 淺」變化？'], successFeedback: '沒錯！漸層不只能改變大小，色彩深淺也能逐步變化。', successNote: '漸層看的不是「大小」，而是「逐步變化」。', validatorId: 'discover-selection' }),
  base({ id: 'discover-gradation-gap', principleId: 'gradation', conceptVariant: 'spacing', interactionType: 'gap-select', overlapPolicy: 'avoid', prompt: '這次所有圖形都一樣。哪一段「間距」破壞了漸層？', elements: [180,256,352,488,594,760].map((x,i)=>element(`gg-${i+1}`,'circle',x,310,1,'blue')), gaps: [{id:'gap-1',left:'gg-1',right:'gg-2'},{id:'gap-2',left:'gg-2',right:'gg-3'},{id:'gap-wrong',left:'gg-3',right:'gg-4'},{id:'gap-4',left:'gg-4',right:'gg-5'},{id:'gap-5',left:'gg-5',right:'gg-6'}], selectableGapIds: ['gap-1','gap-2','gap-wrong','gap-4','gap-5'], correctAnswer: 'gap-wrong', hints: ['這次圖形本身都沒有變，看看它們「中間的空白」。','從左往右比較每一段距離，哪一段沒有逐步增加？'], successFeedback: '找到了！元素之間的間距，也可以形成逐步變化。', successNote: '大小、色彩、間距，都可能形成漸層。', validatorId: 'discover-selection' }),
  base({ id: 'discover-symmetry-shape', principleId: 'symmetry', conceptVariant: 'shape', interactionType: 'element-select', overlapPolicy: 'avoid', prompt: '這張圖原本應該左右對稱，哪一個元素無法和另一側對應？', guides:[{type:'vertical-axis',x:500}], elements: [element('ss-l1','circle',320,170,2),element('ss-l2','triangle',270,310,2),element('ss-l3','square',350,450,2),element('ss-r1','circle',680,170,2),element('ss-r2','triangle',730,310,2),element('ss-wrong','circle',650,450,2)], selectableElementIds:['ss-l1','ss-l2','ss-l3','ss-r1','ss-r2','ss-wrong'], correctAnswer:'ss-wrong', hints:['先找找看，中線左右有哪些圖形應該成對出現？','想像沿著中線對折，哪一個造形無法和另一側重合？'], successFeedback:'找到了！對稱的兩側具有相互對應的關係。', validatorId:'discover-selection' }),
  base({ id: 'discover-symmetry-position', principleId: 'symmetry', conceptVariant: 'position', interactionType: 'element-select', overlapPolicy: 'avoid', prompt: '圖形明明都成對了，為什麼還是不對稱？找出位置不對的元素。', guides:[{type:'vertical-axis',x:500}], elements: [element('sp-l1','circle',330,170,2),element('sp-l2','triangle',260,310,2),element('sp-l3','square',350,450,2),element('sp-r1','circle',670,170,2),element('sp-wrong','triangle',680,310,2),element('sp-r3','square',650,450,2)], selectableElementIds:['sp-l1','sp-l2','sp-l3','sp-r1','sp-wrong','sp-r3'], correctAnswer:'sp-wrong', hints:['這次每一種圖形都有一對，問題不在造形。','比較左右元素和中線的距離，哪一對無法對折重合？'], successFeedback:'沒錯！對稱不只要造形對應，位置也要形成鏡像。', validatorId:'discover-selection' }),
  base({ id:'discover-rhythm-compare', principleId:'rhythm', conceptVariant:'repetition-versus-rhythm', interactionType:'composition-choice', overlapPolicy:'allowed', prompt:'哪一張構圖的「律動感」比較明顯？', comparisonPanels:[option('a','A',row('rc-a','circle',6,310)),option('b','B',waves('rc-b',[410,310,190,310,410,310]))], options:[{id:'a',label:'A'},{id:'b',label:'B'}], correctAnswer:'b', hints:['兩張都有元素反覆出現，再看看哪一張更會帶著你的眼睛移動？','注意元素的高低位置，哪一張具有更明顯的起伏？'], successFeedback:'看到了！律動不只有反覆，還會透過起伏、方向或變化帶動視線。', validatorId:'discover-selection' }),
  base({ id:'discover-rhythm-multiple', principleId:'rhythm', conceptVariant:'regular-irregular', interactionType:'multi-select-composition', overlapPolicy:'required', prompt:'下面哪些構圖具有明顯的律動感？可以複選。', comparisonPanels:[option('a','A',row('rm-a','circle',6,310)),option('b','B',waves('rm-b',[400,270,170,270,400,270],'triangle')),option('c','C',[element('rm-c1','rectangle',180,390,2,'red',{rotation:315}),element('rm-c2','triangle',300,300,2,'red',{rotation:35,layer:2}),element('rm-c3','rectangle',420,210,2,'red',{rotation:325}),element('rm-c4','triangle',550,175,3,'red',{rotation:70,layer:2}),element('rm-c5','rectangle',690,250,2,'red',{rotation:35}),element('rm-c6','triangle',790,370,2,'red',{rotation:125,layer:2})])], options:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}], correctAnswer:['b','c'], feedbackByCode:{incomplete:'請先選擇你認為具有律動感的構圖。','only-b':'B確實有律動。再看看C：雖然沒有固定規律，你的視線會不會仍然被元素的方向帶著移動？','only-c':'C具有動勢。再看看B，規律的高低起伏是不是也會形成律動？','a-b':'A的反覆很明顯，但元素幾乎維持同樣的位置。再比較哪一張具有更明顯的視線移動。','all':'不是只要元素再次出現就一定具有明顯律動。比較A和另外兩張的視線動勢。'}, hints:['看節奏、起伏與動勢。','律動可以規律，也可以不規律；重點是視線是否被帶著移動。'], successFeedback:'沒錯！律動可以規律，也可以不規律。重點是節奏、起伏或方向形成動勢，帶著視線移動。', successNote:'律動 ≠ 一定規律', validatorId:'discover-multi' }),
  base({ id:'discover-proportion', principleId:'proportion', conceptVariant:'ratio-1-2-3', interactionType:'composition-choice', overlapPolicy:'avoid', prompt:'目標比例：1：2：3。哪一組符合這個比例關係？', comparisonPanels:[option('a','A',[40,80,120].map((s,i)=>element(`p-a${i}`,'square',300+i*200,400-s/2,3,'blue',{displaySize:s}))),option('b','B',[40,70,120].map((s,i)=>element(`p-b${i}`,'square',300+i*200,400-s/2,3,'blue',{displaySize:s}))),option('c','C',[40,100,120].map((s,i)=>element(`p-c${i}`,'square',300+i*200,400-s/2,3,'blue',{displaySize:s})))], options:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}], correctAnswer:'a', hints:['有大、中、小還不夠，再看看三個大小之間是不是符合1：2：3。','參考規則：1　2　3。'], successFeedback:'沒錯！比例看的不是只有「大小不同」，而是元素之間的大小關係。', successNote:'比例＝關係', validatorId:'discover-selection' }),
  base({ id:'discover-contrast', principleId:'contrast', conceptVariant:'strength', interactionType:'composition-choice', overlapPolicy:'allowed', prompt:'哪一組的「對比」最強烈？', comparisonPanels:[option('a','A',group('ct-a',{hue:'blue',lightness:4})),option('b','B',group('ct-b',{shape:'triangle',hue:'blue'})),option('c','C',group('ct-c',{shape:'triangle',hue:'red'}))], options:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}], correctAnswer:'c', hints:['看看哪一組有一個元素最容易立刻被你注意到？','比較造形和色彩的差異，哪一組和周圍元素差得最多？'], successFeedback:'沒錯！元素之間的差異越明顯，視覺對比通常也越強烈。', successNote:'對比＝差異', validatorId:'discover-selection' }),
  base({ id:'discover-balance', principleId:'balance', conceptVariant:'stability', interactionType:'composition-choice', overlapPolicy:'allowed', prompt:'三張圖左右都不完全相同，哪一張看起來最均衡？', comparisonPanels:[option('a','A',[element('ba-a1','circle',300,310,5,'blue'),element('ba-a2','square',720,310,1,'blue')]),option('b','B',[element('ba-b1','circle',300,310,5,'blue'),element('ba-b2','square',720,190,2,'blue'),element('ba-b3','square',720,310,2,'blue'),element('ba-b4','square',720,430,2,'blue')]),option('c','C',[element('ba-c1','circle',260,310,5,'blue'),element('ba-c2','square',580,190,2,'blue'),element('ba-c3','square',580,310,2,'blue'),element('ba-c4','square',580,430,2,'blue')])], options:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}], correctAnswer:'b', hints:['不要只數圖形有幾個。看看整張畫面，你覺得視覺重量偏向哪一邊？','比較大小、數量和位置，哪一張左右雖然不同，卻最穩定？'], successFeedback:'沒錯！均衡不要求左右一模一樣，而是讓整體視覺重量保持穩定。', successNote:'均衡：不同 → 穩定', validatorId:'discover-selection' }),
  base({ id:'discover-harmony', principleId:'harmony', conceptVariant:'adjacent-color-outlier', interactionType:'element-select', overlapPolicy:'required', prompt:'這些色彩原本彼此很協調，哪一個元素破壞了「調和」？', elements:[element('ha-1','circle',260,220,3,'blue',{layer:1}),element('ha-2','square',350,260,2,'green',{displayColor:'#3E8F91',layer:2}),element('ha-3','triangle',500,190,3,'green',{layer:1}),element('ha-4','rectangle',620,260,2,'blue',{layer:2}),element('ha-wrong','triangle',735,190,2,'orange',{displayColor:'#E66B3D',layer:3}),element('ha-6','circle',760,350,3,'green',{layer:1}),element('ha-7','square',480,380,2,'blue',{layer:2})], selectableElementIds:['ha-1','ha-2','ha-3','ha-4','ha-wrong','ha-6','ha-7'], correctAnswer:'ha-wrong', hints:['這次不用找相同的顏色，看看哪些顏色彼此比較接近。','藍、藍綠、綠彼此很接近，哪一個顏色突然跳了出去？'], successFeedback:'找到了！相近的色彩容易形成協調感，差異過大的色彩會改變原本的調和關係。', successNote:'調和：相近 → 協調', validatorId:'discover-selection' }),
  base({ id:'discover-unity', principleId:'unity', conceptVariant:'common-color-outlier', interactionType:'element-select', overlapPolicy:'required', prompt:'這些不同造形原本具有一個「共同要素」，哪一個破壞了統一？', elements:[element('un-1','circle',260,220,3,'yellow'),element('un-2','square',360,270,2,'yellow',{layer:2}),element('un-3','triangle',500,190,3,'yellow'),element('un-4','rectangle',620,260,2,'yellow',{layer:2}),element('un-wrong','circle',740,200,2,'blue',{layer:3}),element('un-6','triangle',760,360,3,'yellow'),element('un-7','square',480,390,2,'yellow',{layer:2})], selectableElementIds:['un-1','un-2','un-3','un-4','un-wrong','un-6','un-7'], correctAnswer:'un-wrong', hints:['先不要管它們長得一不一樣，找找看大家共同具有什麼？','這些造形雖然不同，但大部分都有相同的黃色。哪一個沒有？'], successFeedback:'找到了！不同元素具有共同要素，可以讓畫面產生統一感。', successNote:'統一：共同 → 一致', validatorId:'discover-selection' }),
  base({ id:'discover-harmony-unity', principleId:'synthesis', conceptVariant:'harmony-versus-unity', interactionType:'pairing', overlapPolicy:'required', prompt:'A、B分別比較接近哪一項形式原理？', prerequisite:['discover-harmony','discover-unity'], comparisonPanels:[option('a','A',[element('hu-a1','circle',290,230,3,'blue'),element('hu-a2','square',420,280,2,'green',{displayColor:'#3E8F91',layer:2}),element('hu-a3','triangle',570,210,3,'green'),element('hu-a4','rectangle',700,300,2,'blue',{layer:2})]),option('b','B',[element('hu-b1','circle',290,230,3,'yellow'),element('hu-b2','square',420,280,2,'yellow',{layer:2}),element('hu-b3','triangle',570,210,3,'yellow'),element('hu-b4','rectangle',700,300,2,'yellow',{layer:2})])], pairingTargets:['harmony','unity'], correctAnswer:{a:'harmony',b:'unity'}, hints:['想想兩個關鍵：「相近」和「共同」。哪一張只是彼此接近？哪一張具有相同的共同要素？','調和看「相近」；統一找「共同」。'], successFeedback:'A｜調和：相近 → 協調　　B｜統一：共同 → 一致', successNote:'調和不一定相同；統一則需要能找到共同要素。', validatorId:'discover-pairing' }),
  base({ id:'discover-simplicity', principleId:'simplicity', conceptVariant:'before-after', interactionType:'composition-choice', overlapPolicy:'allowed', prompt:'哪一個版本真正做到「單純」，又保留了原本的重點？', beforeState:[element('si-core','circle',500,300,5,'red',{layer:3}),element('si-d1','triangle',330,180,2,'blue'),element('si-d2','circle',680,180,1,'yellow'),element('si-d3','line',300,390,3,'blue',{displayColor:'#252525'}),element('si-d4','square',690,380,2,'green'),element('si-d5','triangle',550,160,1,'yellow')], comparisonPanels:[option('a','A',[element('si-a-core','circle',500,300,5,'red',{layer:3}),element('si-a1','triangle',330,180,2,'blue'),element('si-a2','line',300,390,3,'blue',{displayColor:'#252525'}),element('si-a3','square',690,380,2,'green')]),option('b','B',[element('si-b-core','circle',500,300,5,'red',{layer:3}),element('si-b1','line',500,430,2,'blue',{displayColor:'#252525'})]),option('c','C',[element('si-c1','line',500,330,2,'blue',{displayColor:'#252525'})])], options:[{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}], correctAnswer:'b', feedbackByCode:{incomplete:'請先選擇一個版本。',a:'畫面確實少了一些東西，但不必要的裝飾是不是還很多？',c:'東西最少不一定就是單純。原本最重要的視覺重點還在嗎？'}, hints:['比較哪些裝飾仍然不必要，以及主要紅色圓形是否保留。','單純不是全部刪掉，而是留下必要的、去掉多餘的。'], successFeedback:'沒錯！單純是減少不必要的複雜，同時保留清楚的核心。', successNote:'單純：簡潔 → 明確', validatorId:'discover-selection' })
];

function setPositions(questionId, positions) {
  const question = questionList.find(({ id }) => id === questionId);
  const elements = [
    ...(question.elements ?? []),
    ...(question.comparisonPanels ?? []).flatMap((panel) => panel.elements)
  ];
  Object.entries(positions).forEach(([id, position]) => Object.assign(
    elements.find((item) => item.id === id),
    position
  ));
}

function getQuestion(questionId) {
  return questionList.find(({ id }) => id === questionId);
}

// Fixture calibration: preserve the intended single variable and make required overlap explicit.
setPositions('discover-gradation-size', {
  'gs-1': { x: 260, y: 330, size: 5 }, 'gs-2': { x: 434, y: 346, size: 4 }, 'gs-wrong': { x: 566, y: 372, size: 2 },
  'gs-4': { x: 684, y: 360, size: 3 }, 'gs-5': { x: 792, y: 382, size: 1 }
});
getQuestion('discover-gradation-size').correctAnswer = 'gs-4';
setPositions('discover-gradation-lightness', {
  'gl-1': { lightness: 1 }, 'gl-2': { lightness: 2 }, 'gl-wrong': { lightness: 5 },
  'gl-4': { lightness: 4 }, 'gl-5': { lightness: 5 }
});
setPositions('discover-gradation-gap', {
  'gg-1': { x: 180 }, 'gg-2': { x: 256 }, 'gg-3': { x: 352 },
  'gg-4': { x: 428 }, 'gg-5': { x: 564 }, 'gg-6': { x: 720 }
});
setPositions('discover-rhythm-multiple', {
  'rm-c1': { x: 180, y: 390, rotation: 315 }, 'rm-c2': { x: 300, y: 300, rotation: 45 }, 'rm-c3': { x: 420, y: 210, rotation: 315 },
  'rm-c4': { x: 550, y: 175, rotation: 90 }, 'rm-c5': { x: 690, y: 250, rotation: 45 }, 'rm-c6': { x: 790, y: 370, rotation: 135 }
});
setPositions('discover-harmony', {
  'ha-1': { x: 230, y: 180 }, 'ha-2': { x: 390, y: 290 }, 'ha-3': { x: 540, y: 160 },
  'ha-4': { x: 690, y: 290 }, 'ha-wrong': { x: 830, y: 160 }, 'ha-6': { x: 790, y: 430 }, 'ha-7': { x: 500, y: 430 }
});
setPositions('discover-unity', {
  'un-1': { x: 230, y: 180 }, 'un-2': { x: 390, y: 290 }, 'un-3': { x: 540, y: 160 },
  'un-4': { x: 690, y: 290 }, 'un-wrong': { x: 830, y: 160 }, 'un-6': { x: 790, y: 430 }, 'un-7': { x: 500, y: 430 }
});
setPositions('discover-harmony-unity', {
  'hu-a1': { x: 250, y: 180 }, 'hu-a2': { x: 420, y: 320 }, 'hu-a3': { x: 590, y: 170 }, 'hu-a4': { x: 760, y: 330 },
  'hu-b1': { x: 250, y: 180 }, 'hu-b2': { x: 420, y: 320 }, 'hu-b3': { x: 590, y: 170 }, 'hu-b4': { x: 760, y: 330 }
});

setPositions('discover-repetition-group', {
  'rg-c-0': { x: 130 }, 'rg-s-0': { x: 205 }, 'rg-c-1': { x: 360 }, 'rg-s-1': { x: 435 },
  'rg-c-2': { x: 590 }, 'rg-wrong': { x: 665 }, 'rg-c-3': { x: 820 }, 'rg-s-3': { x: 895 }
});

setPositions('discover-proportion', {
  'p-a0': { displaySize: 50, y: 395 }, 'p-a1': { displaySize: 100, y: 370 }, 'p-a2': { displaySize: 150, y: 345 },
  'p-b0': { displaySize: 50, y: 395 }, 'p-b1': { displaySize: 75, y: 382.5 }, 'p-b2': { displaySize: 150, y: 345 },
  'p-c0': { displaySize: 50, y: 395 }, 'p-c1': { displaySize: 125, y: 357.5 }, 'p-c2': { displaySize: 150, y: 345 }
});

setPositions('discover-balance', {
  'ba-a1': { x: 280, y: 310 }, 'ba-a2': { x: 720, y: 310 },
  'ba-b1': { x: 280, y: 310 }, 'ba-b2': { x: 735, y: 190 }, 'ba-b3': { x: 735, y: 310 }, 'ba-b4': { x: 735, y: 430 },
  'ba-c1': { x: 280, y: 310 }, 'ba-c2': { x: 455, y: 190 }, 'ba-c3': { x: 455, y: 310 }, 'ba-c4': { x: 455, y: 430 }
});

const simplicity = getQuestion('discover-simplicity');
const flower = (prefix) => [
  element(`${prefix}-center`, 'circle', 500, 230, 2, 'yellow', { layer: 3 }),
  element(`${prefix}-left`, 'circle', 420, 230, 2, 'red'),
  element(`${prefix}-right`, 'circle', 580, 230, 2, 'red'),
  element(`${prefix}-top`, 'circle', 500, 140, 2, 'red'),
  element(`${prefix}-bottom`, 'circle', 500, 320, 2, 'red'),
  element(`${prefix}-stem`, 'rectangle', 500, 420, 2, 'green', { rotation: 90 })
];
simplicity.prompt = '哪一個版本變得更簡潔，同時仍保留原本主要的造形？';
simplicity.beforeState = [
  ...flower('si-before'),
  element('si-d1', 'circle', 260, 150, 1, 'blue'), element('si-d2', 'square', 720, 150, 1, 'yellow'),
  element('si-d3', 'triangle', 280, 390, 1, 'blue'), element('si-d4', 'rectangle', 720, 390, 1, 'red'),
  element('si-d5', 'line', 340, 110, 2, 'green', { rotation: 45 }), element('si-d6', 'line', 680, 110, 2, 'blue', { rotation: 315 })
];
simplicity.comparisonPanels = [
  option('a', 'A', [...flower('si-a'), element('si-a1', 'circle', 280, 160, 1, 'blue'), element('si-a2', 'square', 720, 380, 1, 'yellow'), element('si-a3', 'triangle', 300, 400, 1, 'green')]),
  option('b', 'B', flower('si-b')),
  option('c', 'C', [element('si-c-center', 'circle', 500, 230, 2, 'yellow')])
];
simplicity.feedbackByCode.a = '雖然少了一些元素，但畫面是不是還有不少不必要的裝飾？';
simplicity.feedbackByCode.c = '東西最少不一定就是單純。原本主要的花朵還看得出來嗎？';
simplicity.hints = ['比較哪些裝飾仍然不必要，以及主要花朵是否保留。', '留下必要的，去掉多餘的。'];
simplicity.successFeedback = '沒錯！單純不是全部刪掉，而是讓畫面簡潔、明確，同時保留主要內容。';
simplicity.successNote = '單純＝簡潔 → 明確';

const spacing = getQuestion('discover-gradation-gap');
const spacingRow = (prefix, xs) => xs.map((x, index) => element(`${prefix}-${index + 1}`, 'circle', x, 310, 1, 'blue'));
spacing.interactionType = 'composition-choice';
spacing.prompt = '哪一組圖形的「間距」有逐步變化？';
spacing.elements = [];
spacing.gaps = [];
spacing.selectableGapIds = [];
spacing.comparisonPanels = [
  option('a', 'A', spacingRow('gap-a', [180, 276, 372, 468, 564, 660])),
  option('b', 'B', spacingRow('gap-b', [180, 246, 332, 438, 564, 710])),
  option('c', 'C', spacingRow('gap-c', [180, 246, 352, 438, 584, 690]))
];
spacing.options = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
spacing.correctAnswer = 'b';
spacing.hints = ['圖形本身都一樣，這次比較它們中間的空白。', '哪一組的空白距離會一步一步增加或減少？'];
spacing.successFeedback = '沒錯！圖形之間的間距，也可以形成逐步變化。';
spacing.successNote = '漸層＝逐步變化';

questionList.filter(({ overlapPolicy }) => overlapPolicy === 'required').forEach((question) => {
  question.overlapPolicy = 'avoid';
});

export const discoverQuestions = Object.freeze(questionList);

export const discoverInteractionTypes = Object.freeze(['element-select','gap-select','composition-choice','multi-select-composition','pairing']);
export const overlapPolicies = Object.freeze(['avoid','allowed','required']);
export function getDiscoverQuestion(id) { return discoverQuestions.find((question) => question.id === id); }
