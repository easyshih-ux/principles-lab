import { experimentValidatorIds } from './experiment-validators.js';
import { normalizeAllowedTools } from './geometry/constrained-tools.js';

const baseInitialState = () => ({
  elements: [],
  beforeState: null,
  generatorId: null,
  generated: false,
  lockedElementIds: [],
  nonDeletableElementIds: [],
  coreElementIds: []
});

const baseFeedback = (general) => ({ general, byMethod: {} });
const hints = (observe, think, action) => ({
  'conditions-missing': { observe, think, action }
});

function definition(values) {
  return Object.freeze({
    randomization: Object.freeze({ enabled: false, generatorId: null }),
    status: 'architecture-ready',
    validatorStatus: 'existing-pending-calibration',
    discoveryFeedback: Object.freeze({}),
    ...values,
    allowedTools: normalizeAllowedTools(values.allowedTools),
    initialState: Object.freeze({ ...baseInitialState(), ...values.initialState }),
    experimentOptions: Object.freeze(values.experimentOptions),
    validationSpec: Object.freeze(values.validationSpec),
    diagnosticHints: Object.freeze(values.diagnosticHints),
    successFeedback: Object.freeze(values.successFeedback)
  });
}

export const experimentDefinitions = Object.freeze([
  definition({
    id: 'experiment-repetition', principleId: 'repetition', title: '反覆實驗',
    task: '運用有限的幾何元素，讓某個造形或組合再次出現。',
    studentConcept: '讓某個造形或組合有再次出現的感覺。',
    allowedTools: { shape: true, size: true, color: true, position: true, rotation: true, duplicate: true, delete: true },
    experimentOptions: { repeatUnitModes: ['single', 'group'], groupingCapability: true },
    validatorId: experimentValidatorIds.repetition,
    validationSpec: { minimumOccurrences: 3, signatureFields: ['shape'], allowGroupUnit: true },
    diagnosticHints: hints('看看哪個造形或組合有再次出現。', '重複的單位是否足以形成規律？', '複製一個相同單位，再調整它的位置。'),
    successFeedback: baseFeedback('你已讓造形產生清楚的再次出現。')
  }),
  definition({
    id: 'experiment-gradation', principleId: 'gradation', title: '漸層實驗',
    task: '讓畫面中的元素產生一步一步改變的感覺。',
    studentConcept: '讓畫面產生一步一步改變的感覺。',
    allowedTools: { size: true, color: true, position: true },
    experimentOptions: { gradationModes: ['size', 'lightness', 'spacing'] },
    validatorId: experimentValidatorIds.gradation,
    validationSpec: { minimumStages: 4, allowedModes: ['size', 'lightness', 'spacing'], allowAscending: true, allowDescending: true, requireEqualStep: false },
    diagnosticHints: hints('觀察變化是否能順著一個方向看下去。', '相鄰元素之間有持續改變嗎？', '選定大小、深淺或間距其中一種，再依順序調整。'),
    successFeedback: { general: '你已形成清楚而連續的變化。', byMethod: { size: '大小形成漸層。', lightness: '深淺形成漸層。', spacing: '間距形成漸層。' } },
    discoveryFeedback: { multiple: '你同時使用了不只一種漸層方法。' }
  }),
  definition({
    id: 'experiment-symmetry', principleId: 'symmetry', title: '對稱實驗',
    task: '讓造形沿著選定的對稱軸彼此對應。',
    studentConcept: '讓造形沿對稱軸彼此對應。',
    allowedTools: { shape: true, size: true, position: true, rotation: true, duplicate: true, grid: true },
    initialState: { selectedSymmetryMode: 'vertical', gridConfig: { enabled: true, visible: true, step: 20, axis: 'vertical' } },
    experimentOptions: { symmetryModes: ['vertical', 'horizontal', 'cross'] },
    validatorId: experimentValidatorIds.symmetry,
    validationSpec: { allowedSymmetryModes: ['vertical', 'horizontal', 'cross'], gridStep: 20, positionTolerance: 1, directionAwareShapes: true },
    diagnosticHints: hints('看看軸線兩側的造形是否互相呼應。', '每個元素在另一側都有對應的位置嗎？', '利用格線比較兩側到軸線的距離。'),
    successFeedback: { general: '造形已沿對稱軸形成對應。', byMethod: { vertical: '形成垂直對稱。', horizontal: '形成水平對稱。', cross: '形成十字對稱。' } }
  }),
  definition({
    id: 'experiment-balance', principleId: 'balance', title: '均衡實驗',
    task: '安排不同元素的位置與大小，讓整個畫面看起來穩定。',
    studentConcept: '讓整個畫面看起來穩定。',
    allowedTools: { shape: true, size: true, position: true, duplicate: true, delete: true },
    experimentOptions: { balanceModes: ['symmetrical', 'asymmetrical'], symmetryClassification: true },
    validatorId: experimentValidatorIds.balance,
    validationSpec: { balanceTolerance: 0.2, allowSymmetrical: true, allowAsymmetrical: true, centerDeadZone: 20 },
    diagnosticHints: hints('退一步看看畫面左右的視覺重量。', '元素雖然不同，整體仍然穩定嗎？', '移動或調整一側的元素，讓兩邊更穩定。'),
    successFeedback: baseFeedback('不同元素已形成穩定的視覺重量。')
  }),
  definition({
    id: 'experiment-contrast', principleId: 'contrast', title: '對比實驗',
    task: '選擇一種方式，讓元素之間的差異變得明顯。',
    studentConcept: '讓某一種差異變得明顯。',
    allowedTools: { shape: true, size: true, color: true, position: true },
    experimentOptions: { contrastModes: ['size', 'color', 'shape'] },
    validatorId: experimentValidatorIds.contrast,
    validationSpec: { allowedContrastModes: ['size', 'color', 'shape'], minimumSizeDifference: 3, colorContrastPairs: [['red', 'green'], ['orange', 'blue'], ['yellow', 'violet']], shapeContrastMetadata: true },
    diagnosticHints: hints('第一眼最明顯的差異是什麼？', '你選擇的對比方式夠清楚嗎？', '加強大小、色彩或形狀其中一種差異。'),
    successFeedback: { general: '畫面已形成明顯差異。', byMethod: { size: '大小形成對比。', color: '色彩形成對比。', shape: '形狀形成對比。' } }
  }),
  definition({
    id: 'experiment-rhythm', principleId: 'rhythm', title: '律動實驗',
    task: '排列元素，讓視線產生移動、起伏或前進的感覺。',
    studentConcept: '讓視線產生移動、起伏或前進的感覺。',
    allowedTools: { shape: true, size: true, position: true, rotation: true, duplicate: true },
    experimentOptions: { motionChannels: ['position', 'rotation', 'size', 'spacing', 'mixed'] },
    validatorId: experimentValidatorIds.rhythm,
    validationSpec: { allowedMotionChannels: ['position', 'rotation', 'size', 'spacing', 'mixed'], minimumVisualChange: 2, allowRegular: true, allowIrregular: true, repetitionRequired: false },
    diagnosticHints: hints('沿著元素排列看，視線有移動的方向嗎？', '畫面是否有起伏或前進的變化？', '調整位置、方向或大小，讓視線能連續移動。'),
    successFeedback: baseFeedback('元素的變化已帶動視線前進。')
  }),
  definition({
    id: 'experiment-proportion', principleId: 'proportion', title: '比例實驗',
    task: '運用固定的大小級距，建立可辨識的大小關係。',
    studentConcept: '讓大小之間形成可辨識的關係。',
    allowedTools: { shape: true, ratioSize: true, position: true, duplicate: true, delete: true },
    experimentOptions: { ratioLevels: [1, 2, 3] },
    validatorId: experimentValidatorIds.proportion,
    validationSpec: { requiredRatioLevels: [1, 2, 3], minimumElements: 6 },
    diagnosticHints: hints('看看三種大小是否都出現在畫面中。', '大小之間是否形成清楚的關係？', '使用固定的三階比例大小各安排一些元素。'),
    successFeedback: baseFeedback('元素之間已形成清楚的比例關係。')
  }),
  definition({
    id: 'experiment-unity', principleId: 'unity', title: '統一實驗',
    task: '安排不同造形，讓它們因共同特徵看起來像同一家族。',
    studentConcept: '讓不同造形看起來像同一家族。',
    allowedTools: { shape: true, color: true, position: true, rotation: true, duplicate: true },
    experimentOptions: { unityModes: ['color', 'rotation', 'shapeFeature', 'lineStyle'] },
    validatorId: experimentValidatorIds.unity,
    validationSpec: { allowedUnityModes: ['color', 'rotation', 'shapeFeature', 'lineStyle'], requiredUnityRatio: 0.75 },
    diagnosticHints: hints('不同造形之間有什麼共同特徵？', '共同特徵是否足以讓它們看成一組？', '統一大部分元素的色彩、方向或造形特徵。'),
    successFeedback: { general: '不同造形已因共同特徵形成一致感。', byMethod: { color: '共同色彩形成統一。', rotation: '共同方向形成統一。', shapeFeature: '共同造形特徵形成統一。', lineStyle: '共同線條特徵形成統一。' } }
  }),
  definition({
    id: 'experiment-harmony', principleId: 'harmony', title: '調和實驗',
    task: '搭配不同顏色，讓它們彼此接近或協調。',
    studentConcept: '讓不同顏色彼此搭配、協調。',
    allowedTools: { shape: true, color: true, size: true, position: true, duplicate: true },
    experimentOptions: { harmonyModes: ['sameHueLightness', 'neighborHue', 'mixed'] },
    validatorId: experimentValidatorIds.harmony,
    validationSpec: { allowedHarmonyModes: ['sameHueLightness', 'neighborHue', 'mixed'], minimumLightnessLevels: 3, neighborHueDistance: 1 },
    diagnosticHints: hints('看看畫面中的顏色彼此接近嗎？', '色彩之間有共同或相鄰的關係嗎？', '選擇同色相不同深淺，或色相環上相鄰的顏色。'),
    successFeedback: { general: '不同顏色已產生協調感。', byMethod: { sameHueLightness: '同色相的深淺形成調和。', neighborHue: '相近色形成調和。', mixed: '多種相近關係形成調和。' } }
  }),
  definition({
    id: 'experiment-simplicity', principleId: 'simplicity', title: '單純實驗',
    task: '保留重要部分，減少不必要的複雜。',
    studentConcept: '保留重要部分，減少不必要的複雜。',
    allowedTools: { position: true, size: true, color: true, delete: true },
    initialState: { beforeState: [], coreElementIds: [], simplificationMethods: [] },
    experimentOptions: { simplificationMethods: ['reduce', 'organize', 'simplifyVariety'] },
    validatorId: experimentValidatorIds.simplicity,
    validationSpec: { complexityWeights: { element: 1, color: 1, shape: 1, decoration: 1 }, minimumSimplification: 1, coreProtection: true },
    diagnosticHints: hints('主要內容還清楚嗎？畫面中還有哪些多餘部分？', '刪除的是否是不必要裝飾，而不是核心？', '保留核心元素，再減少裝飾或整理種類。'),
    successFeedback: baseFeedback('畫面已變得簡潔明確，主要內容仍被保留。')
  })
]);

export const experimentDefinitionsById = Object.freeze(Object.fromEntries(
  experimentDefinitions.map((item) => [item.id, item])
));

export function getExperimentDefinition(experimentId) {
  const definition = experimentDefinitionsById[experimentId];
  if (!definition) throw new Error(`Unknown experiment definition: ${experimentId}`);
  return definition;
}
