import { getLogicalSize } from './geometry/palette.js?v=gate4c-endfix-1';
import { areNeighborHues, getShapeMetadata, HUE_FAMILIES } from './geometry/constrained-tools.js?v=gate4c-endfix-1';
import { auditComposition } from './composition-audit.js';

function response(passed, code, metrics, detectedMethods = []) {
  const fulfilledConditions = passed ? ['指定形式原理已成立'] : [];
  const missingConditions = passed ? [] : ['構圖仍需要調整'];
  return {
    passed, isValid: passed, code: passed ? 'valid' : code,
    primaryDiagnosticCode: passed ? 'valid' : code,
    fulfilledConditions, missingConditions,
    feedback: passed ? ['✓ 指定形式原理已成立'] : ['△ 構圖仍需要調整'],
    metrics, detectedMethods
  };
}

// Gate 4 repetition: students design a unit (two or more different shapes,
// overlapping allowed) and repeat it at least five times. Every unit must have
// the same shapes, colours, sizes and arrangement (turning or flipping the
// whole unit still counts), and every shape on the canvas must belong to a unit.
const UNIT_ROTATION_PERIOD = Object.freeze({ circle: 0, square: 90, rectangle: 180, line: 180, triangle: 360, semicircle: 360 });
const UNIT_SHAPE_LABELS = Object.freeze({ circle: '圓形', square: '正方形', triangle: '三角形', rectangle: '長方形', semicircle: '半圓', line: '線條' });
const UNIT_HUE_LABELS = Object.freeze({
  red: '紅色', 'red-orange': '紅橙色', orange: '橙色', 'yellow-orange': '橘色', yellow: '黃色', 'yellow-green': '黃綠色',
  green: '綠色', 'blue-green': '藍綠色', blue: '藍色', 'blue-violet': '藍紫色', violet: '紫色', 'red-violet': '紅紫色'
});
const UNIT_TRANSFORMS = Object.freeze([0, 45, 90, 135, 180, 225, 270, 315].flatMap((angle) => [{ angle, flip: false }, { angle, flip: true }]));
const unitKind = (item) => `${item.shape}|${item.size}|${item.hue}|${item.lightness}`;
const unitPeriod = (item) => UNIT_ROTATION_PERIOD[item.shape] ?? 360;
const unitVisibleRotation = (item, rotation = item.rotation ?? 0) => {
  const period = unitPeriod(item);
  return period === 0 ? null : ((rotation % period) + period) % period;
};
const unitLook = (item) => `${unitKind(item)}@${unitVisibleRotation(item)}`;
function unitGap(first, second) {
  const radius = (item) => getLogicalSize(item.size) / 2;
  return Math.hypot(second.x - first.x, second.y - first.y) - radius(first) - radius(second);
}
function clustersAt(elements, linkGap) {
  const parent = new Map(elements.map((item) => [item.id, item.id]));
  const find = (id) => (parent.get(id) === id ? id : find(parent.get(id)));
  for (let i = 0; i < elements.length; i += 1) {
    for (let j = i + 1; j < elements.length; j += 1) {
      if (unitGap(elements[i], elements[j]) <= linkGap) parent.set(find(elements[i].id), find(elements[j].id));
    }
  }
  const groups = new Map();
  elements.forEach((item) => { const root = find(item.id); groups.set(root, [...(groups.get(root) ?? []), item]); });
  return [...groups.values()];
}
const centroid = (items) => ({ x: items.reduce((sum, item) => sum + item.x, 0) / items.length, y: items.reduce((sum, item) => sum + item.y, 0) / items.length });
function sameUnit(template, candidate, tolerance) {
  if (template.length !== candidate.length) return false;
  const templateCenter = centroid(template);
  const candidateCenter = centroid(candidate);
  return UNIT_TRANSFORMS.some(({ angle, flip }) => {
    const radians = (angle * Math.PI) / 180;
    const used = new Set();
    return template.every((item) => {
      const dx = (flip ? -1 : 1) * (item.x - templateCenter.x);
      const dy = item.y - templateCenter.y;
      const expected = { x: candidateCenter.x + dx * Math.cos(radians) - dy * Math.sin(radians), y: candidateCenter.y + dx * Math.sin(radians) + dy * Math.cos(radians) };
      const rotation = unitVisibleRotation(item, (flip ? -(item.rotation ?? 0) : (item.rotation ?? 0)) + angle);
      const match = candidate.find((other) => !used.has(other.id) && unitKind(other) === unitKind(item)
        && unitVisibleRotation(other) === rotation
        && Math.hypot(other.x - expected.x, other.y - expected.y) <= tolerance);
      if (!match) return false;
      used.add(match.id);
      return true;
    });
  });
}
function unitClasses(clusters, tolerance) {
  const classes = [];
  for (const cluster of clusters) {
    const home = classes.find((group) => sameUnit(group[0], cluster, tolerance));
    if (home) home.push(cluster); else classes.push([cluster]);
  }
  return classes;
}
const isUnitCandidate = (cluster) => new Set(cluster.map(unitLook)).size >= 2;
function unitPosition(point, spec) {
  const width = spec.canvasWidth ?? 1000;
  const height = spec.canvasHeight ?? 600;
  const column = point.x < width / 3 ? 0 : point.x > (width * 2) / 3 ? 2 : 1;
  const row = point.y < height / 3 ? 0 : point.y > (height * 2) / 3 ? 2 : 1;
  return [['左上角', '上方', '右上角'], ['左邊', '中間', '右邊'], ['左下角', '下方', '右下角']][row][column];
}
function unitShapeName(item, elements) {
  const sameLook = elements.filter((other) => other.shape === item.shape && other.hue === item.hue);
  const sizeWord = new Set(sameLook.map((other) => other.size)).size > 1 ? (item.size >= 4 ? '大' : item.size <= 2 ? '小' : '中型') : '';
  const lightWord = item.lightness <= 2 ? '深' : item.lightness >= 4 ? '淺' : '';
  return `${sizeWord}${lightWord}${UNIT_HUE_LABELS[item.hue] ?? ''}${UNIT_SHAPE_LABELS[item.shape] ?? '造形'}`;
}
function kindDifference(template, cluster) {
  const remaining = [...cluster];
  const missing = [];
  template.forEach((item) => {
    const index = remaining.findIndex((other) => unitKind(other) === unitKind(item));
    if (index >= 0) remaining.splice(index, 1); else missing.push(item);
  });
  return { missing, extra: remaining };
}
const listNames = (items, elements) => [...new Set(items.map((item) => unitShapeName(item, elements)))].join('和');

export function validateFormalRepetition({ elements = [], spec = {} }) {
  const requiredUnits = spec.minimumUnits ?? 5;
  const tolerance = spec.unitPositionTolerance ?? 24;
  const linkGaps = spec.unitLinkGaps ?? [0, 10, 20, 30, 40];
  const layouts = linkGaps.map((linkGap) => {
    const clusters = clustersAt(elements, linkGap);
    const classes = unitClasses(clusters, tolerance).sort((a, b) => b.length - a.length);
    const main = classes.find((group) => isUnitCandidate(group[0])) ?? null;
    return { linkGap, clusters, classes, main };
  });
  const passing = layouts.find(({ clusters, classes, main }) => main && classes.length === 1 && main.length === clusters.length && main.length >= requiredUnits);
  const best = passing ?? [...layouts].sort((a, b) => (b.main?.length ?? 0) - (a.main?.length ?? 0) || a.linkGap - b.linkGap)[0];
  const metrics = { requiredUnits, unitCount: best?.main?.length ?? 0, unitSize: best?.main?.[0]?.length ?? 0, linkGap: best?.linkGap ?? null, clusterCount: best?.clusters.length ?? 0, elementCount: elements.length };
  if (passing) return response(true, 'valid', metrics, ['unit']);
  const fail = (code, studentDetail) => ({ ...response(false, code, metrics), studentDetail });
  const where = (items) => unitPosition(centroid(items), spec);
  const name = (item) => unitShapeName(item, elements);

  if (!elements.length) return fail('NO_REPEAT_UNIT', '先設計一個單元：把兩種以上的造形組合在一起。');
  const { clusters, main } = best;
  if (!main || main.length < 2) {
    const candidates = clusters.filter(isUnitCandidate);
    if (candidates.length === 1 && clusters.length === 1 && candidates[0].length >= 4
      && [...new Set(candidates[0].map(unitLook))].every((look) => candidates[0].filter((item) => unitLook(item) === look).length >= 2)) {
      return fail('UNITS_TOUCHING', '單元和單元黏在一起了，看不出每個單元在哪裡。在單元和單元之間留一點空隙。');
    }
    if (main && main.length === 1 && clusters.length === 1) return fail('NOT_ENOUGH_REPETITION', `目前有 1 個單元，再做 ${requiredUnits - 1} 個就完成了。`);
    const looks = elements.map(unitLook);
    if (looks.some((look, index) => looks.indexOf(look) !== index)) return fail('NOT_GROUPED_INTO_UNITS', '你的造形已經反覆出現了！下一步：把它們組成一個單元，讓每個單元都一樣，就能完成這一關。');
    return fail('NO_REPEAT_UNIT', '先設計一個單元：把兩種以上的造形組合在一起，再讓這個單元反覆出現。');
  }
  const template = main[0];
  const others = clusters.filter((cluster) => !main.includes(cluster));
  const single = others.find((cluster) => cluster.length === 1);
  if (single) return fail('OUTSIDE_UNIT', `${where(single)}有一個${name(single[0])}不屬於任何單元。可以刪除它，或把它加進單元裡。`);
  const merged = others.find((cluster) => cluster.length >= template.length * 2 && kindDifference(template, cluster).missing.length === 0);
  if (merged) return fail('UNITS_TOUCHING', `${where(merged)}有單元黏在一起了。在單元和單元之間留一點空隙，讓每個單元都看得出來。`);
  for (const cluster of others) {
    const { missing, extra } = kindDifference(template, cluster);
    if (missing.length && !extra.length) return fail('UNIT_MISSING_SHAPE', `${where(cluster)}有一個單元少了${listNames(missing, elements)}。補上之後，讓它和其他單元一樣。`);
    if (extra.length && !missing.length) return fail('UNIT_EXTRA_SHAPE', `${where(cluster)}有一個單元多了${listNames(extra, elements)}。拿掉它，讓這個單元和其他單元一樣。`);
  }
  const shapesOnly = (items) => items.map((item) => item.shape).sort().join('+');
  for (const cluster of others) {
    if (shapesOnly(cluster) === shapesOnly(template) && kindDifference(template, cluster).missing.length) {
      return fail('UNIT_COLOR_SIZE_DIFFERENT', `${where(cluster)}那個單元的顏色或大小，和其他單元不一樣。調整之後，讓它和其他單元一樣。`);
    }
    if (!kindDifference(template, cluster).missing.length) {
      return fail('UNIT_ARRANGEMENT_DIFFERENT', `${where(cluster)}那個單元的排法和其他單元不一樣。試著排得和其他單元一樣；整組轉方向或翻過來都可以。`);
    }
  }
  if (others.length) return fail('UNIT_DIFFERENT', `${where(others[0])}那組造形和其他單元不一樣。試著把它改成和其他單元一樣。`);
  return fail('NOT_ENOUGH_REPETITION', `目前有 ${main.length} 個單元，再做 ${requiredUnits - main.length} 個就完成了。`);
}

