import {
  HUE_IDS,
  LIGHTNESS_LEVELS,
  STEP_LEVELS,
  SIZE_LEVELS,
  SIZE_TO_LOGICAL
} from './config.js?v=gate4c-rules-1';

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

// Six evenly spaced lightness steps per hue (from the darkest to the lightest of the five-level palette), used only by the gradation question.
// Steps 1, 4 and 7 are the existing darkest, middle and lightest colours.
export const STEP_COLOR_PALETTE = Object.freeze({
  'red': Object.freeze(['#7F302B', '#A33E35', '#C75043', '#DF695B', '#E9897D', '#F0AAA2']),
  'red-orange': Object.freeze(['#803623', '#A4462B', '#C75A34', '#DE724A', '#E88E6C', '#F0AD91']),
  'orange': Object.freeze(['#83401F', '#A85425', '#CB6B2E', '#E18645', '#EAA167', '#F1BC8A']),
  'yellow-orange': Object.freeze(['#765016', '#9A681B', '#BE8323', '#D69E38', '#E3B75B', '#EDD083']),
  'yellow': Object.freeze(['#756019', '#9D7D1E', '#C39C28', '#DCB73F', '#E7CB62', '#F0DC8A']),
  'yellow-green': Object.freeze(['#52601D', '#6A7C27', '#849934', '#9CB34B', '#B3C86C', '#CAD98F']),
  'green': Object.freeze(['#245B42', '#317454', '#448F6B', '#60A786', '#81BCA1', '#A4D0BA']),
  'blue-green': Object.freeze(['#1E5B5B', '#277472', '#358E8A', '#51A6A0', '#75BCB5', '#9ACFC9']),
  'blue': Object.freeze(['#244D75', '#2D5F8E', '#3870A6', '#5085BA', '#739FC9', '#9AB8D6']),
  'blue-violet': Object.freeze(['#3D426F', '#4E558C', '#616AA6', '#7982BB', '#969DCC', '#B4B9DC']),
  'violet': Object.freeze(['#573B6B', '#6F4C8A', '#885EA5', '#9E75BA', '#B390C9', '#C9ACD9']),
  'red-violet': Object.freeze(['#6B385B', '#894872', '#A65889', '#BC6F9E', '#CC8DB3', '#DBADC8'])
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
