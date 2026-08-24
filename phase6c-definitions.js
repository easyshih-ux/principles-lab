import { experimentDefinitionsById } from './experiment-definitions.js';

const element = (id, values = {}) => ({
  id, shape: 'circle', x: 200, y: 300, size: 3, hue: 'blue',
  lightness: 3, rotation: 0, proportion: 1, ...values
});

function formal(principleId, overrides) {
  const base = experimentDefinitionsById[`experiment-${principleId}`];
  return Object.freeze({
    ...base,
    ...overrides,
    initialState: Object.freeze({ ...base.initialState, ...overrides.initialState }),
    validationSpec: Object.freeze({ ...base.validationSpec, ...overrides.validationSpec }),
    diagnosticHints: Object.freeze(overrides.diagnosticHints),
    successFeedback: Object.freeze(overrides.successFeedback),
    discoveryFeedback: Object.freeze(overrides.discoveryFeedback),
    status: 'phase6c-formal'
  });
}

export const phase6cDefinitions = Object.freeze([
  formal('repetition', {
    title: '挑戰｜做出「反覆」',
    task: '運用畫面中的造形，讓某個造形或組合有「再次出現」的感覺。怎麼安排，由你決定。',
    initialState: { elements: [element('rep-1', { x: 300 }), element('rep-2', { x: 560 })] },
    validationSpec: { minimumOccurrences: 3, signatureFields: ['shape', 'size', 'hue', 'lightness', 'rotation'], allowGroupUnit: true, groupDistance: 180, groupOffsetTolerance: 20 },
    diagnosticHints: {
      NO_REPEAT_UNIT: { observe: '找找看，畫面裡有沒有哪個造形或組合，讓人有「又看到它了」的感覺？', think: '哪個造形或組合，可以成為畫面中一直出現的角色？', action: '選一個造形或一組造形，試著讓它再次出現。' },
      NOT_ENOUGH_REPETITION: { observe: '已經開始有「再次出現」的感覺了，但反覆還不太明顯。你覺得還能怎麼加強？', think: '你剛才使用的造形或組合，還能再出現一次嗎？', action: '讓同樣的造形或組合再明確出現一次，再檢查看看。' },
      INCONSISTENT_REPEAT: { observe: '畫面裡有很多造形，但哪一部分是「相同的東西再次出現」呢？', think: '試著找出一個你想反覆使用的造形或組合。', action: '讓同一個造形或組合保留比較明顯的共同特徵。' }
    },
    successFeedback: { general: '成功！畫面已形成反覆。', byMethod: { single: '成功！你讓相同的造形再次出現，形成了「反覆」。', group: '成功！你反覆使用的不是單一造形，而是一組造形。這也是「反覆」！' } },
    discoveryFeedback: { single: '反覆不一定要排得整整齊齊，重要的是讓相同的視覺元素再次出現。', group: '反覆不一定要排得整整齊齊，重要的是讓相同的視覺元素再次出現。' }
  }),
  formal('gradation', {
    title: '挑戰｜做出「漸層」',
    task: '運用造形的變化，讓畫面產生「一步一步改變」的感覺。怎麼變化，由你決定。',
    initialState: { elements: [1, 2, 3, 4, 5].map((size, index) => element(`grad-${index}`, { x: 180 + index * 155, size: index === 2 ? 2 : size, hue: 'blue' })) },
    validationSpec: { minimumStages: 4, allowedModes: ['size', 'lightness', 'spacing'], minimumSizeRange: 2, minimumLightnessRange: 2, minimumSpacingRange: 35 },
    diagnosticHints: {
      NO_CLEAR_GRADATION: { observe: '你的畫面有變化了，但哪一種變化有「一步一步」的感覺呢？', think: '看看大小、顏色深淺或間距，有沒有一項可以慢慢改變？', action: '選一種變化，試著讓它一步一步朝同一個方向前進。' },
      TOO_FEW_STAGES: { observe: '已經看得到變化了！但它比較像一下子從這裡跳到那裡。怎麼讓變化更有「過程」？', think: '可以在兩個差異之間，再加入一些變化嗎？', action: '讓中間多出幾個逐步改變的階段，再檢查看看。' },
      DIRECTION_BREAK: { observe: '前面正在慢慢改變，但後面好像突然改變方向了。你找得到在哪裡嗎？', think: '如果前面正在慢慢變大、變深或變疏，接下來可以繼續朝哪個方向？', action: '調整中途改變方向的地方，讓變化一路朝同一方向前進。' },
      CHANGE_TOO_SUBTLE: { observe: '仔細看有變化，但如果不靠近看，還能發現嗎？', think: '試著讓每一步的差異再明顯一點。', action: '把正在使用的變化稍微拉開，再檢查看看。' }
    },
    successFeedback: { general: '成功！畫面已形成漸層。', byMethod: { size: '成功！你讓造形的大小一步一步改變，形成了「漸層」。', lightness: '成功！你利用色彩的深淺變化做出了「漸層」。', spacing: '成功！即使造形沒有變，改變它們之間的距離，也能形成「漸層」。', multiple: '成功！你同時運用了不只一種變化來形成漸層。' } },
    discoveryFeedback: { size: '漸層不只可以改變大小，色彩深淺、間距等視覺特徵，也能產生一步一步的變化。', lightness: '漸層不只可以改變大小，色彩深淺、間距等視覺特徵，也能產生一步一步的變化。', spacing: '漸層不只可以改變大小，色彩深淺、間距等視覺特徵，也能產生一步一步的變化。', multiple: '漸層不只可以改變大小，色彩深淺、間距等視覺特徵，也能產生一步一步的變化。' }
  }),
  formal('balance', {
    title: '挑戰｜做出「均衡」',
    task: '運用造形的大小、數量和位置，讓整個畫面看起來穩定。左右可以不一樣，怎麼安排由你決定。',
    initialState: { elements: [element('bal-left', { x: 230, size: 4, hue: 'red' }), element('bal-right', { x: 720, size: 2 }), element('bal-right-2', { x: 820, y: 390, size: 1 })], gridConfig: { enabled: false, visible: true, step: 20, axis: 'vertical' } },
    validationSpec: { balanceTolerance: 0.45, allowSymmetrical: true, allowAsymmetrical: true, centerDeadZone: 45, requireAsymmetry: false },
    diagnosticHints: {
      ONE_SIDE_EMPTY: { observe: '看看整張畫面，造形是不是都集中到同一邊了？', think: '如果希望整個畫面更穩定，另一邊需要出現什麼力量呢？', action: '試著把部分造形安排到另一側，再觀察整體的感覺。' },
      LEFT_HEAVY: { observe: '先別急著改。看著整張畫面，你覺得它比較像往哪一邊倒？', think: '想想看：圖形的大小、數量和離中心的距離，哪一項可能讓某一邊看起來比較重？', action: '試著調整較重一側的大小或位置，或調整另一側，再看看畫面有沒有站得更穩。' },
      RIGHT_HEAVY: { observe: '先別急著改。看著整張畫面，你覺得它比較像往哪一邊倒？', think: '想想看：圖形的大小、數量和離中心的距離，哪一項可能讓某一邊看起來比較重？', action: '試著調整較重一側的大小或位置，或調整另一側，再看看畫面有沒有站得更穩。' },
      TOO_CENTERED: { observe: '兩邊好像很接近，但造形是不是都擠在中間了？', think: '如果把一些造形拉開，還能不能保持穩定？', action: '試著拉開部分造形的位置，再檢查看看。' }
    },
    successFeedback: { general: '成功！畫面已取得均衡。', byMethod: { symmetrical: '成功！你利用左右相似的安排，讓畫面取得了均衡。這是一種「對稱式均衡」。', asymmetrical: '成功！左右雖然不一樣，但你利用大小、數量或位置，讓畫面仍然保持穩定。' } },
    discoveryFeedback: { symmetrical: '對稱也是取得均衡的方法之一，但均衡不只有對稱。', asymmetrical: '均衡不代表左右一定相同。大小、數量和位置不同，也能讓畫面取得穩定。' }
  }),
  formal('rhythm', {
    title: '挑戰｜做出「律動」',
    task: '運用造形的位置、方向、大小或間距變化，讓視線在畫面中產生移動、起伏或前進的感覺。可以有規律，也可以不規律，怎麼安排由你決定。',
    initialState: { elements: [0, 1, 2, 3, 4].map((index) => element(`rhy-${index}`, { x: 180 + index * 155, y: 300, size: 2 })) },
    validationSpec: { minimumElements: 5, allowedMotionChannels: ['position', 'rotation', 'size', 'spacing', 'mixed'], minimumYRange: 80, minimumRotationRange: 90, minimumSizeRange: 2, minimumSpacingRange: 35, repetitionRequired: false },
    diagnosticHints: {
      NO_CLEAR_MOTION: { observe: '看著你的畫面，眼睛會自然地往某個方向移動嗎？', think: '位置、方向、大小或間距的變化，哪一種可以帶著視線走？', action: '選一種變化，讓視線能順著造形移動看看。' },
      CHANGE_TOO_SUBTLE: { observe: '好像開始動起來了，但這個動勢容易被看見嗎？', think: '哪一種變化可以再明顯一些？', action: '把位置、方向、大小或間距的差異稍微拉開。' },
      TOO_RANDOM: { observe: '畫面有很多變化，但你的眼睛知道接下來要往哪裡看嗎？', think: '找找看，有沒有一種位置、方向或變化，可以把這些元素連起來？', action: '保留一條比較清楚的視覺路徑，讓元素沿著它產生變化。' },
      STATIC_REPETITION: { observe: '畫面很整齊，但視線好像停在原地。怎麼讓它開始「動」起來？', think: '除了再次出現，位置、方向、大小或間距還能怎麼改變？', action: '選一種變化加入畫面，再檢查看看。' }
    },
    successFeedback: { general: '成功！畫面已形成律動。', byMethod: { position: '成功！造形的位置變化帶著視線移動，形成了「律動」。', rotation: '成功！方向的變化帶著視線前進，形成了「律動」。', size: '成功！大小的變化讓畫面產生了視覺律動。', spacing: '成功！疏密與間距的變化，讓畫面產生了節奏與律動。', mixed: '成功！你運用了多種變化，讓視線在畫面中產生明顯動勢。' } },
    discoveryFeedback: { position: '律動來自視覺上的連續變化。它可以有規律，也可以透過起伏、方向、大小或疏密產生流動感。', rotation: '律動來自視覺上的連續變化。它可以有規律，也可以透過起伏、方向、大小或疏密產生流動感。', size: '律動來自視覺上的連續變化。它可以有規律，也可以透過起伏、方向、大小或疏密產生流動感。', spacing: '律動來自視覺上的連續變化。它可以有規律，也可以透過起伏、方向、大小或疏密產生流動感。', mixed: '律動來自視覺上的連續變化。它可以有規律，也可以透過起伏、方向、大小或疏密產生流動感。' }
  }),
  formal('symmetry', {
    title: '挑戰｜做出「對稱」',
    task: '選擇一種對稱方式，利用方格和對稱軸安排造形，讓兩側彼此對應。',
    initialState: { elements: [element('sym-left', { shape: 'triangle', x: 320, y: 220, size: 3 })], selectedSymmetryMode: 'vertical', gridConfig: { enabled: true, visible: true, step: 20, axis: 'vertical' } },
    validationSpec: { allowedSymmetryModes: ['vertical', 'horizontal', 'cross'], axisX: 500, axisY: 300, gridStep: 20, positionTolerance: 1, directionAwareShapes: true },
    diagnosticHints: {
      NO_SYMMETRY_PAIR: { observe: '沿著對稱軸看看，這個造形在另一邊有找到它的「對應夥伴」嗎？', think: '如果把畫面沿著對稱軸對折，哪些造形還找不到彼此？', action: '找一個沒有對應的造形，在對稱軸另一側安排它的對應造形。' },
      POSITION_MISMATCH: { observe: '兩邊好像有相同造形，但如果沿著中線對折，它們真的會碰在一起嗎？', think: '看看它們離對稱軸的距離是不是一樣。', action: '利用方格調整位置，讓兩邊距離對稱軸相同。' },
      ATTRIBUTE_MISMATCH: { observe: '位置已經很接近了，再看看兩邊造形本身有沒有哪裡不同？', think: '造形、大小或方向，有沒有一項沒有彼此對應？', action: '調整兩側造形的大小、種類或方向，再檢查看看。' },
      CROSS_INCOMPLETE: { observe: '一個方向看起來已經很像了，那另一個方向呢？', think: '十字對稱要同時觀察左右和上下兩個方向。', action: '再沿另一條對稱軸檢查一次，補上還沒有對應的部分。' }
    },
    successFeedback: { general: '成功！造形已沿對稱軸彼此對應。', byMethod: { vertical: '成功！你讓造形沿著垂直中軸彼此對應，形成了左右對稱。', horizontal: '成功！你讓造形沿著水平中軸彼此對應，形成了上下對稱。', cross: '成功！你的構圖同時沿著水平與垂直方向彼此對應，形成了十字對稱。' } },
    discoveryFeedback: { vertical: '對稱不只有左右。改變對稱軸，也能形成上下或更多方向的對稱關係。', horizontal: '對稱不只有左右。改變對稱軸，也能形成上下或更多方向的對稱關係。', cross: '對稱不只有左右。改變對稱軸，也能形成上下或更多方向的對稱關係。' }
  }),
  formal('contrast', {
    title: '挑戰｜做出「對比」',
    task: '利用造形之間的差異，讓某種不同變得明顯。你可以從大小、色彩或造形開始。',
    initialState: { elements: [element('con-1', { x: 360 }), element('con-2', { x: 640 })] },
    validationSpec: { minimumElements: 3, minimumSizeDifference: 3, minimumHueDistance: 2, minimumLightnessDifference: 3, comparisonCoverage: 0.75 },
    diagnosticHints: {
      NO_CLEAR_CONTRAST: { observe: '第一眼看過去，哪一種「不同」最明顯？', think: '大小、色彩或造形之中，有沒有一種差異可以再清楚一點？', action: '選一種差異，把兩邊的不同拉得更明顯，再檢查看看。' },
      DIFFERENCE_TOO_SMALL: { observe: '看得出它們有一點不同，但這個差異第一眼就能發現嗎？', think: '如果想讓這個不同更有力量，可以把差距再拉開嗎？', action: '把你正在使用的大小或色彩差異再加強一些。' },
      TOO_MANY_UNRELATED_DIFFERENCES: { observe: '畫面裡有很多不同，但你最想讓大家看到的是哪一組差異？', think: '對比不是「全部都不一樣」，而是讓某個差異變得特別清楚。', action: '保留一個主要的比較關係，減少會搶走注意力的其他變化。' }
    },
    successFeedback: { general: '成功！畫面已形成明顯對比。', byMethod: { size: '成功！你利用明顯的大小差異形成了「對比」。', color: '成功！你利用明顯的色彩差異形成了「對比」。', shape: '成功！不同的造形特徵形成了清楚的「對比」。', multiple: '成功！你同時運用了不只一種差異，讓對比更加明顯。' } },
    discoveryFeedback: { size: '對比不是「越多不同越好」，而是讓某種差異變得清楚、有力量。', color: '對比不是「越多不同越好」，而是讓某種差異變得清楚、有力量。', shape: '對比不是「越多不同越好」，而是讓某種差異變得清楚、有力量。', multiple: '對比不是「越多不同越好」，而是讓某種差異變得清楚、有力量。' }
  }),
  formal('proportion', {
    title: '挑戰｜做出「比例」',
    task: '運用不同大小的造形，讓它們之間形成清楚的大小關係。怎麼排列，由你決定。',
    initialState: { elements: ['circle', 'square', 'triangle', 'rectangle', 'semicircle', 'circle'].map((shape, index) => element('pro-' + index, { shape, x: 150 + index * 140, y: index % 2 ? 380 : 220, proportion: 1 })) },
    validationSpec: { requiredRatioLevels: [1, 2, 3], ratioLogicalSizes: { 1: 40, 2: 80, 3: 120 }, minimumElements: 6 },
    diagnosticHints: {
      RATIO_LEVELS_INCOMPLETE: { observe: '看看畫面裡的大小，目前能看出幾種不同的尺度？', think: '如果想讓大小之間的關係更完整，還缺少哪一種尺度？', action: '試著使用目前還沒出現的比例大小，再檢查看看。' },
      RATIO_RELATION_TOO_WEAK: { observe: '畫面裡有大小差異，但它們之間的關係清楚嗎？', think: '試著比較小、中、大三種尺度，它們有沒有真正形成不同層級？', action: '利用固定比例尺標重新調整其中一些造形的大小。' },
      TOO_FEW_ELEMENTS: { observe: '目前的造形還不太容易讓人比較大小之間的關係。', think: '如果多一點可以互相比較的造形，比例會不會更清楚？', action: '再加入一些造形，讓不同尺度之間可以被比較。' }
    },
    successFeedback: { general: '成功！你利用不同尺度的造形，建立了清楚的「比例」關係。', byMethod: { ratio: '成功！你利用不同尺度的造形，建立了清楚的「比例」關係。' } },
    discoveryFeedback: { ratio: '比例看的是大小彼此之間的關係，不一定要按照小到大排列。' }
  })
]);

export const phase6cDefinitionsById = Object.freeze(Object.fromEntries(phase6cDefinitions.map((item) => [item.id, item])));