function range(values) {
  return values.length ? Math.max(...values) - Math.min(...values) : 0;
}

// Gate 4 gradation: at least six stages (counted by position along the
// arrangement) with at least two changes happening together. Each change may
// run one way, or rise then fall (one peak) / fall then rise; more ups and downs
// are rhythm, not gradation. Any path works: row, column, diagonal, arc, S-curve,
// or a ring that can be cut somewhere into a valid gradation. No decorations.
const GRADATION_CHANNEL_LABELS = Object.freeze({ size: '大小', lightness: '深淺', hue: '色相', spacing: '間距' });
const GRADATION_SHAPE_LABELS = Object.freeze({ circle: '圓形', square: '正方形', triangle: '三角形', rectangle: '長方形', semicircle: '半圓', line: '線條' });
const GRADATION_HUE_LABELS = Object.freeze({
  red: '紅色', 'red-orange': '紅橙色', orange: '橙色', 'yellow-orange': '黃橙色', yellow: '黃色', 'yellow-green': '黃綠色',
  green: '綠色', 'blue-green': '藍綠色', blue: '藍色', 'blue-violet': '藍紫色', violet: '紫色', 'red-violet': '紅紫色'
});
const gradationSize = (item) => item.stepSize ?? item.size;
const gradationLightness = (item) => item.stepLightness ?? item.lightness;
const gradationRadius = (item) => (Number.isFinite(item.logicalSize) ? item.logicalSize : getLogicalSize(item.size)) / 2;
const pointDistance = (first, second) => Math.hypot(second.x - first.x, second.y - first.y);

function greedyPath(elements, start) {
  const path = [start];
  const left = new Set(elements.filter((item) => item !== start));
  while (left.size) {
    const last = path.at(-1);
    const next = [...left].sort((a, b) => pointDistance(last, a) - pointDistance(last, b))[0];
    path.push(next); left.delete(next);
  }
  return path;
}
// A walk is a believable line when it never suddenly hops much further than the step before
// (a stray decoration) and never makes a hairpin turn (shapes scattered around the canvas).
function smoothWalk(path) {
  const steps = path.slice(1).map((item, index) => pointDistance(path[index], item));
  for (let index = 1; index < steps.length; index += 1) {
    const ratio = Math.max(steps[index], 1) / Math.max(steps[index - 1], 1);
    if (ratio > 2.6 || ratio < 1 / 2.6) return false;
    const [a, b, c] = [path[index - 1], path[index], path[index + 1]];
    const cosine = ((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)) / (Math.max(steps[index - 1], 1) * Math.max(steps[index], 1));
    if (cosine < -0.2) return false;
  }
  return true;
}
function plausiblePaths(elements) {
  const seen = new Set();
  const paths = [];
  for (const start of elements) {
    const path = greedyPath(elements, start);
    const steps = path.slice(1).map((item, index) => pointDistance(path[index], item));
    if (!smoothWalk(path)) continue;
    const key = path.map((item) => item.id).join('>');
    const reverse = [...path].reverse().map((item) => item.id).join('>');
    if (seen.has(key) || seen.has(reverse)) continue;
    seen.add(key); paths.push(path);
  }
  // Keep only the shortest walks: a walk that doubles back is never the arrangement a student sees.
  const lengthOf = (path) => path.slice(1).reduce((sum, item, index) => sum + pointDistance(path[index], item), 0);
  const shortest = Math.min(...paths.map(lengthOf));
  paths.splice(0, paths.length, ...paths.filter((path) => lengthOf(path) <= shortest * 1.1 + 1));
  const ring = paths.length > 0 && (() => {
    const path = paths[0];
    const steps = path.slice(1).map((item, index) => pointDistance(path[index], item));
    return elements.length >= 5 && pointDistance(path[0], path.at(-1)) <= Math.max(...steps) * 1.5;
  })();
  return { paths, ring };
}

// One change along the path: every step must move (no pauses), and the direction may turn at most once.
function channelShape(values, { hue = false, maximumHueStep = 1 } = {}) {
  let steps;
  if (hue) {
    const count = HUE_FAMILIES.length;
    const indexes = values.map((value) => HUE_FAMILIES.indexOf(value));
    if (indexes.some((index) => index < 0)) return { changing: false };
    steps = indexes.slice(1).map((index, position) => (((index - indexes[position]) + count / 2) % count + count) % count - count / 2);
  } else {
    steps = values.slice(1).map((value, index) => value - values[index]);
  }
  const changing = steps.some((step) => step !== 0);
  const pauseAt = steps.findIndex((step) => step === 0);
  const jumpAt = hue ? steps.findIndex((step) => Math.abs(step) > maximumHueStep) : -1;
  const signs = steps.map(Math.sign).filter(Boolean);
  const turns = signs.filter((sign, index) => index > 0 && sign !== signs[index - 1]).length;
  const cumulative = steps.reduce((positions, step) => [...positions, positions.at(-1) + step], [0]);
  return { changing, steps, pauseAt, jumpAt, turns, range: range(hue ? cumulative : values), valid: changing && pauseAt < 0 && jumpAt < 0 && turns <= 1 };
}

function evaluatePath(path, spec) {
  const thresholds = { size: spec.minimumSizeRange ?? 2, lightness: spec.minimumLightnessRange ?? 2, hue: spec.minimumHueRange ?? 2, spacing: spec.minimumSpacingRange ?? 60 };
  const channels = {
    size: channelShape(path.map(gradationSize)),
    lightness: channelShape(path.map(gradationLightness)),
    hue: channelShape(path.map((item) => item.hueFamily ?? item.hue), { hue: true, maximumHueStep: spec.maximumHueStep ?? 1 })
  };
  const centres = path.slice(1).map((item, index) => pointDistance(path[index], item));
  const gaps = path.slice(1).map((item, index) => centres[index] - gradationRadius(item) - gradationRadius(path[index]));
  // Spacing is read in grid-sized steps so small differences from placing shapes by hand are ignored.
  const centreShape = channelShape(centres.map((value) => Math.round(value / 20)));
  const gapShape = channelShape(gaps.map((value) => Math.round(value / 20)));
  const disagreeAt = centreShape.steps.findIndex((step, index) => Math.sign(step) !== Math.sign(gapShape.steps[index]));
  // Spacing counts only when the gaps between shapes really change, so resizing alone never counts twice.
  channels.spacing = { ...centreShape, changing: centreShape.changing && gapShape.changing && range(centres) >= (spec.minimumSpacingRange ?? 60), disagreeAt, valid: centreShape.valid && gapShape.valid && disagreeAt < 0, range: range(centres) };
  for (const [name, channel] of Object.entries(channels)) channel.passed = channel.valid && channel.range >= thresholds[name];
  const passed = Object.entries(channels).filter(([, channel]) => channel.passed).map(([name]) => name);
  return { path, channels, passed };
}

function describeShape(item) {
  return `${GRADATION_HUE_LABELS[item.hueFamily ?? item.hue] ?? ''}${GRADATION_SHAPE_LABELS[item.shape] ?? '造形'}`;
}
function positionName(item, spec) {
  const width = spec.canvasWidth ?? 1000; const height = spec.canvasHeight ?? 600;
  const column = item.x < width / 3 ? 0 : item.x > (width * 2) / 3 ? 2 : 1;
  const row = item.y < height / 3 ? 0 : item.y > (height * 2) / 3 ? 2 : 1;
  return [['左上角', '上方', '右上角'], ['左邊', '中間', '右邊'], ['左下角', '下方', '右下角']][row][column];
}
// Count stages from the end a student would read first, and name that end.
function orientPath(path) {
  const [first, last] = [path[0], path.at(-1)];
  const dx = last.x - first.x; const dy = last.y - first.y;
  if (Math.abs(dx) >= Math.abs(dy) * 2) return dx >= 0 ? { path, from: '左邊' } : { path: [...path].reverse(), from: '左邊' };
  if (Math.abs(dy) >= Math.abs(dx) * 2) return dy >= 0 ? { path, from: '上面' } : { path: [...path].reverse(), from: '上面' };
  const start = first.x <= last.x ? first : last;
  const ordered = start === first ? path : [...path].reverse();
  const end = ordered.at(-1);
  return { path: ordered, from: `${start.y <= end.y ? '左上' : '左下'}那一端` };
}

