import {
  HUE_IDS,
  LIGHTNESS_LEVELS,
  STEP_LEVELS,
  SIZE_LEVELS,
  SIZE_TO_LOGICAL
} from './config.js?v=gate4-contrast-2';

export const HUE_LABELS = Object.freeze({
  red: '紅', 'red-orange': '紅橙', orange: '橙', 'yellow-orange': '黃橙',
  yellow: '黃', 'yellow-green': '黃綠', green: '綠', 'blue-green': '藍綠',
  blue: '藍', 'blue-violet': '藍紫', violet: '紫', 'red-violet': '紅紫'
});

export const COLOR_PALETTE = Object.freeze({
  red: Object.freeze(['#7F302B', '#AD4137', '#D95A4B', '#E77F73', '#F0AAA2']),
  'red-orange': Object.freeze(['#803623', '#AD4A2D', '#D96538', '#E78662', '#F0AD91']),
  orange: Object.freeze(['#83401F', '#B25827', '#DC7832', '#E89A5D', '#F1BC8A']),
  'yellow-orange': Object.freeze(['#765016', '#A46E1C', '#CF9128', '#E1B04E', '#EDD083']),
  yellow: Object.freeze(['#756019', '#A8841F', '#D5AC2D', '#E6C755', '#F0DC8A']),
  'yellow-green': Object.freeze(['#52601D', '#708329', '#91A83B', '#AEC461', '#CAD98F']),
  green: Object.freeze(['#245B42', '#337B58', '#4F9D78', '#78B79A', '#A4D0BA']),
  'blue-green': Object.freeze(['#1E5B5B', '#287B78', '#3D9B95', '#6BB7B0', '#9ACFC9']),
  blue: Object.freeze(['#244D75', '#2F6494', '#3E78B2', '#6998C5', '#9AB8D6']),
  'blue-violet': Object.freeze(['#3D426F', '#525A94', '#6B74B3', '#8F96C8', '#B4B9DC']),
  violet: Object.freeze(['#573B6B', '#765092', '#9467B2', '#AE89C6', '#C9ACD9']),
  'red-violet': Object.freeze(['#6B385B', '#914B78', '#B46094', '#C985AD', '#DBADC8'])
});

export function getLogicalSize(sizeLevel) {
  if (!SIZE_LEVELS.includes(sizeLevel)) {
    throw new RangeError(`Invalid size level: ${sizeLevel}`);
  }
  return SIZE_TO_LOGICAL[sizeLevel];
}

export function getDisplayColor(hue, lightness) {
  if (!HUE_IDS.includes(hue) || !LIGHTNESS_LEVELS.includes(lightness)) {
    throw new RangeError(`Invalid palette value: ${hue}/${lightness}`);
  }
  return COLOR_PALETTE[hue][lightness - 1];
}

// Seven evenly spaced lightness steps per hue, used only by the gradation question.
// Steps 1, 4 and 7 are the existing darkest, middle and lightest colours.
export const STEP_COLOR_PALETTE = Object.freeze({
  'red': Object.freeze(['#7F302B', '#9D3B33', '#BB493E', '#D95A4B', '#E37366', '#EA8E83', '#F0AAA2']),
  'red-orange': Object.freeze(['#803623', '#9E432A', '#BB5331', '#D96538', '#E27B55', '#EA9372', '#F0AD91']),
  'orange': Object.freeze(['#83401F', '#A25024', '#C0632B', '#DC7832', '#E48F50', '#EBA56C', '#F1BC8A']),
  'yellow-orange': Object.freeze(['#765016', '#94641A', '#B27920', '#CF9128', '#DBA642', '#E5BB61', '#EDD083']),
  'yellow': Object.freeze(['#756019', '#97781D', '#B79124', '#D5AC2D', '#E0BE49', '#E9CE68', '#F0DC8A']),
  'yellow-green': Object.freeze(['#52601D', '#667725', '#7B8F2F', '#91A83B', '#A4BB55', '#B7CB71', '#CAD98F']),
  'green': Object.freeze(['#245B42', '#2E7051', '#3C8662', '#4F9D78', '#6BAE8F', '#87BFA5', '#A4D0BA']),
  'blue-green': Object.freeze(['#1E5B5B', '#25706E', '#2F8682', '#3D9B95', '#5DAEA7', '#7BBFB8', '#9ACFC9']),
  'blue': Object.freeze(['#244D75', '#2B5C8A', '#346B9E', '#3E78B2', '#5B8DBF', '#79A3CB', '#9AB8D6']),
  'blue-violet': Object.freeze(['#3D426F', '#4B5287', '#5A639E', '#6B74B3', '#838BC1', '#9BA2CF', '#B4B9DC']),
  'violet': Object.freeze(['#573B6B', '#6B4985', '#80589D', '#9467B2', '#A57EBF', '#B795CC', '#C9ACD9']),
  'red-violet': Object.freeze(['#6B385B', '#84456E', '#9D5281', '#B46094', '#C279A5', '#CF92B6', '#DBADC8'])
});

export function getStepColor(hue, stepLightness) {
  if (!HUE_IDS.includes(hue) || !STEP_LEVELS.includes(stepLightness)) {
    throw new RangeError(`Invalid step palette value: ${hue}/${stepLightness}`);
  }
  return STEP_COLOR_PALETTE[hue][stepLightness - 1];
}

export function getElementColor(element) {
  return element.stepLightness != null
    ? getStepColor(element.hue, element.stepLightness)
    : getDisplayColor(element.hue, element.lightness);
}
