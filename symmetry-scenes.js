// 10/22 自由練習「對稱」三題的畫面：蝴蝶（看出方向）、貓頭鷹（找出位置差一點）、火箭（自己做出鏡像）。
// 只用創作挑戰也有的造形（圓、方、三角形、長方形、半圓、線），斜放或朝向一邊的造形鏡像時方向要翻轉。

const C = {
  red: '#e85d4a', blue: '#3d78b4', yellow: '#f2c94c', black: '#2b2b2b', white: '#ffffff',
  orange: '#ef8a3c', cream: '#f7f1e6', navy: '#22314f', sky: '#9cc6ea',
  owl: '#9a6b4b', owlBelly: '#e9d3b0', owlWing: '#6b4a35', tuft: '#8a5a3c', feather: '#fff3dc', smoke: '#d8dde6'
};

const rect = (cx, cy, w, h, rot, fill, extra = '', rx = 4) => `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})" ${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const triangle = (cx, cy, w, h, rot, fill, extra = '') => `<polygon points="${cx},${cy - h / 2} ${cx + w / 2},${cy + h / 2} ${cx - w / 2},${cy + h / 2}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})" ${extra}/>`;
const half = (cx, cy, r, rot, fill, extra = '') => `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy} Z" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})" ${extra}/>`;
const svg = (width, height, body, label, extraClass = '') => `<svg class="symmetry-scene ${extraClass}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}">${body}</svg>`;

// ---------- 第一題：蝴蝶 ----------
function butterflySide(side, flipped = true) {
  const x = (distance) => 150 + side * distance;
  const turn = (angle) => (flipped ? side * angle : -angle);
  const antennaAngle = flipped ? 25 * side : -25;
  const tipX = x(13) + Math.sin(antennaAngle * Math.PI / 180) * 23;
  const tipY = 52 - Math.cos(antennaAngle * Math.PI / 180) * 23;
  return [
    circle(x(50), 100, 46, C.red), circle(x(40), 170, 32, C.blue),
    triangle(x(56), 96, 26, 30, turn(-50), C.yellow), triangle(x(44), 172, 18, 22, turn(-140), C.yellow),
    rect(x(13), 52, 4, 46, antennaAngle, C.black, '', 2), circle(Math.round(tipX * 10) / 10, Math.round(tipY * 10) / 10, 6, C.black)
  ];
}

// variant: 'mirror'（正確）｜'shift'（右邊只是搬過去，方向沒翻）｜'off'（右下翅偏低、少一個三角形）
export function butterflyScene(variant, animated = false) {
  const left = butterflySide(-1);
  let right = butterflySide(1, variant !== 'shift');
  if (variant === 'off') right = [right[0], circle(190, 184, 32, C.blue), '', triangle(194, 186, 18, 22, -140, C.yellow), right[4], right[5]];
  const body = rect(150, 140, 16, 112, 0, C.black, '', 6) + circle(150, 82, 12, C.black);
  const axis = '<line x1="150" y1="6" x2="150" y2="254" stroke="#b5b0a8" stroke-width="1.5" stroke-dasharray="6 5"/>';
  return svg(300, 260, `${axis}<g class="bf-wings bf-left">${left.join('')}</g><g class="bf-wings bf-right">${right.join('')}</g>${body}`,
    '蝴蝶', `butterfly-scene ${animated ? 'butterfly-success' : ''}`);
}

// ---------- 第二題：貓頭鷹 ----------
export const OWL_PARTS = Object.freeze([
  Object.freeze({ id: 'owl-tuft', name: '耳羽' }),
  Object.freeze({ id: 'owl-brow', name: '眉毛' }),
  Object.freeze({ id: 'owl-eye', name: '眼睛' }),
  Object.freeze({ id: 'owl-wing', name: '翅膀' }),
  Object.freeze({ id: 'owl-feather-1', name: '上面的肚子羽毛' }),
  Object.freeze({ id: 'owl-feather-2', name: '下面的肚子羽毛' }),
  Object.freeze({ id: 'owl-foot', name: '腳' })
]);

function owlSide(side, wrongHighlight = false) {
  const x = (distance) => 300 + side * distance;
  const turn = (angle) => side * angle;
  const highlightX = wrongHighlight ? 300 + side * 60 : x(44);
  return {
    'owl-tuft': triangle(x(78), 70, 46, 70, turn(-25), C.tuft),
    'owl-wing': half(x(118), 230, 62, turn(-70), C.owlWing),
    'owl-eye': circle(x(58), 150, 46, C.white, `stroke="${C.black}" stroke-width="5"`) + circle(x(52), 152, 22, C.black) + circle(highlightX, 144, 7, C.white),
    'owl-brow': rect(x(58), 96, 56, 10, turn(-15), C.black, '', 5),
    'owl-feather-1': triangle(x(36), 262, 22, 18, 180, C.feather),
    'owl-feather-2': triangle(x(34), 300, 22, 18, 180, C.feather),
    'owl-foot': rect(x(30), 372, 12, 30, turn(20), C.yellow, '', 4)
  };
}

// Bigger invisible tap areas, so small parts are easy to tap on an iPad.
const OWL_TAP = { 'owl-tuft': [378, 70, 34], 'owl-wing': [418, 230, 40], 'owl-eye': [358, 150, 48], 'owl-brow': [358, 96, 30], 'owl-feather-1': [336, 262, 22], 'owl-feather-2': [334, 300, 22], 'owl-foot': [330, 372, 24] };

export function owlScene({ selectedId = null, complete = false } = {}) {
  const left = owlSide(-1);
  const right = owlSide(1, !complete);
  const body = circle(300, 220, 150, C.owl) + circle(300, 270, 92, C.owlBelly);
  const middle = triangle(300, 195, 30, 34, 180, C.yellow) + triangle(300, 330, 22, 18, 180, C.feather);
  const order = ['owl-wing', 'owl-tuft', 'owl-feather-1', 'owl-feather-2', 'owl-foot', 'owl-brow', 'owl-eye'];
  const leftMarkup = order.map((id) => left[id]).join('');
  const rightMarkup = order.map((id) => {
    const part = OWL_PARTS.find((item) => item.id === id);
    const [cx, cy, r] = OWL_TAP[id];
    return `<g class="owl-part ${selectedId === id ? 'is-selected' : ''}" data-element-id="${id}" role="button" tabindex="0" aria-label="右邊的${part.name}">${right[id]}<circle class="owl-tap" cx="${cx}" cy="${cy}" r="${r}" fill="transparent"/></g>`;
  }).join('');
  return svg(600, 400, `${body}<g class="owl-left">${leftMarkup}</g>${middle}${rightMarkup}`,
    '貓頭鷹', `owl-scene ${complete ? 'owl-success' : ''}`);
}

// ---------- 第三題：火箭 ----------
export const ROCKET_PIECES = Object.freeze({
  fin: Object.freeze({ name: '尾翼', shape: 'triangle', w: 60, h: 120, angle: 26, target: Object.freeze({ x: 386, y: 372 }), start: Object.freeze({ x: 505, y: 440 }) }),
  booster: Object.freeze({ name: '推進器', shape: 'rect', w: 22, h: 84, angle: 18, target: Object.freeze({ x: 368, y: 280 }), start: Object.freeze({ x: 480, y: 130 }) })
});
export const ROCKET_BOUNDS = Object.freeze({ minX: 320, maxX: 575, minY: 40, maxY: 500 });

export function initialRocketPieces() {
  return Object.fromEntries(Object.entries(ROCKET_PIECES).map(([id, piece]) => [id, { x: piece.start.x, y: piece.start.y, flipped: false }]));
}

export function rocketPieceMarkup(id, piece, { selected = false, placed = false } = {}) {
  const spec = ROCKET_PIECES[id];
  const rotation = piece.flipped ? spec.angle : -spec.angle;
  const fill = spec.shape === 'triangle' ? C.red : C.yellow;
  const outline = placed ? '' : `stroke="${C.white}" stroke-width="3" stroke-dasharray="7 5"`;
  const shape = spec.shape === 'triangle'
    ? triangle(piece.x, piece.y, spec.w, spec.h, rotation, fill, outline)
    : rect(piece.x, piece.y, spec.w, spec.h, rotation, fill, outline, 11);
  return `<g class="rocket-piece ${selected ? 'is-selected' : ''}" data-piece-id="${id}" role="button" tabindex="${placed ? -1 : 0}" aria-label="右邊的${spec.name}">${shape}<circle class="rocket-tap" cx="${piece.x}" cy="${piece.y}" r="${Math.max(spec.h / 2, 36)}" fill="transparent"/></g>`;
}

export function rocketScene({ pieces = initialRocketPieces(), selectedPiece = null, complete = false } = {}) {
  const stars = [[60, 60, 3], [120, 180, 2], [80, 330, 3], [150, 440, 2], [520, 70, 3], [470, 210, 2], [560, 300, 3], [500, 470, 2], [40, 470, 2], [560, 160, 2]]
    .map(([x, y, r], index) => circle(x, y, r, C.white, `class="rocket-star" style="--delay:${index * 0.08}s" opacity=".85"`)).join('');
  const smoke = circle(272, 505, 20, C.smoke) + circle(328, 505, 20, C.smoke) + circle(300, 515, 24, '#e9ecf1');
  const flame = `<g class="rocket-flame">${triangle(300, 450, 56, 80, 180, C.orange)}${triangle(300, 440, 30, 50, 180, C.yellow)}</g>`;
  const leftParts = triangle(214, 372, 60, 120, -26, C.red) + rect(232, 280, 22, 84, -18, C.yellow, '', 11);
  const body = rect(300, 280, 120, 250, 0, C.cream, '', 60) + half(300, 215, 60, 180, C.red) + triangle(300, 146, 24, 26, 0, C.red)
    + rect(300, 330, 120, 18, 0, C.red, '', 0) + circle(300, 262, 34, C.black) + circle(300, 262, 26, C.sky) + circle(291, 253, 7, C.white)
    + rect(300, 402, 70, 26, 0, C.black, '', 6);
  const movable = Object.entries(pieces).map(([id, piece]) => rocketPieceMarkup(id, piece, { selected: selectedPiece === id, placed: complete })).join('');
  return svg(600, 540, `<rect width="600" height="540" rx="14" fill="${C.navy}"/>${stars}<g class="rocket-ship">${smoke}${flame}${leftParts}${body}${complete ? movable : ''}</g>${complete ? '' : movable}`,
    '火箭', `rocket-scene ${complete ? 'rocket-success' : ''}`);
}