export function validateFormalGradation({ elements = [], spec = {} }) {
  const minimumStages = spec.minimumStages ?? 6;
  const requiredChannels = spec.minimumChannels ?? 2;
  const metrics = { stageCount: elements.length, minimumStages, requiredChannels };
  const fail = (code, studentDetail, extra = {}) => ({ ...response(false, code, { ...metrics, ...extra }), studentDetail });
  if (!elements.length) return fail('TOO_FEW_STAGES', '先放入造形，再讓它們一個接一個慢慢改變。');
  if (elements.length < minimumStages) return fail('TOO_FEW_STAGES', `目前有 ${elements.length} 個階段，再增加 ${minimumStages - elements.length} 個，讓漸層有 ${minimumStages} 個階段。`);

  const { paths, ring } = plausiblePaths(elements);
  if (!paths.length) {
    for (const item of elements) {
      const rest = elements.filter((other) => other !== item);
      if (rest.length >= minimumStages && plausiblePaths(rest).paths.length) {
        return fail('NOT_ON_PATH', `${positionName(item, spec)}的${describeShape(item)}不在漸層的路線上。漸層裡的每個造形都是一個階段，把它排進路線，或刪除它。`);
      }
    }
    return fail('NO_CLEAR_PATH', '造形的排列看不出一條路線。把造形排成一條線，直線、斜線或弧線都可以，讓變化一個接一個看下去。');
  }
  const candidates = [];
  for (const path of paths) {
    const cuts = ring ? path.map((_, index) => [...path.slice(index), ...path.slice(0, index)]) : [path];
    for (const cut of cuts) candidates.push(evaluatePath(cut, spec));
  }
  const best = candidates.sort((a, b) => b.passed.length - a.passed.length)[0];
  const passedMetrics = { ring, channels: Object.fromEntries(Object.entries(best.channels).map(([name, channel]) => [name, { passed: channel.passed, turns: channel.turns, range: channel.range }])) };
  if (best.passed.length >= requiredChannels) {
    return { ...response(true, 'valid', { ...metrics, ...passedMetrics }, ['multiple', ...best.passed]) };
  }

  const { path: ordered, from } = orientPath(best.path);
  const reversed = ordered[0] !== best.path[0];
  const oriented = reversed ? evaluatePath(ordered, spec) : best;
  const label = (name) => GRADATION_CHANNEL_LABELS[name];
  const broken = Object.entries(oriented.channels).filter(([, channel]) => channel.changing && !channel.passed);
  const ringBreak = (name) => (ring ? `圓環上有一處${label(name)}的變化斷掉了。找到那一處，讓變化接得上。` : null);
  // One message at a time: size, lightness and hue first, spacing last.
  for (const [name, channel] of broken) {
    if (channel.turns > 1) {
      const wave = name === 'lightness' ? '變深又變淺' : name === 'hue' ? '顏色來回變了' : name === 'spacing' ? '間距變大又變小' : '變大又變小';
      return fail('TOO_MANY_PEAKS', `你的作品${wave}好幾次，像好幾座山連在一起，這比較像律動。漸層只能有一座山喔！`, passedMetrics);
    }
    if (name === 'spacing') {
      const at = channel.pauseAt >= 0 ? channel.pauseAt : channel.disagreeAt;
      if (at >= 0) return fail('CHANGE_STOPS', ringBreak(name) ?? `從${from}數來第 ${at + 2} 個和第 ${at + 3} 個之間，間距的變化停住了。讓造形之間的空隙繼續變大或變小。`, passedMetrics);
      continue;
    }
    if (channel.pauseAt >= 0) return fail('CHANGE_STOPS', ringBreak(name) ?? `從${from}數來第 ${channel.pauseAt + 2} 個，${label(name)}的變化停住了。`, passedMetrics);
    if (channel.jumpAt >= 0) return fail('HUE_JUMP', ringBreak(name) ?? `從${from}數來第 ${channel.jumpAt + 2} 個，顏色一下子跳太遠了。換成色相環上相鄰的顏色。`, passedMetrics);
    if (channel.valid) return fail('CHANGE_TOO_SMALL', `${label(name)}的變化太小了，讓頭尾兩端的差別再大一點。`, passedMetrics);
  }
  if (best.passed.length === 1) {
    const used = best.passed[0];
    const ideas = ['size', 'lightness', 'spacing', 'hue'].filter((name) => name !== used).slice(0, 2).map(label).join('或');
    return fail('ONLY_ONE_CHANGE', `目前只有${label(used)}在變化，再加入第二種變化，例如${ideas}。`, passedMetrics);
  }
  return fail('NO_CLEAR_GRADATION', '目前看不出一步一步的變化。選兩種變化，例如大小和深淺，從第 1 級到第 6 級一路改變。', passedMetrics);
}

function area(element) {
  const size = element.logicalSize ?? getLogicalSize(element.size);
  const factors = { circle: 0.79, triangle: 0.5, semicircle: 0.59, line: 0.12 };
  return size * size * (factors[element.shape] ?? 1);
}

function balanceVisualWeight(element) {
  return Math.sqrt(area(element));
}

function isMirror(left, right, axis, spec = {}) {
  if (left.length !== right.length || !left.length) return false;
  const positionTolerance = spec.mirrorPositionTolerance ?? 24;
  const yTolerance = spec.mirrorYTolerance ?? 24;
  const sizeTolerance = spec.mirrorSizeTolerance ?? 12;
  const sizeOf = (item) => item.logicalSize ?? getLogicalSize(item.size);
  const candidates = left.map((item) => right.map((other, index) => ({ other, index })).filter(({ other }) => (
    item.shape === other.shape
    && Math.abs(sizeOf(item) - sizeOf(other)) <= sizeTolerance
    && Math.abs(item.y - other.y) <= yTolerance
    && Math.abs(Math.abs(item.x - axis) - Math.abs(other.x - axis)) <= positionTolerance
  )).map(({ index }) => index));
  const match = (leftIndex, used) => leftIndex === candidates.length || candidates[leftIndex].some((rightIndex) => {
    if (used.has(rightIndex)) return false;
    used.add(rightIndex);
    if (match(leftIndex + 1, used)) return true;
    used.delete(rightIndex);
    return false;
  });
  return match(0, new Set());
}

export function validateFormalBalance({ elements = [], spec = {} }) {
  const axis = spec.symmetryAxis ?? 500;
  const deadZone = spec.centerDeadZone ?? 45;
  const tolerance = spec.balanceTolerance ?? 0.45;
  const outside = elements.filter((item) => Math.abs(item.x - axis) > deadZone);
  const left = outside.filter((item) => item.x < axis);
  const right = outside.filter((item) => item.x > axis);
  const visualWeight = (item) => balanceVisualWeight(item);
  const balanceMoment = (item) => visualWeight(item) * Math.sqrt(Math.abs(item.x - axis));
  const leftVisualWeight = left.reduce((sum, item) => sum + visualWeight(item), 0);
  const rightVisualWeight = right.reduce((sum, item) => sum + visualWeight(item), 0);
  const leftWeight = left.reduce((sum, item) => sum + balanceMoment(item), 0);
  const rightWeight = right.reduce((sum, item) => sum + balanceMoment(item), 0);
  const total = leftWeight + rightWeight;
  const differenceRatio = total ? Math.abs(leftWeight - rightWeight) / total : 1;
  const mirrored = isMirror(left, right, axis, spec);
  const metrics = { leftVisualWeight, rightVisualWeight, leftWeight, rightWeight, differenceRatio, tolerance, isMirror: mirrored, outsideDeadZone: outside.length };
  // Gate 4C: one specific sentence per failure (text only; the conditions are unchanged).
  const fail = (code, studentDetail) => ({ ...response(false, code, metrics), studentDetail });
  if (!elements.length) return fail('TOO_CENTERED', '先放上造形，左右兩邊都要有。');
  if (!outside.length) return fail('TOO_CENTERED', '造形都擠在中線附近，中間的造形不算左邊也不算右邊。把一些造形移到兩側。');
  if (!left.length || !right.length) return fail('ONE_SIDE_EMPTY', `目前只有${left.length ? '左邊' : '右邊'}有造形，另一邊也要放。`);
  if (mirrored && spec.requireAsymmetry) return fail('ASYMMETRY_REQUIRED', '左右一模一樣，這是對稱。改變一邊的大小、數量或位置。');
  if (differenceRatio > tolerance) {
    return leftWeight > rightWeight
      ? fail('LEFT_HEAVY', '畫面往左邊倒了。把左邊的造形變小或移近中線，或讓右邊的變大、移遠一點。')
      : fail('RIGHT_HEAVY', '畫面往右邊倒了。把右邊的造形變小或移近中線，或讓左邊的變大、移遠一點。');
  }
  const method = mirrored ? 'symmetrical' : 'asymmetrical';
  return response(true, 'valid', metrics, [method]);
}


function median(values) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function rhythmPathMetrics(ordered, spec) {
  const xGaps = ordered.slice(1).map((item, index) => item.x - ordered[index].x);
  const ySteps = ordered.slice(1).map((item, index) => Math.abs(item.y - ordered[index].y));
  const slopes = ySteps.map((step, index) => xGaps[index] > 0 ? step / xGaps[index] : Infinity);
  const medianGap = median(xGaps);
  const maximumGap = Math.max(0, ...xGaps);
  const xSpan = ordered.length > 1 ? ordered.at(-1).x - ordered[0].x : 0;
  const maximumSlope = Math.max(0, ...slopes);
  const averageSlope = slopes.length ? slopes.reduce((sum, value) => sum + value, 0) / slopes.length : 0;
  const gapRatio = medianGap > 0 ? maximumGap / medianGap : Infinity;
  const traceable = ordered.length >= 3
    && xGaps.every((gap) => gap > 0)
    && xSpan >= (spec.minimumReadingSpan ?? 280)
    && gapRatio <= (spec.maximumGapRatio ?? 2.5)
    && maximumSlope <= (spec.maximumPathSlope ?? 2.25)
    && averageSlope <= (spec.maximumAveragePathSlope ?? 1.35);
  return { traceable, xSpan, medianGap, gapRatio, maximumSlope, averageSlope };
}

export function validateFormalRhythm({ elements = [], spec = {} }) {
  const ordered = [...elements].sort((a, b) => a.x - b.x || a.y - b.y);
  const y = ordered.map((item) => item.y);
  const rotation = ordered.map((item) => item.rotation);
  const size = ordered.map((item) => item.size);
  const spacing = ordered.slice(1).map((item, index) => item.x - ordered[index].x);
  const path = rhythmPathMetrics(ordered, spec);
  // Gate 4C (10/22): rhythm needs several hills — at least two ups-and-downs. One hill
  // (up then down) or one direction only is a gradation, not a rhythm.
  const turnsOf = (values, step) => {
    const signs = values.slice(1).map((value, index) => (Math.abs(value - values[index]) >= step ? Math.sign(value - values[index]) : 0)).filter(Boolean);
    return signs.filter((sign, index) => index > 0 && sign !== signs[index - 1]).length;
  };
  const minimumTurns = spec.minimumRhythmTurns ?? 2;
  const series = {
    position: { big: range(y) >= (spec.minimumYRange ?? 80), turns: turnsOf(y, 20) },
    rotation: { big: range(rotation) >= (spec.minimumRotationRange ?? 90), turns: turnsOf(rotation, 45) },
    size: { big: range(size) >= (spec.minimumSizeRange ?? 2), turns: turnsOf(size, 1) },
    spacing: { big: range(spacing) >= (spec.minimumSpacingRange ?? 35), turns: turnsOf(spacing, 20) }
  };
  const channels = Object.fromEntries(Object.entries(series).map(([mode, item]) => [mode, path.traceable && item.big && item.turns >= minimumTurns]));
  const oneWay = path.traceable ? Object.values(series).filter((item) => item.big && item.turns < minimumTurns) : [];
  const detected = Object.entries(channels).filter(([, passed]) => passed).map(([mode]) => mode);
  const staticRepetition = ordered.length >= 3 && range(y) === 0 && range(rotation) === 0 && range(size) === 0 && range(spacing) < 10;
  const totalVariation = range(y) + range(rotation) + range(size) * 30 + range(spacing);
  const metrics = { channels, path, yRange: range(y), rotationRange: range(rotation), sizeRange: range(size), spacingRange: range(spacing), totalVariation };
  const fail = (code, studentDetail) => ({ ...response(false, code, metrics), studentDetail });
  const minimumElements = spec.minimumElements ?? 5;
  if (ordered.length < minimumElements) return fail('CHANGE_TOO_SUBTLE', `目前有 ${ordered.length} 個造形，至少要 ${minimumElements} 個。`);
  if (staticRepetition) return fail('STATIC_REPETITION', '造形排得很整齊，但都一樣。讓位置一高一低，或改變方向、大小、間距。');
  if (detected.length) return response(true, 'valid', metrics, detected.length > 1 ? ['mixed', ...detected] : detected);
  if (oneWay.length) {
    return oneWay.some((item) => item.turns === 1)
      ? fail('ONE_HILL_ONLY', '只有一座山比較像漸層，律動要有好幾座山的起伏。')
      : fail('ONE_HILL_ONLY', '變化一路往同一個方向，比較像漸層。律動要有好幾座山的起伏。');
  }
  if (totalVariation < 70) return fail('CHANGE_TOO_SUBTLE', '變化太小，看不太出來。讓高低差大一點，或方向轉多一點。');
  if (path.traceable) return fail('NO_CLEAR_MOTION', '有變化，但每一種都不夠明顯。選一種做大一點，例如高低差再大一些。');
  // Name the one reason the path cannot be followed from left to right.
  const sameColumn = ordered.slice(1).some((item, index) => item.x - ordered[index].x <= 0);
  const reason = sameColumn ? '有兩個造形上下排在同一條直線上。造形要由左往右一個接一個排。'
    : path.xSpan < (spec.minimumReadingSpan ?? 280) ? '造形擠在一起，看不出路線。把路線往左右拉長一點。'
      : path.gapRatio > (spec.maximumGapRatio ?? 2.5) ? '有一段空隙特別大，路線斷掉了。把造形之間的距離排得平均一點。'
        : '路線太陡了，不要直上直下。讓造形往右多排開一點。';
  return fail('TOO_RANDOM', reason);
}


