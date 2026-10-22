import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stages } from '../data.js';
import { validateStage } from '../validators.js';
import { butterflyScene, initialRocketPieces, OWL_PARTS, owlScene, ROCKET_PIECES, rocketScene } from '../symmetry-scenes.js';

const stage = (id) => stages.find((item) => item.id === id);
const renderer = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const rotations = (markup) => [...markup.matchAll(/rotate\((-?[\d.]+) /g)].map(([, angle]) => Number(angle));

test('symmetry Q1: three butterflies; only B mirrors both position and direction', () => {
  const observe = stage('symmetry-observe');
  assert.deepEqual(observe.options.map(({ variant }) => variant), ['shift', 'mirror', 'off']);
  assert.equal(observe.validation.correctOptionId, 'b');
  assert.match(observe.prompt, /蝴蝶/);
  assert.match(observe.description, /方向也要翻過來/);
  // In the mirrored butterfly every slanted shape on the right has the opposite angle of its left partner.
  const mirror = butterflyScene('mirror');
  const left = rotations(mirror.slice(mirror.indexOf('bf-left'), mirror.indexOf('bf-right')));
  const right = rotations(mirror.slice(mirror.indexOf('bf-right')));
  assert.deepEqual(right.slice(0, left.length), left.map((angle) => -angle));
  // The shifted one keeps the same angles: positions mirrored, directions not.
  const shift = butterflyScene('shift');
  const shiftRight = rotations(shift.slice(shift.indexOf('bf-right')));
  assert.deepEqual(shiftRight.slice(0, left.length), left);
  assert.match(renderer, /option\.scene === 'butterfly' \? butterflyScene\(option\.variant, shouldAnimate\)/);
});

test('symmetry Q2: owl with seven tappable right-side parts; the answer is the eye (highlight on the wrong side)', () => {
  const discover = stage('symmetry-discover');
  assert.equal(discover.scene, 'owl');
  assert.deepEqual(discover.elements.map(({ id }) => id).sort(), OWL_PARTS.map(({ id }) => id).sort());
  assert.equal(discover.validation.correctElementId, 'owl-eye');
  const scene = owlScene();
  for (const { id } of OWL_PARTS) assert.match(scene, new RegExp(`data-element-id="${id}"`));
  assert.equal((scene.match(/class="owl-tap"/g) ?? []).length, OWL_PARTS.length);
  assert.match(scene, /cx="360" cy="144" r="7"/, 'right highlight starts on the outer side');
  assert.match(owlScene({ complete: true }), /cx="344" cy="144" r="7"/, 'after success it moves next to the centre line');
  assert.match(owlScene({ selectedId: 'owl-brow' }), /owl-part is-selected" data-element-id="owl-brow"/);
  assert.equal(validateStage(discover, { selectedElementId: 'owl-eye' }).isValid, true);
  assert.equal(validateStage(discover, { selectedElementId: 'owl-brow' }).isValid, false);
  assert.doesNotMatch(discover.successFeedback + discover.hints.join(''), /顏色/);
});

test('symmetry Q3: rocket pieces start unflipped away from the target; snapping only very close', () => {
  const experiment = stage('symmetry-experiment');
  assert.equal(experiment.scene, 'rocket');
  for (const [id, piece] of Object.entries(ROCKET_PIECES)) {
    assert.deepEqual(experiment.validation.pieces[id].target, piece.target);
    assert.ok(Math.hypot(piece.start.x - piece.target.x, piece.start.y - piece.target.y) > 100);
  }
  assert.deepEqual(Object.values(initialRocketPieces()).map(({ flipped }) => flipped), [false, false]);
  assert.equal(experiment.validation.snapTolerance, 9);   // 1.5% of the 600-wide picture
  assert.equal(experiment.validation.tolerance, 18);      // 3%
  assert.match(experiment.feedbackByCode['piece-direction'], /翻轉方向/);
  assert.match(renderer, /button\('翻轉方向', 'secondary-button', 'flip'\)/);
  assert.match(renderer, /stage\.scene === 'rocket'/);
  const start = rocketScene();
  assert.match(start, /data-piece-id="fin"/);
  assert.match(start, /data-piece-id="booster"/);
  assert.match(rocketScene({ complete: true }), /rocket-success/);
});

test('each symmetry question has a small success animation', () => {
  for (const name of ['butterfly-flap', 'owl-hop', 'rocket-lift', 'rocket-flame']) assert.match(css, new RegExp(`@keyframes ${name}`));
  assert.match(css, /\.butterfly-success \.bf-wings\{/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.butterfly-success/);
  assert.match(butterflyScene('mirror', true), /butterfly-success/);
  assert.match(owlScene({ complete: true }), /owl-success/);
});
