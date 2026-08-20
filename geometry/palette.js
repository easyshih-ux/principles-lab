import {
  HUE_IDS,
  LIGHTNESS_LEVELS,
  SIZE_LEVELS,
  SIZE_TO_LOGICAL
} from './config.js';

export const HUE_LABELS = Object.freeze({
  red: '紅',
  orange: '橙',
  yellow: '黃',
  green: '綠',
  blue: '藍',
  purple: '紫'
});

export const COLOR_PALETTE = Object.freeze({
  red: Object.freeze(['#7F302B', '#AD4137', '#D95A4B', '#E77F73', '#F0AAA2']),
  orange: Object.freeze(['#83401F', '#B25827', '#DC7832', '#E89A5D', '#F1BC8A']),
  yellow: Object.freeze(['#756019', '#A8841F', '#D5AC2D', '#E6C755', '#F0DC8A']),
  green: Object.freeze(['#245B42', '#337B58', '#4F9D78', '#78B79A', '#A4D0BA']),
  blue: Object.freeze(['#244D75', '#2F6494', '#3E78B2', '#6998C5', '#9AB8D6']),
  purple: Object.freeze(['#573B6B', '#765092', '#9467B2', '#AE89C6', '#C9ACD9'])
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