// Gate 4 symmetry: mirrored shapes must match in position, shape, size and mirrored direction
// (colour is free), keep the original pair counts, and show at least four different
// shape + colour combinations. Shapes on an axis do not count as combinations but must
// themselves be symmetric about that axis (and, in cross mode, be mirrored on the other axis).
const directionalPeriods = Object.freeze({ square: 90, triangle: 360, semicircle: 360, rectangle: 180, line: 180 });
const SYMMETRY_SHAPE_LABELS = Object.freeze({ circle: '圓形', square: '正方形', triangle: '三角形', rectangle: '長方形', semicircle: '半圓', line: '線條' });
const SYMMETRY_HUE_LABELS = Object.freeze({
  red: '紅色', 'red-orange': '紅橙色', orange: '橙色', 'yellow-orange': '黃橙色', yellow: '黃色', 'yellow-green': '黃綠色',
  green: '綠色', 'blue-green': '藍綠色', blue: '藍色', 'blue-violet': '藍紫色', violet: '紫色', 'red-violet': '紅紫色'
});
const normalizeAngle = (angle, period = 360) => ((angle % period) + period) % period;
function mirrorRotation(element, axis) {
  const period = directionalPeriods[element.shape];
  if (!period) return null;
  const rotation = element.rotation ?? 0;
  return normalizeAngle(axis === 'vertical' ? -rotation : 180 - rotation, period);
}
function attributesMatch(source, target, axis) {
  if (source.shape !== target.shape || source.size !== target.size) return false;
  const expected = mirrorRotation(source, axis);
  return expected == null || normalizeAngle(target.rotation ?? 0, directionalPeriods[source.shape]) === expected;
}
function attributesMatchAcrossAxes(source, target, axes) {
  if (source.shape !== target.shape || source.size !== target.size) return false;
  const period = directionalPeriods[source.shape];
  if (!period) return true;
  let reflected = { ...source };
  for (const axis of axes) reflected.rotation = mirrorRotation(reflected, axis);
  return normalizeAngle(target.rotation ?? 0, period) === normalizeAngle(reflected.rotation ?? 0, period);
}
// A shape sitting on an axis is its own mirror image only if it is symmetric about that axis.
const selfSymmetric = (item, axis) => attributesMatch(item, item, axis);
const symmetryName = (item) => `${SYMMETRY_HUE_LABELS[item.hue] ?? ''}${SYMMETRY_SHAPE_LABELS[item.shape] ?? '造形'}`;
// Gate 4 (same idea as repetition): a different shape, colour, size or visible direction makes a different kind.
// Direction is read as seen from the reference side (left / top), so a mirrored pair is one kind,
// while ▲ and ▼ on the same side are two kinds. Invisible turns (circle, square 90°, rectangle 180°) do not count.
function symmetryKind(item, mode, spec) {
  const period = directionalPeriods[item.shape];
  let direction = '-';
  if (period) {
    let reflected = { ...item };
    if (mode !== 'horizontal' && item.x > (spec.axisX ?? 500) + 1) reflected = { ...reflected, rotation: mirrorRotation(reflected, 'vertical') };
    if (mode !== 'vertical' && item.y > (spec.axisY ?? 300) + 1) reflected = { ...reflected, rotation: mirrorRotation(reflected, 'horizontal') };
    direction = String(normalizeAngle(reflected.rotation ?? 0, period));
  }
  return `${item.shape}|${item.hue}|${item.size}|${direction}`;
}
const symmetrySizeWord = (item) => (item.size >= 4 ? '大的' : item.size <= 2 ? '小的' : '中型的');
function symmetryPlace(item, spec) {
  const width = (spec.axisX ?? 500) * 2; const height = (spec.axisY ?? 300) * 2;
  const column = item.x < width / 3 ? 0 : item.x > (width * 2) / 3 ? 2 : 1;
  const row = item.y < height / 3 ? 0 : item.y > (height * 2) / 3 ? 2 : 1;
  return [['左上角', '上方', '右上角'], ['左邊', '中間', '右邊'], ['左下角', '下方', '右下角']][row][column];
}

function axisAudit(elements, axis, spec) {
  const tolerance = spec.positionTolerance ?? 1;
  const axisX = spec.axisX ?? 500;
  const axisY = spec.axisY ?? 300;
  const isOnAxis = (item) => axis === 'vertical' ? Math.abs(item.x - axisX) <= tolerance : Math.abs(item.y - axisY) <= tolerance;
  const onAxis = elements.filter(isOnAxis);
  const participants = elements.filter((item) => !isOnAxis(item));
  const sources = participants.filter((item) => axis === 'vertical' ? item.x < axisX : item.y < axisY);
  const targets = participants.filter((item) => axis === 'vertical' ? item.x > axisX : item.y > axisY);
  let positionMismatch = null; let attributeMismatch = null; let missing = null;
  const candidates = sources.map((source) => {
    const expected = axis === 'vertical' ? { x: 2 * axisX - source.x, y: source.y } : { x: source.x, y: 2 * axisY - source.y };
    const atPosition = targets.map((target, index) => ({ target, index })).filter(({ target }) => Math.abs(target.x - expected.x) <= tolerance && Math.abs(target.y - expected.y) <= tolerance);
    const matching = atPosition.filter(({ target }) => target.id !== source.id && attributesMatch(source, target, axis)).map(({ index }) => index);
    if (!matching.length) {
      if (atPosition.length) attributeMismatch ??= { source, target: atPosition[0].target, axes: [axis] };
      else if (targets.some((target) => target.id !== source.id && attributesMatch(source, target, axis))) positionMismatch ??= source;
      else missing ??= source;
    }
    return matching;
  });
  const assignment = new Array(candidates.length).fill(-1);
  const match = (sourceIndex, used) => sourceIndex === candidates.length || candidates[sourceIndex].some((targetIndex) => {
    if (used.has(targetIndex)) return false;
    used.add(targetIndex); assignment[sourceIndex] = targetIndex;
    if (match(sourceIndex + 1, used)) return true;
    used.delete(targetIndex);
    return false;
  });
  const oneToOne = sources.length === targets.length && match(0, new Set());
  if (!oneToOne && !positionMismatch && !attributeMismatch) missing ??= (targets.length > sources.length ? targets[sources.length] ?? targets[0] : sources[0]) ?? null;
  const axisBreaker = onAxis.find((item) => !selfSymmetric(item, axis)) ?? null;
  const passed = oneToOne && !positionMismatch && !attributeMismatch && !missing && !axisBreaker;
  const mirrored = oneToOne ? [...sources, ...assignment.map((index) => targets[index])] : [];
  const units = oneToOne ? sources.map((source, index) => [source, targets[assignment[index]]]) : [];
  return { passed, positionMismatch, attributeMismatch, missing, axisBreaker, pairCount: oneToOne ? sources.length : 0, mirrored, units, participantCount: participants.length, axisElementCount: onAxis.length };
}

function crossOrbitAudit(elements, spec) {
  const tolerance = spec.positionTolerance ?? 1;
  const axisX = spec.axisX ?? 500;
  const axisY = spec.axisY ?? 300;
  const onVertical = (item) => Math.abs(item.x - axisX) <= tolerance;
  const onHorizontal = (item) => Math.abs(item.y - axisY) <= tolerance;
  const participants = elements.filter((item) => !onVertical(item) && !onHorizontal(item));
  const seeds = participants.filter((item) => item.x < axisX && item.y < axisY);
  const used = new Set();
  let positionMismatch = null; let attributeMismatch = null; let missing = null;
  let orbitCount = 0;
  const units = [];
  const mirrored = [];
  const at = (pool, x, y) => pool.filter((item) => !used.has(item.id) && Math.abs(item.x - x) <= tolerance && Math.abs(item.y - y) <= tolerance);
  for (const source of seeds) {
    if (used.has(source.id)) continue;
    const expected = [
      { x: 2 * axisX - source.x, y: source.y, axes: ['vertical'] },
      { x: source.x, y: 2 * axisY - source.y, axes: ['horizontal'] },
      { x: 2 * axisX - source.x, y: 2 * axisY - source.y, axes: ['vertical', 'horizontal'] }
    ];
    const orbit = [source];
    for (const point of expected) {
      const positioned = at(participants, point.x, point.y);
      const matching = positioned.find((target) => attributesMatchAcrossAxes(source, target, point.axes));
      if (matching) orbit.push(matching);
      else if (positioned.length) attributeMismatch ??= { source, target: positioned[0], axes: point.axes };
      else if (participants.some((target) => target.id !== source.id && target.shape === source.shape && target.size === source.size)) positionMismatch ??= source;
      else missing ??= source;
    }
    if (orbit.length === 4 && new Set(orbit.map((item) => item.id)).size === 4) {
      orbit.forEach((item) => used.add(item.id));
      mirrored.push(...orbit);
      units.push(orbit);
      orbitCount += 1;
    }
  }
  if (used.size !== participants.length) missing ??= participants.find((item) => !used.has(item.id)) ?? null;
  // Shapes on one axis must be symmetric about that axis and mirrored across the other one;
  // a shape at the centre must be symmetric about both axes.
  let axisBreaker = null; let axisUnpaired = null;
  const axisUsed = new Set();
  for (const item of elements.filter((element) => onVertical(element) || onHorizontal(element))) {
    if (onVertical(item) && onHorizontal(item)) {
      if (!selfSymmetric(item, 'vertical') || !selfSymmetric(item, 'horizontal')) axisBreaker ??= item;
      continue;
    }
    const ownAxis = onVertical(item) ? 'vertical' : 'horizontal';
    const otherAxis = ownAxis === 'vertical' ? 'horizontal' : 'vertical';
    if (!selfSymmetric(item, ownAxis)) { axisBreaker ??= item; continue; }
    if (axisUsed.has(item.id)) continue;
    const partner = elements.find((other) => other.id !== item.id && !axisUsed.has(other.id)
      && Math.abs(other.x - (otherAxis === 'vertical' ? 2 * axisX - item.x : item.x)) <= tolerance
      && Math.abs(other.y - (otherAxis === 'horizontal' ? 2 * axisY - item.y : item.y)) <= tolerance
      && attributesMatch(item, other, otherAxis));
    if (partner) { axisUsed.add(item.id); axisUsed.add(partner.id); } else axisUnpaired ??= item;
  }
  return { passed: !positionMismatch && !attributeMismatch && !missing && !axisBreaker && !axisUnpaired, positionMismatch, attributeMismatch, missing, axisBreaker, axisUnpaired, orbitCount, mirrored, units, participantCount: participants.length, axisElementCount: elements.length - participants.length };
}

