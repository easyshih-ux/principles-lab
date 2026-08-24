import {
  HUE_IDS,
  LIGHTNESS_LEVELS,
  SIZE_LEVELS,
  SIZE_TO_LOGICAL
} from './config.js';

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
