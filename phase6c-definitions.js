import { experimentDefinitionsById } from './experiment-definitions.js';
import { normalizeAllowedTools } from './geometry/constrained-tools.js?v=gate4-six-step-1';

const overlapHint = Object.freeze({
  observe: '有些圖形完全疊在一起了，看起來像只剩下一個圖形。',
  think: '每個圖形都需要被看見，才會讓形式關係更清楚。',
  action: '試著把完全疊在一起的圖形移開一點，讓每個圖形都看得見。'
});


function formal(principleId, overrides) {
  const base = experimentDefinitionsById[`experiment-${principleId}`];
  return Object.freeze({
    ...base,
    ...overrides,
    initialState: Object.freeze({ ...base.initialState, ...overrides.initialState }),
    validationSpec: Object.freeze({ ...base.validationSpec, ...overrides.validationSpec }),
    diagnosticHints: Object.freeze({ ...overrides.diagnosticHints, EXCESSIVE_OVERLAP: overlapHint }),
    successFeedback: Object.freeze(overrides.successFeedback),
    discoveryFeedback: Object.freeze(overrides.discoveryFeedback),
    status: 'phase6c-formal'
  });
}

export const phase6cDefinitions = Object.freeze([
  formal('repetition', {
    title: '挑戰｜做出「反覆」',
    task: '設計一個單元，讓它反覆出現。過關：①至少 5 個單元 ②每個單元都一樣 ③每個造形都屬於某個單元',
    creationTips: '可以先用兩種造形組成一個單元，造形可以重疊；單元可以排成一列、兩列、圍成一圈，或自由散布。',
    initialState: { elements: [] },
    validationSpec: { minimumUnits: 5, unitPositionTolerance: 24, unitLinkGaps: [0, 10, 20, 30, 40], canvasWidth: 1000, canvasHeight: 600 },
    diagnosticHints: {
      NO_REPEAT_UNIT: { observe: '畫面裡還沒有單元。', think: '單元由兩種以上的造形組成。', action: '把兩種以上的造形組合在一起。' },
      NOT_GROUPED_INTO_UNITS: { observe: '造形已經反覆出現了，但還沒有組成單元。', think: '把幾個造形組合起來，就是一個單元。', action: '組成一個單元，再讓每個單元都一樣。' },
      NOT_ENOUGH_REPETITION: { observe: '單元已經反覆出現了，但數量還不夠。', think: '同一個單元至少要出現 5 次。', action: '複製單元，放到畫面其他地方。' },
      OUTSIDE_UNIT: { observe: '有造形不屬於任何單元。', think: '畫面裡每個造形，都要是某個單元的一部分。', action: '刪除多出來的造形，或把它加進單元裡。' },
      UNITS_TOUCHING: { observe: '有單元黏在一起了。', think: '單元和單元之間留一點空隙，才看得出每個單元。', action: '把黏在一起的單元分開一點。' },
      UNIT_MISSING_SHAPE: { observe: '有一個單元少了造形。', think: '每個單元的組成都要一樣。', action: '補上少掉的造形。' },
      UNIT_EXTRA_SHAPE: { observe: '有一個單元多了造形。', think: '每個單元的組成都要一樣。', action: '拿掉多出來的造形。' },
      UNIT_COLOR_SIZE_DIFFERENT: { observe: '有一個單元的顏色或大小不一樣。', think: '每個單元的顏色和大小都要一樣。', action: '調整那個單元的顏色或大小。' },
      UNIT_ARRANGEMENT_DIFFERENT: { observe: '有一個單元的排法不一樣。', think: '每個單元裡，造形的相對位置要一樣；整組轉方向或翻過來也算一樣。', action: '調整那個單元裡造形的位置或方向。' },
      UNIT_DIFFERENT: { observe: '有一組造形和其他單元不一樣。', think: '每個單元都要一樣。', action: '把那組造形改成和其他單元一樣。' }
    },
    successFeedback: { general: '成功！同一個單元反覆出現，形成了「反覆」。', byMethod: { unit: '成功！你讓同一個單元反覆出現，形成了「反覆」。' } },
    discoveryFeedback: { unit: '反覆不一定要排得整整齊齊；單元轉個方向，也還是同一個單元。' }
  }),
  formal('gradation', {
    title: '挑戰｜做出「漸層」',
    task: '用兩種變化做出 6 個階段的漸層。可以一路變大，也可以先變大再變小。',
    creationTips: '選兩種變化，例如大小和深淺，從第 1 級到第 6 級一路改變。',
    allowedTools: normalizeAllowedTools({ addShape: true, stepSize: true, color: true, stepLightness: true, position: true, duplicate: true, delete: true }),
    initialState: { elements: [] },
    validationSpec: { minimumStages: 6, minimumChannels: 2, minimumSizeRange: 2, minimumLightnessRange: 2, minimumHueRange: 2, maximumHueStep: 1, minimumSpacingRange: 60, canvasWidth: 1000, canvasHeight: 600 },
    diagnosticHints: {
      TOO_FEW_STAGES: { observe: '階段還不夠多。', think: '漸層要有 6 個階段。', action: '再增加造形，讓變化多走幾步。' },
      ONLY_ONE_CHANGE: { observe: '目前只有一種變化。', think: '漸層要同時有兩種變化。', action: '再加入第二種變化，例如深淺或間距。' },
      CHANGE_STOPS: { observe: '有一個地方的變化停住了。', think: '每一步都要繼續改變。', action: '找到停住的地方，讓它往同一個方向再變一級。' },
      HUE_JUMP: { observe: '有一個地方的顏色跳太遠了。', think: '色相漸層要沿著色相環一格一格走。', action: '換成相鄰的顏色。' },
      TOO_MANY_PEAKS: { observe: '變化起起伏伏好幾次。', think: '漸層只能有一座山；起伏好幾次比較像律動。', action: '只保留一次變大再變小，或一路改變。' },
      CHANGE_TOO_SMALL: { observe: '變化的差別太小了。', think: '頭尾兩端要看得出明顯不同。', action: '讓第一個和最後一個差多一點。' },
      NOT_ON_PATH: { observe: '有造形不在漸層的路線上。', think: '漸層裡的每個造形都是一個階段。', action: '把它排進路線，或刪除它。' },
      NO_CLEAR_PATH: { observe: '看不出造形的排列路線。', think: '漸層要讓變化一個接一個看下去。', action: '把造形排成一條線、斜線或弧線。' },
      NO_CLEAR_GRADATION: { observe: '還看不出一步一步的變化。', think: '選兩種變化，一步一步改變。', action: '從第 1 級到第 6 級慢慢調整。' }
    },
    successFeedback: { general: '成功！畫面已形成漸層。', byMethod: { multiple: '成功！你讓兩種變化一起一步一步改變，形成了「漸層」。' } },
    discoveryFeedback: { multiple: '漸層可以一路改變，也可以先變大再變小；只要只有一座山，就不會變成律動。' }
  }),
  formal('balance', {
    title: '挑戰｜做出「不對稱的均衡」',
    task: '調整造形的大小、數量和位置，讓整個畫面看起來穩定。左右不能一模一樣！試著用不同的大小、數量或位置取得平衡。',
    initialState: { elements: [], gridConfig: { enabled: false, visible: true, step: 20, axis: 'vertical' } },
    validationSpec: { balanceTolerance: 0.45, allowSymmetrical: false, allowAsymmetrical: true, centerDeadZone: 45, requireAsymmetry: true, mirrorPositionTolerance: 24, mirrorYTolerance: 24, mirrorSizeTolerance: 12 },
    diagnosticHints: {
      ONE_SIDE_EMPTY: { observe: '看看整張畫面，造形是不是都集中到同一邊了？', think: '如果希望整個畫面更穩定，另一邊需要出現什麼力量呢？', action: '試著把部分造形安排到另一側，再觀察整體的感覺。' },
      LEFT_HEAVY: { observe: '先別急著改。看著整張畫面，你覺得它比較像往哪一邊倒？', think: '想想看：圖形的大小、數量和離中心的距離，哪一項可能讓某一邊看起來比較重？', action: '試著調整較重一側的大小或位置，或調整另一側，再看看畫面有沒有站得更穩。' },
      RIGHT_HEAVY: { observe: '先別急著改。看著整張畫面，你覺得它比較像往哪一邊倒？', think: '想想看：圖形的大小、數量和離中心的距離，哪一項可能讓某一邊看起來比較重？', action: '試著調整較重一側的大小或位置，或調整另一側，再看看畫面有沒有站得更穩。' },
      TOO_CENTERED: { observe: '兩邊好像很接近，但造形是不是都擠在中間了？', think: '如果把一些造形拉開，還能不能保持穩定？', action: '試著拉開部分造形的位置，再檢查看看。' },
      ASYMMETRY_REQUIRED: { observe: '現在左右太像了！', think: '這一題要練習左右不一樣，但整體仍然穩定。', action: '試著改變一邊的大小、數量或位置，再讓畫面保持平衡。' }
    },
    successFeedback: { general: '成功！畫面已取得均衡。', byMethod: { symmetrical: '成功！你利用左右相似的安排，讓畫面取得了均衡。這是一種「對稱式均衡」。', asymmetrical: '成功！左右雖然不一樣，但你利用大小、數量或位置，讓畫面仍然保持穩定。' } },
    discoveryFeedback: { symmetrical: '對稱也是取得均衡的方法之一，但均衡不只有對稱。', asymmetrical: '均衡不代表左右一定相同。大小、數量和位置不同，也能讓畫面取得穩定。' }
  }),
  formal('rhythm', {
    title: '挑戰｜做出「律動」',
    task: '運用造形的位置、方向、大小或間距變化，讓視線在畫面中產生移動、起伏或前進的感覺。可以有規律，也可以不規律，怎麼安排由你決定。',
    initialState: { elements: [] },
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
    task: '做出對稱的畫面，用至少 4 種不同的造形、顏色、大小或方向。<br>左右、上下對稱要有 4 對互相對應的造形；十字對稱要有 2 組（每組上下左右 4 個）。',
    creationTips: '造形要對稱，色彩可以自由變化。中線上也可以放造形，但不算在 4 種裡。',
    allowedTools: normalizeAllowedTools({ addShape: true, size: true, color: true, position: true, rotation: true, duplicate: true, delete: true, grid: true }),
    initialState: { elements: [], selectedSymmetryMode: 'vertical', gridConfig: { enabled: true, visible: true, step: 20, axis: 'vertical' } },
    validationSpec: { allowedSymmetryModes: ['vertical', 'horizontal', 'cross'], axisX: 500, axisY: 300, gridStep: 20, positionTolerance: 1, minimumMirrorPairs: 4, minimumCrossOrbits: 2, minimumCombinations: 4, directionAwareShapes: true },
    diagnosticHints: {
      NO_SYMMETRY_PAIR: { observe: '有造形在對稱軸另一邊還找不到對應夥伴。', think: '沿著對稱軸對折，兩邊的造形要碰在一起。', action: '在另一邊放一個對應的造形。' },
      POSITION_MISMATCH: { observe: '兩邊有相同的造形，但位置對不上。', think: '兩邊離對稱軸的距離要一樣。', action: '利用方格調整位置。' },
      ATTRIBUTE_MISMATCH: { observe: '對應位置上的造形不一樣。', think: '造形、大小和方向都要互相對應；顏色可以不同。', action: '調整造形、大小或方向。' },
      CROSS_INCOMPLETE: { observe: '十字對稱還不完整。', think: '上下左右四個位置都要有相同的造形。', action: '補上還缺的方向。' },
      NOT_ENOUGH_SYMMETRY: { observe: '對應的造形還不夠多。', think: '左右或上下要 4 對，十字要 2 組。', action: '再多做幾對對應的造形。' },
      NOT_ENOUGH_VARIETY: { observe: '對稱已經做好了，但不同的種類還不夠多。', think: '造形、顏色、大小或方向有一項不同，就算不同種類；要有 4 種。', action: '改變其中一組的造形、顏色、大小或方向。' },
      AXIS_SHAPE_NOT_SYMMETRIC: { observe: '中線上的造形本身不對稱。', think: '放在中線上的造形，要自己左右（或上下）對稱。', action: '轉動它，或把它移開中線。' }
    },
    successFeedback: { general: '成功！造形已沿對稱軸彼此對應。', byMethod: { vertical: '成功！你讓造形沿著垂直中軸彼此對應，形成了左右對稱。', horizontal: '成功！你讓造形沿著水平中軸彼此對應，形成了上下對稱。', cross: '成功！你的構圖同時沿著水平與垂直方向彼此對應，形成了十字對稱。' } },
    discoveryFeedback: { vertical: '對稱不只有左右。改變對稱軸，也能形成上下或更多方向的對稱關係。', horizontal: '對稱不只有左右。改變對稱軸，也能形成上下或更多方向的對稱關係。', cross: '對稱不只有左右。改變對稱軸，也能形成上下或更多方向的對稱關係。' }
  }),
  formal('contrast', {
    title: '挑戰｜做出「對比」',
    task: '做出兩組對比強烈的圖形：大小要差很多，顏色也要差很多。至少 6 個圖形。',
    creationTips: '顏色可以選色環上距離很遠的，例如紅配藍、黃配紫。',
    initialState: { elements: [] },
    validationSpec: { minimumElements: 6, minimumGroupSize: 2, minimumSizeDifference: 3, minimumHueDistance: 4, minimumLightnessDistance: 3, groupCoverage: 1, comparisonCoverage: 0.8, canvasWidth: 1000, canvasHeight: 600 },
    diagnosticHints: {
      NO_CLEAR_CONTRAST: { observe: '還看不出兩組。', think: '對比要有兩組，大小和顏色都差很多。', action: '做一組大的、一組小的，顏色也選差很遠的。' },
      DIFFERENCE_TOO_SMALL: { observe: '兩組的差別還不夠明顯。', think: '大小和顏色都要一眼就看得出不同。', action: '把大小差距拉開，顏色選色環上距離很遠的。' },
      TOO_MANY_UNRELATED_DIFFERENCES: { observe: '畫面裡有太多不同。', think: '對比不是全部都不一樣，而是兩組清楚的差別。', action: '只留下兩組，其他的改成跟其中一組一樣。' },
      TOO_FEW_ELEMENTS: { observe: '圖形的數量還不夠。', think: '至少要 6 個圖形，分成兩組。', action: '再加幾個圖形到兩組裡。' },
      SIZE_CONTRAST_REQUIRED: { observe: '兩組的大小差不多。', think: '大小要差很多才看得出對比。', action: '讓一組更大、一組更小。' },
      COLOR_CONTRAST_REQUIRED: { observe: '兩組的顏色太接近了。', think: '顏色要選色環上距離很遠的。', action: '例如紅配藍、黃配紫。' },
      GROUP_TOO_SMALL: { observe: '有一組只有一個圖形。', think: '每組至少要 2 個圖形。', action: '再放一個一樣的圖形到那一組。' },
      OUTSIDE_GROUPS: { observe: '有圖形看不出屬於哪一組。', think: '每個圖形都要像其中一組。', action: '讓它的大小和顏色跟其中一組一樣。' }
    },
    successFeedback: { general: '成功！畫面已形成明顯對比。', byMethod: { size: '成功！你利用明顯的大小差異形成了「對比」。', color: '成功！你利用明顯的色彩差異形成了「對比」。', shape: '成功！不同的造形特徵形成了清楚的「對比」。', multiple: '成功！你同時運用了不只一種差異，讓對比更加明顯。' } },
    discoveryFeedback: { size: '對比不是「越多不同越好」，而是讓某種差異變得清楚、有力量。', color: '對比不是「越多不同越好」，而是讓某種差異變得清楚、有力量。', shape: '對比不是「越多不同越好」，而是讓某種差異變得清楚、有力量。', multiple: '對比不是「越多不同越好」，而是讓某種差異變得清楚、有力量。' }
  }),
  formal('proportion', {
    title: '挑戰｜做出「比例」',
    task: '運用不同大小的造形，讓它們之間形成清楚的大小關係。怎麼排列，由你決定。',
    initialState: { elements: [] },
    validationSpec: { requiredRatioLevels: [1, 2, 3], ratioLogicalSizes: { 1: 40, 2: 80, 3: 120 }, minimumElements: 6 },
    diagnosticHints: {
      RATIO_LEVELS_INCOMPLETE: { observe: '看看畫面裡的大小，目前能看出幾種不同的尺度？', think: '如果想讓大小之間的關係更完整，還缺少哪一種尺度？', action: '試著使用目前還沒出現的比例大小，再檢查看看。' },
      RATIO_RELATION_TOO_WEAK: { observe: '畫面裡有大小差異，但它們之間的關係清楚嗎？', think: '試著比較小、中、大三種尺度，它們有沒有真正形成不同層級？', action: '利用固定比例尺標重新調整其中一些造形的大小。' },
      TOO_FEW_ELEMENTS: { observe: '目前的造形還不太容易讓人比較大小之間的關係。', think: '如果多一點可以互相比較的造形，比例會不會更清楚？', action: '再加入一些造形，讓不同尺度之間可以被比較。' }
    },
    successFeedback: { general: '成功！你利用不同尺度的造形，建立了清楚的「比例」關係。', byMethod: { ratio: '成功！你利用不同尺度的造形，建立了清楚的「比例」關係。' } },
    discoveryFeedback: { ratio: '比例看的是大小彼此之間的關係，不一定要按照小到大排列。' }
  }),
  formal('unity', {
    title: '挑戰｜做出「統一」',
    task: '使用至少 7 個造形，讓大部分圖形有共同特色，同時保留一些看得見的變化。',
    initialState: { elements: [] },
    validationSpec: { minimumElements: 7, requiredUnityRatio: 0.857142857, minimumDirectionalElements: 6, allowedUnityModes: ['color', 'rotation', 'shapeFeature'] },
    diagnosticHints: {
      NO_CLEAR_UNITY: { observe: '看看整張畫面，這些造形有沒有共同的色彩、造形或方向？', think: '從共同色彩、共同造形或共同方向中選一種，哪一種最適合延伸到整張畫面？', action: '選一種共同特徵，讓更多元素彼此呼應。' },
      UNITY_TOO_WEAK: { observe: '有一些造形已經像一家人了，但共同特徵有延伸到主要元素嗎？', think: '共同色彩、共同造形或共同方向，只要選一種方法做得更清楚。', action: '把你選擇的共同特徵延伸到更多元素，再檢查看看。' },
      NO_VISIBLE_VARIATION: { observe: '這些圖形很一致，但目前看起來幾乎完全相同。', think: '保留共同特色的同時，還能加入哪一種看得見的變化？', action: '試著改變部分圖形的大小、造形、顏色或方向。' }
    },
    successFeedback: { general: '成功！畫面已形成統一。', byMethod: { color: '成功！共同的色彩讓不同造形看起來屬於同一個整體。', rotation: '成功！相似的方向讓畫面產生了一致感。', shapeFeature: '成功！共同的造形或造形特色，讓畫面形成了「統一」。', lineStyle: '成功！共同的線條特色讓畫面產生了一致感。', multiple: '成功！你用了不只一種共同特徵，讓整個畫面更有一致感。' } },
    discoveryFeedback: { general: '統一不是全部一模一樣，而是讓不同的元素之間找到共同點。', color: '統一不是全部一模一樣，而是讓不同的元素之間找到共同點。', rotation: '統一不是全部一模一樣，而是讓不同的元素之間找到共同點。', shapeFeature: '統一不是全部一模一樣，而是讓不同的元素之間找到共同點。', lineStyle: '統一不是全部一模一樣，而是讓不同的元素之間找到共同點。', multiple: '統一不是全部一模一樣，而是讓不同的元素之間找到共同點。' }
  }),
  formal('harmony', {
    title: '挑戰｜做出「調和」',
    task: '利用彼此接近、能互相呼應的色彩，讓畫面看起來協調。',
    initialState: { elements: [] },
    validationSpec: { minimumElements: 6, harmonyCoverage: 0.75, minimumLightnessLevels: 2, allowedHarmonyModes: ['sameHueLightness', 'neighborHue', 'mixed'] },
    diagnosticHints: {
      NO_CLEAR_HARMONY: { observe: '看看這些顏色，它們彼此有沒有「靠近」的感覺？', think: '可以從同色系的深淺，或色相環上相近的顏色開始找關係。', action: '選一個主要色系，再加入它的深淺變化或相近顏色。' },
      COLORS_TOO_FAR_APART: { observe: '有些顏色彼此差得很遠，哪一些最不像同一組？', think: '如果想讓色彩更協調，可以把距離很遠的顏色換成相近色嗎？', action: '保留一個主要色系，將其中差異最大的顏色換成它附近的顏色。' },
      HARMONY_TOO_WEAK: { observe: '已經有一些顏色開始互相呼應了，但整張畫面都有這種感覺嗎？', think: '相近色或同色系明度，選一種方法讓主要色彩彼此連在一起。', action: '把選擇的色彩關係延伸到更多造形，讓畫面的色彩彼此協調。' }
    },
    successFeedback: { general: '成功！畫面已形成調和。', byMethod: { sameHueLightness: '成功！你利用同色系的深淺變化，讓色彩彼此協調。', neighborHue: '成功！你利用相近的顏色，形成了柔和、協調的色彩關係。', mixed: '成功！你同時運用了相近色與深淺變化，讓色彩產生更豐富的調和。' } },
    discoveryFeedback: { general: '調和不只是一種顏色。相近的顏色，或同色系的深淺變化，也能彼此呼應。', sameHueLightness: '調和不只是一種顏色。相近的顏色，或同色系的深淺變化，也能彼此呼應。', neighborHue: '調和不只是一種顏色。相近的顏色，或同色系的深淺變化，也能彼此呼應。', mixed: '調和不只是一種顏色。相近的顏色，或同色系的深淺變化，也能彼此呼應。' }
  }),
  formal('simplicity', {
    title: '挑戰｜做出「單純」',
    task: '試著讓畫面變得更單純。你可以從「減少、整理、減少變化」三種方法開始，不一定每一種都要使用。',
    initialState: experimentDefinitionsById['experiment-simplicity'].initialState,
    validationSpec: { minimumElementReduction: 2, minimumVarietyReduction: 2, minimumOrganizationGain: 0.16, minimumNonCoreRemaining: 1, coreElementIds: experimentDefinitionsById['experiment-simplicity'].initialState.coreElementIds, coreProtection: true },
    diagnosticHints: {
      NOT_SIMPLIFIED: { observe: '比較一下現在和一開始，畫面真的變得比較簡單了嗎？', think: '你可以從「減少、整理、減少變化」三個方向想一想。', action: '試著刪掉一些不重要的元素、整理位置，或減少過多的顏色與大小變化。' },
      CORE_ELEMENT_MISSING: { observe: '最重要的元素需要留下來，再想想其他地方可以怎麼簡化。', think: '主要內容還完整嗎？哪些才是不必要的部分？', action: '保留最重要的元素，再從其他裝飾開始整理。' },
      TOO_MUCH_VARIETY: { observe: '元素可能變少了，但畫面裡還有很多不同的變化。', think: '除了刪除，也可以看看顏色、大小或排列是不是太複雜。', action: '試著減少一些不必要的色彩或大小變化。' },
      STILL_DISORGANIZED: { observe: '東西變少了，但畫面是不是還有一點散？', think: '單純不只是減少，也可以把剩下的元素整理得更清楚。', action: '試著重新安排位置，讓剩下的元素形成比較清楚的關係。' },
      OVER_REDUCED: { observe: '你已經減少很多了。單純不是全部刪掉，也要保留畫面的主要關係。', think: '除了核心，還需要留下哪些元素才能看出完整構圖？', action: '復原一些有助於構圖關係的元素，再整理其他部分。' }
    },
    successFeedback: { general: '成功！構圖已變得更單純。', byMethod: { reduce: '成功！你減少了不必要的元素，讓畫面變得更單純。', organize: '成功！你重新整理了元素的位置，讓畫面變得更清楚、單純。', simplifyVariety: '成功！你減少了過多的變化，讓畫面更有重點。', multiple: '成功！你用了不只一種方法，把複雜的構圖整理得更單純。' } },
    discoveryFeedback: { general: '單純不是全部刪掉，而是留下重要的、減少不必要的複雜。', reduce: '單純不是全部刪掉，而是留下重要的、減少不必要的複雜。', organize: '單純不是全部刪掉，而是留下重要的、減少不必要的複雜。', simplifyVariety: '單純不是全部刪掉，而是留下重要的、減少不必要的複雜。', multiple: '單純不是全部刪掉，而是留下重要的、減少不必要的複雜。' }
  })
]);

export const phase6cDefinitionsById = Object.freeze(Object.fromEntries(phase6cDefinitions.map((item) => [item.id, item])));