// Finds the first shape that has no mirror partner across one axis and says why, in the order a
// student should fix things: a missing partner first, then a partner a few squares off, then one that differs.
const gridWord = (steps) => (steps === 1 ? '一格' : steps === 2 ? '兩格' : `${steps} 格`);
function mirrorScan(elements, axis, spec) {
  const tolerance = spec.positionTolerance ?? 1;
  const grid = spec.gridStep ?? 20;
  const axisX = spec.axisX ?? 500; const axisY = spec.axisY ?? 300;
  const onThisAxis = (item) => (axis === 'vertical' ? Math.abs(item.x - axisX) <= tolerance : Math.abs(item.y - axisY) <= tolerance);
  const mirrorPoint = (item) => (axis === 'vertical' ? { x: 2 * axisX - item.x, y: item.y } : { x: item.x, y: 2 * axisY - item.y });
  const distance = (item) => (axis === 'vertical' ? Math.abs(item.x - axisX) : Math.abs(item.y - axisY));
  const along = (item) => (axis === 'vertical' ? item.y : item.x);
  const opposite = (item, other) => (axis === 'vertical' ? Math.sign(item.x - axisX) !== Math.sign(other.x - axisX) : Math.sign(item.y - axisY) !== Math.sign(other.y - axisY));
  const found = { missing: null, near: null, attribute: null };
  const ordered = elements.filter((item) => !onThisAxis(item)).sort((a, b) => a.y - b.y || a.x - b.x);
  for (const item of ordered) {
    const expected = mirrorPoint(item);
    const atSpot = elements.filter((other) => other.id !== item.id && Math.abs(other.x - expected.x) <= tolerance && Math.abs(other.y - expected.y) <= tolerance);
    if (atSpot.some((other) => attributesMatch(item, other, axis))) continue;
    if (atSpot.length) { found.attribute ??= { item, target: atSpot[0], expected }; continue; }
    const near = elements
      .filter((other) => other.id !== item.id && !onThisAxis(other) && opposite(item, other) && other.shape === item.shape && other.size === item.size
        && Math.abs(distance(other) - distance(item)) <= grid * 3 && Math.abs(along(other) - along(item)) <= grid * 3)
      .sort((a, b) => Math.hypot(a.x - expected.x, a.y - expected.y) - Math.hypot(b.x - expected.x, b.y - expected.y))[0];
    if (near) {
      found.near ??= { item, target: near, expected, closer: Math.round((distance(item) - distance(near)) / grid), shift: Math.round((along(near) - along(item)) / grid) };
      continue;
    }
    found.missing ??= { item, expected };
  }
  return found.missing ? { type: 'missing', ...found.missing } : found.near ? { type: 'near', ...found.near } : found.attribute ? { type: 'attribute', ...found.attribute } : null;
}

function quadrantName(point, spec) {
  const axisX = spec.axisX ?? 500; const axisY = spec.axisY ?? 300;
  if (Math.abs(point.x - axisX) <= 1) return `${point.y < axisY ? '上方' : '下方'}中線上`;
  if (Math.abs(point.y - axisY) <= 1) return `${point.x < axisX ? '左邊' : '右邊'}中線上`;
  return `${point.x < axisX ? '左' : '右'}${point.y < axisY ? '上' : '下'}`;
}
function describeMirrorIssue(issue, axis, mode, spec) {
  const where = (point) => (mode === 'cross' ? quadrantName(point, spec) : symmetryPlace(point, spec));
  const line = mode === 'cross' ? (axis === 'vertical' ? '中間的直線' : '中間的橫線') : '中線';
  const name = symmetryName;
  if (issue.type === 'missing') {
    const there = mode === 'cross' ? quadrantName(issue.expected, spec)
      : axis === 'vertical' ? (issue.item.x < (spec.axisX ?? 500) ? '右邊' : '左邊') : (issue.item.y < (spec.axisY ?? 300) ? '下面' : '上面');
    return `${where(issue.item)}的${name(issue.item)}，在${there}找不到對應的造形。`;
  }
  if (issue.type === 'near') {
    const parts = [];
    if (issue.closer > 0) parts.push(`離${line}近了${gridWord(issue.closer)}`);
    if (issue.closer < 0) parts.push(`離${line}遠了${gridWord(-issue.closer)}`);
    if (issue.shift !== 0) parts.push(axis === 'vertical' ? `${issue.shift > 0 ? '低了' : '高了'}${gridWord(Math.abs(issue.shift))}` : `${issue.shift > 0 ? '偏右' : '偏左'}${gridWord(Math.abs(issue.shift))}`);
    return `${where(issue.target)}的${name(issue.target)}${parts.join('，')}。`;
  }
  const { item, target } = issue;
  const pair = axis === 'vertical' ? '左右' : '上下';
  if (item.shape !== target.shape) return `${where(item)}的${name(item)}，在${pair}對應的位置上是${SYMMETRY_SHAPE_LABELS[target.shape] ?? '別的造形'}，兩邊的造形不一樣。`;
  if (item.size !== target.size) return `${pair}兩邊的${SYMMETRY_SHAPE_LABELS[item.shape] ?? '造形'}大小不一樣。`;
  return `${pair}兩邊的${SYMMETRY_SHAPE_LABELS[item.shape] ?? '造形'}方向沒有對應。把其中一個轉成像照鏡子一樣的方向。`;
}
const ISSUE_CODES = Object.freeze({ missing: 'NO_SYMMETRY_PAIR', near: 'POSITION_MISMATCH', attribute: 'ATTRIBUTE_MISMATCH' });

export function validateFormalSymmetry({ elements = [], spec = {}, selectedSymmetryMode = 'vertical' }) {
  const vertical = axisAudit(elements, 'vertical', spec);
  const horizontal = axisAudit(elements, 'horizontal', spec);
  const cross = crossOrbitAudit(elements, spec);
  const required = selectedSymmetryMode === 'cross' ? cross : selectedSymmetryMode === 'horizontal' ? horizontal : vertical;
  const minimum = selectedSymmetryMode === 'cross' ? (spec.minimumCrossOrbits ?? 2) : (spec.minimumMirrorPairs ?? 4);
  const count = selectedSymmetryMode === 'cross' ? required.orbitCount : required.pairCount;
  const kindOf = (item) => symmetryKind(item, selectedSymmetryMode, spec);
  const combinations = [...new Set(required.mirrored.map(kindOf))];
  const requiredCombinations = spec.minimumCombinations ?? 4;
  const strip = ({ mirrored, units, positionMismatch, attributeMismatch, missing, axisBreaker, axisUnpaired, ...rest }) => ({ ...rest, positionMismatch: Boolean(positionMismatch), attributeMismatch: Boolean(attributeMismatch), missing: Boolean(missing), axisBreaker: Boolean(axisBreaker), axisUnpaired: Boolean(axisUnpaired) });
  const metrics = { selectedSymmetryMode, vertical: strip(vertical), horizontal: strip(horizontal), cross: strip(cross), requiredCount: minimum, matchedCount: count, combinationCount: combinations.length, requiredCombinations, elementCount: elements.length };
  // Shapes on the centre line are allowed but never count; whenever there is one, remind students of that.
  const onCentreLine = (item) => (selectedSymmetryMode !== 'horizontal' && Math.abs(item.x - (spec.axisX ?? 500)) <= 1)
    || (selectedSymmetryMode !== 'vertical' && Math.abs(item.y - (spec.axisY ?? 300)) <= 1);
  const reminder = elements.some(onCentreLine) ? '中線上的造形可以放，但不算在 4 種裡。' : null;
  // Skip the reminder when the message already covers the centre line, or when it suggests switching modes
  // (the student sees the reminder on the next check, and the feedback stays one thing at a time).
  const withReminder = (result) => {
    const detail = String(result.studentDetail ?? '');
    return reminder && !detail.includes('中線上的造形') && !detail.includes('也可以改選') ? { ...result, reminder } : result;
  };
  const fail = (code, studentDetail) => withReminder({ ...response(false, code, metrics), studentDetail });
  const place = (item) => symmetryPlace(item, spec);
  const axisWord = selectedSymmetryMode === 'horizontal' ? '上下' : '左右';
  const unit = selectedSymmetryMode === 'cross' ? '組上下左右的對應' : '對';
  const otherSide = (item) => selectedSymmetryMode === 'horizontal'
    ? (item.y < (spec.axisY ?? 300) ? '下面' : '上面')
    : (item.x < (spec.axisX ?? 500) ? '右邊' : '左邊');

  if (required.passed && count >= minimum && combinations.length >= requiredCombinations) return withReminder(response(true, 'valid', metrics, [selectedSymmetryMode]));
  if (!elements.length) return fail('NO_SYMMETRY_PAIR', '先放一個造形，再在對稱軸的另一邊放它的對應造形。');
  if (required.axisBreaker) {
    const item = required.axisBreaker;
    const centre = selectedSymmetryMode === 'cross' && Math.abs(item.x - (spec.axisX ?? 500)) <= 1 && Math.abs(item.y - (spec.axisY ?? 300)) <= 1;
    const side = centre ? '上下左右都' : selectedSymmetryMode === 'cross' ? (Math.abs(item.x - (spec.axisX ?? 500)) <= 1 ? '左右' : '上下') : axisWord;
    const tilted = ['triangle', 'rectangle', 'semicircle', 'line'].includes(item.shape) ? `，斜放的${SYMMETRY_SHAPE_LABELS[item.shape]}不行` : '';
    return fail('AXIS_SHAPE_NOT_SYMMETRIC', `放在${centre ? '正中心' : '中線上'}的造形要${side}對稱${tilted}。轉動它，或把它移開中線。`);
  }
  const comboCount = (audit) => new Set(audit.mirrored.map((item) => symmetryKind(item, audit === cross ? 'cross' : audit === horizontal ? 'horizontal' : 'vertical', spec))).size;
  const fullyDone = (audit) => audit.passed && audit.pairCount >= (spec.minimumMirrorPairs ?? 4) && comboCount(audit) >= requiredCombinations;
  if (selectedSymmetryMode === 'cross' && !cross.passed) {
    const axis = vertical.passed && !horizontal.passed ? 'horizontal' : horizontal.passed && !vertical.passed ? 'vertical' : !vertical.passed ? 'vertical' : 'horizontal';
    const issue = mirrorScan(elements, axis, spec);
    if (issue) {
      const lead = vertical.passed && !horizontal.passed ? '十字對稱需要上下也對稱。' : horizontal.passed && !vertical.passed ? '十字對稱需要左右也對稱。' : '十字對稱需要左右和上下都對稱。';
      const nudge = fullyDone(vertical) && !horizontal.passed ? '你的作品已經左右對稱了！也可以改選『左右對稱』試試看。'
        : fullyDone(horizontal) && !vertical.passed ? '你的作品已經上下對稱了！也可以改選『上下對稱』試試看。' : '';
      return fail('CROSS_INCOMPLETE', `${lead}${describeMirrorIssue(issue, axis, 'cross', spec)}${nudge}`);
    }
  }
  if (selectedSymmetryMode !== 'cross' && !required.passed) {
    const issue = mirrorScan(elements, selectedSymmetryMode, spec);
    if (issue) return fail(ISSUE_CODES[issue.type], describeMirrorIssue(issue, selectedSymmetryMode, selectedSymmetryMode, spec));
  }
  if (selectedSymmetryMode === 'cross' && required.axisUnpaired) return fail('CROSS_INCOMPLETE', `${quadrantName(required.axisUnpaired, spec)}的${symmetryName(required.axisUnpaired)}，在對面找不到相同的造形。`);
  if (selectedSymmetryMode === 'cross' && vertical.passed !== horizontal.passed) {
    const done = vertical.passed ? '左右' : '上下'; const todo = vertical.passed ? '上下' : '左右';
    return fail('CROSS_INCOMPLETE', `${done}已經對應了，${todo}還沒有。十字對稱要同時${done}和${todo}都對應，再補上${todo}方向的造形。`);
  }
  if (required.attributeMismatch) {
    const { source, target, axes } = required.attributeMismatch;
    const pair = axes.length === 2 ? '斜對角' : axes[0] === 'vertical' ? '左右' : '上下';
    if (source.shape !== target.shape) return fail('ATTRIBUTE_MISMATCH', `${place(source)}的${symmetryName(source)}，在${pair}對應的位置上是${SYMMETRY_SHAPE_LABELS[target.shape] ?? '別的造形'}，兩邊的造形不一樣。`);
    if (source.size !== target.size) return fail('ATTRIBUTE_MISMATCH', `${pair}兩邊的${SYMMETRY_SHAPE_LABELS[source.shape] ?? '造形'}大小不一樣。`);
    return fail('ATTRIBUTE_MISMATCH', `${pair}兩邊的${SYMMETRY_SHAPE_LABELS[source.shape] ?? '造形'}方向沒有對應。把其中一個轉成像照鏡子一樣的方向。`);
  }
  if (required.positionMismatch) return fail('POSITION_MISMATCH', `${place(required.positionMismatch)}的${symmetryName(required.positionMismatch)}，和另一邊相同的造形離中線不一樣遠。利用方格對齊。`);
  if (required.missing) {
    return selectedSymmetryMode === 'cross'
      ? fail('CROSS_INCOMPLETE', `${place(required.missing)}的${symmetryName(required.missing)}在上下左右四個位置還沒有都放好相同的造形。`)
      : fail('NO_SYMMETRY_PAIR', `${place(required.missing)}的${symmetryName(required.missing)}，在${otherSide(required.missing)}找不到對應的造形。`);
  }
  if (count < minimum) return fail('NOT_ENOUGH_SYMMETRY', `目前有 ${count} ${unit}，再做 ${minimum - count} ${unit}就完成了。`);
  const missingKinds = requiredCombinations - combinations.length;
  const centreKinds = elements.filter(onCentreLine).map(kindOf).filter((kind) => !combinations.includes(kind));
  if (centreKinds.length) return fail('NOT_ENOUGH_VARIETY', `中線上的造形不算在 4 種裡，兩側再加 ${missingKinds} 種不同的造形、顏色、大小或方向。`);
  // Name the repeated look when whole pairs / groups are exactly the same.
  const unitKey = (group) => [...new Set(group.map(kindOf))].sort().join('/');
  const sameUnits = new Map();
  for (const group of required.units ?? []) sameUnits.set(unitKey(group), [...(sameUnits.get(unitKey(group)) ?? []), group]);
  const repeated = [...sameUnits.values()].filter((groups) => groups.length > 1 && new Set(groups[0].map(kindOf)).size === 1).sort((a, b) => b.length - a.length)[0];
  if (repeated) {
    const item = repeated[0][0];
    const look = `${symmetrySizeWord(item)}${symmetryName(item)}`;
    const many = repeated.length === 2 ? '兩組' : `${repeated.length} 組`;
    return fail('NOT_ENOUGH_VARIETY', `${many}都是${look}，算同一種；改變其中一組的顏色、大小或方向。`);
  }
  return fail('NOT_ENOUGH_VARIETY', `目前只有 ${combinations.length} 種，再加 ${missingKinds} 種。可以改變造形、顏色、大小或方向。`);
}

function valueCounts(elements, key) {
  const counts = new Map();
  elements.forEach((item) => { const value = key(item); counts.set(value, (counts.get(value) ?? 0) + 1); });
  return counts;
}
function clearTwoGroup(counts, total, coverage) {
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (total === 2 && ordered.length === 2) return ordered;
  return ordered.length >= 2 && ordered[0][1] >= 2 && (ordered[0][1] + ordered[1][1]) / total >= coverage ? ordered.slice(0, 2) : null;
}
const hueOrder = HUE_FAMILIES;
const shapeFamily = (shape) => shape === 'circle' || shape === 'semicircle' ? 'rounded' : shape === 'triangle' ? 'pointed' : 'angular';
// Gate 4 contrast: at least six shapes in two clearly separate groups, which differ strongly in
// size (unchanged rule) AND colour: hues at least 4 steps apart on the 12-step wheel (complements
// included), or lightness at least 3 levels apart. Neighbouring hues such as red and orange do not count.
const CONTRAST_SHAPE_LABELS = Object.freeze({ circle: '圓形', square: '正方形', triangle: '三角形', rectangle: '長方形', semicircle: '半圓', line: '線條' });
const CONTRAST_HUE_LABELS = Object.freeze({
  red: '紅色', 'red-orange': '紅橙色', orange: '橙色', 'yellow-orange': '黃橙色', yellow: '黃色', 'yellow-green': '黃綠色',
  green: '綠色', 'blue-green': '藍綠色', blue: '藍色', 'blue-violet': '藍紫色', violet: '紫色', 'red-violet': '紅紫色'
});
const contrastKey = (item) => `${item.size}|${item.hue}|${item.lightness ?? 3}`;
function contrastPlace(item, spec) {
  const width = spec.canvasWidth ?? 1000; const height = spec.canvasHeight ?? 600;
  const column = item.x < width / 3 ? 0 : item.x > (width * 2) / 3 ? 2 : 1;
  const row = item.y < height / 3 ? 0 : item.y > (height * 2) / 3 ? 2 : 1;
  return [['左上角', '上方', '右上角'], ['左邊', '中間', '右邊'], ['左下角', '下方', '右下角']][row][column];
}
// Gate 4C contrast (10/22): at least 3 places of strong contrast. A place is two shapes that
// sit next to each other (touching, overlapping or almost touching) and differ a lot in size
// (3 levels or more) or colour (4 hue steps or more, or 3 lightness levels; neighbouring
// colours never count). Every shape needs at least one such neighbour. Places are counted so
// that each shape belongs to one place at most: a big circle with three small circles around
// it is one place, not three.
const CONTRAST_PLACE_WORDS = [['左上', '上方', '右上'], ['左邊', '中間', '右邊'], ['左下', '下方', '右下']];
function contrastSpot(item, spec) {
  const width = spec.canvasWidth ?? 1000; const height = spec.canvasHeight ?? 600;
  const column = item.x < width / 3 ? 0 : item.x > (width * 2) / 3 ? 2 : 1;
  const row = item.y < height / 3 ? 0 : item.y > (height * 2) / 3 ? 2 : 1;
  return CONTRAST_PLACE_WORDS[row][column];
}
function contrastHalf(item) {
  const size = Number.isFinite(item.logicalSize) ? item.logicalSize : getLogicalSize(item.size);
  const width = item.shape === 'rectangle' ? size * 1.5 : (item.shape === 'semicircle' || item.shape === 'line') ? size * 1.5 : size;
  const height = (item.shape === 'semicircle' || item.shape === 'line') ? size / 2 : size;
  const radians = ((item.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians)); const sin = Math.abs(Math.sin(radians));
  return { x: (width * cos + height * sin) / 2, y: (width * sin + height * cos) / 2 };
}
function contrastGap(first, second) {
  const a = contrastHalf(first); const b = contrastHalf(second);
  return Math.max(Math.abs(first.x - second.x) - a.x - b.x, Math.abs(first.y - second.y) - a.y - b.y);
}
function largestPairing(count, edges) {
  // Most places with each shape used at most once (small canvases, so an exact search is fine).
  const neighbours = Array.from({ length: count }, () => []);
  edges.forEach(([i, j]) => { neighbours[i].push(j); neighbours[j].push(i); });
  const memo = new Map();
  const best = (used) => {
    if (memo.has(used)) return memo.get(used);
    let i = 0;
    while (i < count && ((used >> i) & 1 || !neighbours[i].some((j) => !((used >> j) & 1)))) i += 1;
    if (i >= count) { memo.set(used, 0); return 0; }
    let result = best(used | (1 << i));
    for (const j of neighbours[i]) if (!((used >> j) & 1)) result = Math.max(result, 1 + best(used | (1 << i) | (1 << j)));
    memo.set(used, result);
    return result;
  };
  return count <= 26 ? best(0) : Math.floor(edges.length / 2);
}
export function validateFormalContrast({ elements = [], spec = {} }) {
  const requiredPlaces = spec.minimumContrastPlaces ?? 3;
  const nearGap = spec.contrastNeighborGap ?? 20;
  const sizeGap = spec.minimumSizeDifference ?? 3;
  const hueGap = spec.minimumHueDistance ?? 4;
  const lightGap = spec.minimumLightnessDistance ?? 3;
  const hueStep = (a, b) => { const i = hueOrder.indexOf(a); const j = hueOrder.indexOf(b); return i < 0 || j < 0 ? 0 : Math.min(Math.abs(i - j), hueOrder.length - Math.abs(i - j)); };
  const sizeDiffers = (a, b) => Math.abs(a.size - b.size) >= sizeGap;
  const colourDiffers = (a, b) => hueStep(a.hue, b.hue) >= hueGap || Math.abs((a.lightness ?? 3) - (b.lightness ?? 3)) >= lightGap;
  const near = []; const strong = [];
  for (let i = 0; i < elements.length; i += 1) {
    for (let j = i + 1; j < elements.length; j += 1) {
      if (contrastGap(elements[i], elements[j]) > nearGap) continue;
      near.push([i, j]);
      if (sizeDiffers(elements[i], elements[j]) || colourDiffers(elements[i], elements[j])) strong.push([i, j]);
    }
  }
  const places = largestPairing(elements.length, strong);
  const kinds = new Set(strong.flatMap(([i, j]) => [sizeDiffers(elements[i], elements[j]) && 'size', colourDiffers(elements[i], elements[j]) && 'color'].filter(Boolean)));
  const hasPartner = elements.map((_, index) => strong.some(([i, j]) => i === index || j === index));
  const metrics = { places, requiredPlaces, contrastPairs: strong.length, neighbourPairs: near.length, lonely: hasPartner.filter((ok) => !ok).length, elementCount: elements.length };
  const fail = (code, studentDetail) => ({ ...response(false, code, metrics), studentDetail });
  const hueName = (hue) => CONTRAST_HUE_LABELS[hue] ?? '';
  const shapeName = (item) => CONTRAST_SHAPE_LABELS[item.shape] ?? '圖形';
  const name = (item) => `${hueName(item.hue)}${shapeName(item)}`;

  if (!elements.length) return fail('NO_CONTRAST_PLACE', '先放上圖形：大的旁邊放小的，或紅色旁邊放綠色。');
  // Shapes without a strongly different neighbour, read from top-left to bottom-right.
  const reading = elements.map((item, index) => ({ item, index })).sort((a, b) => (Math.round(a.item.y / 200) - Math.round(b.item.y / 200)) || a.item.x - b.item.x);
  const alone = reading.find(({ index }) => !hasPartner[index]);
  if (alone) {
    const neighbours = near.filter(([i, j]) => i === alone.index || j === alone.index).map(([i, j]) => elements[i === alone.index ? j : i]);
    if (neighbours.length) {
      const other = neighbours.sort((a, b) => contrastGap(alone.item, a) - contrastGap(alone.item, b))[0];
      const pair = name(other) === name(alone.item) ? `兩個${name(alone.item)}` : `${name(alone.item)}和${name(other)}`;
      return fail('CONTRAST_TOO_WEAK', `${contrastSpot(alone.item, spec)}的${pair}，大小和顏色都太接近了。讓一個變大或變小很多，或換一個顏色差很多的。`);
    }
    return fail('NO_CONTRAST_NEIGHBOR', `${contrastSpot(alone.item, spec)}的${name(alone.item)}旁邊，沒有和它差很多的圖形。`);
  }
  if (places < requiredPlaces) return fail('NOT_ENOUGH_CONTRASTS', `目前有 ${places} 處對比，再做 ${requiredPlaces - places} 處。`);
  const methods = kinds.has('size') && kinds.has('color') ? ['multiple', 'size', 'color'] : [...kinds];
  return response(true, 'valid', metrics, methods);
}

export function validateFormalProportion({ elements = [], spec = {} }) {
  const required = spec.requiredRatioLevels ?? [1, 2, 3];
  const levels = elements.map((item) => item.ratioLevel ?? item.proportion).filter((value) => value != null);
  const present = [...new Set(levels)].sort();
  const metrics = { presentRatioLevels: present, requiredRatioLevels: required, elementCount: elements.length };
  const fail = (code, studentDetail) => ({ ...response(false, code, metrics), studentDetail });
  const minimumElements = spec.minimumElements ?? 6;
  const label = (level) => `${level}×`;
  if (elements.length < minimumElements) return fail('TOO_FEW_ELEMENTS', `目前有 ${elements.length} 個造形，至少要 ${minimumElements} 個。`);
  const missing = required.filter((level) => !present.includes(level));
  if (missing.length) return fail('RATIO_LEVELS_INCOMPLETE', `還沒用到 ${missing.map(label).join('、')}。${required.map(label).join('、')} 三種尺寸都要有。`);
  if (present.some((level) => !required.includes(level))) return fail('RATIO_RELATION_TOO_WEAK', `只用 ${required.map(label).join('、')} 這三種尺寸，讓大小關係更清楚。`);
  return response(true, 'valid', metrics, ['ratio']);
}


function dominantGroup(elements, key) {
  const counts = valueCounts(elements, key);
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [value, count] = ordered[0] ?? [null, 0];
  return { value, count, ratio: elements.length ? count / elements.length : 0, counts: Object.fromEntries(ordered) };
}

export function validateFormalUnity({ elements = [], spec = {} }) {
  const minimumElements = spec.minimumElements ?? 4;
  const requiredRatio = spec.requiredUnityRatio ?? 0.75;
  const color = dominantGroup(elements, (item) => item.hueFamily ?? item.hue);
  const exactShape = dominantGroup(elements, (item) => item.shape);
  const directional = elements.filter((item) => getShapeMetadata(item.shape).directional);
  // Gate 4C (10/22): directions that look the same count as one direction (rectangle 0° = 180°).
  const visibleRotation = (item) => { const period = UNIT_ROTATION_PERIOD[item.shape] ?? 360; return period ? (((item.rotation ?? 0) % period) + period) % period : 0; };
  const rotation = dominantGroup(directional, visibleRotation);
  const directionCoverage = elements.length ? rotation.count / elements.length : 0;
  const featureCounts = new Map();
  const meaningfulFeatures = new Set(['rounded', 'angular', 'pointed', 'elongated', 'equal-sides', 'radial', 'flat-edge', 'open', 'linear']);
  elements.forEach((item) => getShapeMetadata(item.shape).shapeFeature.filter((feature) => meaningfulFeatures.has(feature)).forEach((feature) => featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1)));
  const [feature, featureCount] = [...featureCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const shapeFeature = { value: feature, count: featureCount, ratio: elements.length ? featureCount / elements.length : 0 };
  const variations = {
    size: new Set(elements.map((item) => item.size)).size >= 2,
    color: new Set(elements.map((item) => item.hueFamily ?? item.hue)).size >= 2,
    shape: new Set(elements.map((item) => item.shape)).size >= 2,
    rotation: new Set(directional.map(visibleRotation)).size >= 2
  };
  const methods = [];
  if (elements.length >= minimumElements && color.ratio >= requiredRatio && (variations.size || variations.shape || variations.rotation)) methods.push('color');
  if (elements.length >= minimumElements
    && directional.length >= (spec.minimumDirectionalElements ?? 3)
    && rotation.ratio >= requiredRatio
    && directionCoverage >= requiredRatio
    && (variations.size || variations.color || variations.shape)) methods.push('rotation');
  const sharedExactShape = exactShape.ratio >= requiredRatio;
  const sharedShapeFeature = new Set(elements.map((item) => item.shape)).size >= 2 && shapeFeature.ratio >= requiredRatio;
  if (elements.length >= minimumElements && (sharedExactShape || sharedShapeFeature) && (variations.size || variations.color || variations.rotation)) methods.push('shapeFeature');
  const metrics = { elementCount: elements.length, requiredRatio, color, exactShape, directionalCount: directional.length, rotation, directionCoverage, shapeFeature, variations };
  if (methods.length) return response(true, 'valid', metrics, methods.length > 1 ? ['multiple', ...methods] : methods);
  const strongest = Math.max(color.ratio, exactShape.ratio, directionCoverage, shapeFeature.ratio);
  const hasCommonFeature = elements.length >= minimumElements && strongest >= requiredRatio;
  const code = hasCommonFeature && !Object.values(variations).some(Boolean) ? 'NO_VISIBLE_VARIATION' : strongest >= 0.4 ? 'UNITY_TOO_WEAK' : 'NO_CLEAR_UNITY';
  const fail = (studentDetail) => ({ ...response(false, code, metrics), studentDetail });
  if (elements.length < minimumElements) return fail(`目前有 ${elements.length} 個造形，至少要 ${minimumElements} 個。`);
  if (code === 'NO_VISIBLE_VARIATION') return fail('全部都一樣了。讓一些造形的大小、顏色或方向不同。');
  if (code === 'NO_CLEAR_UNITY') return fail('看不出共同特色。選一種：同一種顏色、同一種造形，或同一個方向。');
  // Point to the common feature that is closest to working, and how many more shapes need it.
  const needed = Math.ceil(elements.length * requiredRatio - 1e-9);
  const featureWords = { rounded: '圓弧的', angular: '有角的' };
  const options = [
    { count: color.count, text: (need) => `${CONTRAST_HUE_LABELS[color.value] ?? '同一種顏色'}的造形有 ${color.count} 個，還差 ${need} 個。把其他造形也改成${CONTRAST_HUE_LABELS[color.value] ?? '同一種顏色'}。` },
    { count: exactShape.count, text: (need) => `${CONTRAST_SHAPE_LABELS[exactShape.value] ?? '同一種造形'}有 ${exactShape.count} 個，還差 ${need} 個。把其他造形也換成${CONTRAST_SHAPE_LABELS[exactShape.value] ?? '同一種造形'}。` },
    { count: rotation.count, text: (need) => `朝同一個方向的造形有 ${rotation.count} 個，還差 ${need} 個。把其他造形也轉成同一個方向。` },
    ...(featureWords[shapeFeature.value] ? [{ count: shapeFeature.count, text: (need) => `${featureWords[shapeFeature.value]}造形有 ${shapeFeature.count} 個，還差 ${need} 個。把其他造形也換成${featureWords[shapeFeature.value]}造形。` }] : [])
  ].sort((a, b) => b.count - a.count);
  const best = options[0];
  return fail(best && needed - best.count > 0 ? best.text(needed - best.count) : '共同特色還不夠清楚。讓更多造形有同樣的顏色、造形或方向。');
}

function hueDistance(first, second) {
  const a = HUE_FAMILIES.indexOf(first);
  const b = HUE_FAMILIES.indexOf(second);
  if (a < 0 || b < 0) return Infinity;
  const raw = Math.abs(a - b);
  return Math.min(raw, HUE_FAMILIES.length - raw);
}

function bestHarmonyHueArc(hues, maximumSpan) {
  const validHues = hues.filter((hue) => HUE_FAMILIES.includes(hue));
  const count = HUE_FAMILIES.length;
  let best = { coverage: 0, start: null, end: null, span: 0, hues: [] };
  for (let startIndex = 0; startIndex < count; startIndex += 1) {
    for (let span = 1; span <= maximumSpan; span += 1) {
      const arcHues = Array.from({ length: span + 1 }, (_, offset) => HUE_FAMILIES[(startIndex + offset) % count]);
      const covered = validHues.filter((hue) => arcHues.includes(hue)).length;
      const coverage = covered / Math.max(1, hues.length);
      if (coverage > best.coverage || (coverage === best.coverage && span < best.span)) {
        best = { coverage, start: arcHues[0], end: arcHues.at(-1), span, hues: arcHues };
      }
    }
  }
  return best;
}

export function validateFormalHarmony({ elements = [], spec = {} }) {
  const minimumElements = spec.minimumElements ?? 4;
  const coverage = spec.harmonyCoverage ?? 0.75;
  const maximumHueArcSpan = spec.maximumHarmonyHueArcSpan ?? 4;
  const hues = elements.map((item) => item.hueFamily ?? item.hue);
  const hueGroups = dominantGroup(elements, (item) => item.hueFamily ?? item.hue);
  const sameHueElements = elements.filter((item) => (item.hueFamily ?? item.hue) === hueGroups.value);
  const sameHueLightness = elements.length >= minimumElements
    && hueGroups.ratio >= coverage
    && new Set(sameHueElements.map((item) => item.lightnessLevel ?? item.lightness)).size >= (spec.minimumLightnessLevels ?? 2);
  const hasLightnessVariation = new Set(elements.map((item) => item.lightnessLevel ?? item.lightness)).size >= (spec.minimumLightnessLevels ?? 2);
  const uniqueHues = [...new Set(hues)];
  const bestHueArc = bestHarmonyHueArc(hues, maximumHueArcSpan);
  const bestNeighborCoverage = bestHueArc.coverage;
  const neighborHue = elements.length >= minimumElements
    && uniqueHues.length >= 2
    && bestNeighborCoverage >= coverage
    && uniqueHues.some((first) => uniqueHues.some((second) => areNeighborHues(first, second)));
  const methods = [];
  if (neighborHue && hasLightnessVariation) methods.push('mixed');
  else if (sameHueLightness) methods.push('sameHueLightness');
  else if (neighborHue) methods.push('neighborHue');
  const maximumHueDistance = uniqueHues.reduce((maximum, first) => Math.max(maximum, ...uniqueHues.map((second) => hueDistance(first, second))), 0);
  const metrics = { elementCount: elements.length, uniqueHues, hueGroups, sameHueLightness, hasLightnessVariation, neighborHue, bestNeighborCoverage, bestHueArc, maximumHueArcSpan, maximumHueDistance };
  if (methods.length) return response(true, 'valid', metrics, methods);
  const fail = (code, studentDetail) => ({ ...response(false, code, metrics), studentDetail });
  const hueName = (hue) => CONTRAST_HUE_LABELS[hue] ?? '這個顏色';
  const tooFew = elements.length < minimumElements ? `目前有 ${elements.length} 個造形，至少要 ${minimumElements} 個。` : null;
  if (uniqueHues.length === 1 && new Set(elements.map((item) => item.lightnessLevel ?? item.lightness)).size === 1) return fail('NO_CLEAR_HARMONY', tooFew ?? '全部是同一個顏色、同一個深淺。加入深淺變化，或換成相鄰的顏色。');
  if (maximumHueDistance >= 3 && bestNeighborCoverage <= 0.5) {
    const main = hueGroups.value;
    const far = [...uniqueHues].sort((a, b) => hueDistance(b, main) - hueDistance(a, main))[0];
    return fail('COLORS_TOO_FAR_APART', tooFew ?? `${hueName(far)}和${hueName(main)}在色環上離得太遠了。把${hueName(far)}換成${hueName(main)}旁邊的顏色。`);
  }
  if (bestNeighborCoverage >= 0.4) {
    const strays = elements.filter((item) => !bestHueArc.hues.includes(item.hueFamily ?? item.hue));
    const detail = strays.length
      ? `還有 ${strays.length} 個造形的顏色離得比較遠，例如${contrastPlace(strays[0], spec)}的${hueName(strays[0].hueFamily ?? strays[0].hue)}${CONTRAST_SHAPE_LABELS[strays[0].shape] ?? '造形'}。`
      : '這些顏色還不夠接近。換成色環上緊鄰的顏色，例如紅和紅橙。';
    return fail('HARMONY_TOO_WEAK', tooFew ?? detail);
  }
  return fail('NO_CLEAR_HARMONY', tooFew ?? '看不出顏色之間的關係。選一個顏色用深淺變化，或用色環上相鄰的顏色。');
}

function alignmentScore(elements, tolerance = 24) {
  if (elements.length < 2) return 0;
  let aligned = 0;
  let pairs = 0;
  for (let first = 0; first < elements.length; first += 1) {
    for (let second = first + 1; second < elements.length; second += 1) {
      pairs += 1;
      if (Math.abs(elements[first].x - elements[second].x) <= tolerance || Math.abs(elements[first].y - elements[second].y) <= tolerance) aligned += 1;
    }
  }
  return pairs ? aligned / pairs : 0;
}

function simplicityMetrics(elements) {
  return {
    elementCount: elements.length,
    uniqueHues: new Set(elements.map((item) => item.hueFamily ?? item.hue)).size,
    uniqueSizes: new Set(elements.map((item) => item.sizeLevel ?? item.size)).size,
    uniqueShapes: new Set(elements.map((item) => item.shape)).size,
    organization: alignmentScore(elements)
  };
}

export function validateFormalSimplicity({ elements = [], beforeState = [], spec = {} }) {
  const before = simplicityMetrics(beforeState);
  const after = simplicityMetrics(elements);
  const coreIds = spec.coreElementIds ?? [];
  const afterIds = new Set(elements.map((item) => item.id));
  const missingCoreIds = coreIds.filter((id) => !afterIds.has(id));
  const nonCoreRemaining = elements.filter((item) => !coreIds.includes(item.id)).length;
  const elementReduction = before.elementCount - after.elementCount;
  const varietyReduction = (before.uniqueHues - after.uniqueHues) + (before.uniqueSizes - after.uniqueSizes) + (before.uniqueShapes - after.uniqueShapes);
  const organizationGain = after.organization - before.organization;
  const methods = [];
  if (elementReduction >= (spec.minimumElementReduction ?? 2)) methods.push('reduce');
  if (organizationGain >= (spec.minimumOrganizationGain ?? 0.16)) methods.push('organize');
  if (varietyReduction >= (spec.minimumVarietyReduction ?? 2)) methods.push('simplifyVariety');
  const metrics = { before, after, elementReduction, varietyReduction, organizationGain, nonCoreRemaining, missingCoreIds };
  const fail = (code, studentDetail) => ({ ...response(false, code, metrics), studentDetail });
  if (missingCoreIds.length) {
    const partName = (id) => (id.includes('petal') ? '紅色花瓣' : id.includes('stem') ? '綠色莖' : id.includes('center') ? '黃色圓心' : '花的一部分');
    const parts = [...new Set(missingCoreIds.map(partName))].join('、');
    return fail('CORE_ELEMENT_MISSING', `中間的花要留下來，${parts}不見了。按「復原本題」重新開始。`);
  }
  if (nonCoreRemaining < (spec.minimumNonCoreRemaining ?? 1)) return fail('OVER_REDUCED', '裝飾全部刪掉了，至少留下 1 個。按「復原本題」重新開始。');
  if (!methods.length) return fail('NOT_SIMPLIFIED', '畫面還沒有變單純。刪掉 2 個以上的裝飾、把造形排整齊，或把顏色改成一樣。');
  if (methods.includes('reduce') && !methods.includes('organize') && !methods.includes('simplifyVariety') && after.organization < 0.12) return fail('STILL_DISORGANIZED', '東西變少了，但剩下的還很散。把剩下的造形排成一排或對齊。');
  if (methods.includes('reduce') && !methods.includes('simplifyVariety') && after.uniqueHues >= before.uniqueHues && after.uniqueSizes >= before.uniqueSizes && after.uniqueShapes >= before.uniqueShapes) return fail('TOO_MUCH_VARIETY', '刪掉了一些，但顏色和大小的種類沒有變少。把一些造形改成一樣的顏色或大小。');
  return response(true, 'valid', metrics, methods.length > 1 ? ['multiple', ...methods] : methods);
}

export const phase6cValidators = Object.freeze({
  repetition: validateFormalRepetition,
  gradation: validateFormalGradation,
  balance: validateFormalBalance,
  rhythm: validateFormalRhythm,
  symmetry: validateFormalSymmetry,
  contrast: validateFormalContrast,
  proportion: validateFormalProportion,
  unity: validateFormalUnity,
  harmony: validateFormalHarmony,
  simplicity: validateFormalSimplicity
});

export function validatePhase6cExperiment(definition, state) {
  const validator = phase6cValidators[definition.principleId];
  if (!validator) throw new Error(`No Phase 6C validator for ${definition.principleId}`);
  const audit = auditComposition(state.workingElements ?? [], {
    preserveElementIds: definition.principleId === 'simplicity'
      ? (state.coreElementIds ?? definition.validationSpec.coreElementIds ?? [])
      : []
  });
  const result = validator({
    elements: audit.effectiveElements,
    beforeState: state.beforeState ?? definition.initialState.beforeState ?? [],
    spec: definition.validationSpec,
    selectedSymmetryMode: state.selectedExperimentOption ?? definition.initialState.selectedSymmetryMode
  });
  const metrics = {
    ...result.metrics,
    compositionAudit: {
      rawElementCount: audit.rawElementCount,
      effectiveElementCount: audit.effectiveElementCount,
      duplicateElementIds: audit.duplicateElementIds,
      overlapGroups: audit.overlapGroups,
      largestOverlapGroup: audit.largestOverlapGroup,
      hasObviousPadding: audit.hasObviousPadding
    }
  };
  return audit.hasObviousPadding
    ? response(false, 'EXCESSIVE_OVERLAP', metrics)
    : { ...result, metrics };
}
