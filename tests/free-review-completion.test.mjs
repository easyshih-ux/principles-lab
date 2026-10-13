import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { completionArtwork } from '../renderers.js';

const stylesSource = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const renderersSource = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');

test('all ten free-review completion pages use dedicated principle artwork', () => {
  const ids = ['repetition', 'gradation', 'symmetry', 'balance', 'contrast', 'rhythm', 'proportion', 'unity', 'harmony', 'simplicity'];
  const artwork = Object.fromEntries(ids.map((id) => [id, completionArtwork(id)]));

  for (const id of ids) assert.ok(artwork[id], `${id} should render completion artwork`);
  assert.match(artwork.repetition, /●[\s\S]*■[\s\S]*●[\s\S]*■/);
  assert.match(artwork.gradation, /gradation-complete-sequence/);
  assert.match(artwork.symmetry, /symmetry-mini/);
  assert.match(artwork.balance, /balance-mini/);
  assert.match(artwork.contrast, /contrast-composition/);
  assert.match(artwork.rhythm, /rhythm-mini/);
  assert.match(artwork.proportion, /proportion-composition/);
  assert.match(artwork.unity, /unity-family/);
  assert.match(artwork.harmony, /harmony-complete/);
  assert.match(artwork.simplicity, /simplicity-complete/);
  assert.notEqual(artwork.proportion, artwork.gradation);
  assert.notEqual(artwork.unity, artwork.harmony);
});

test('all ten principles use concept-specific three-second completion loops', () => {
  const loops = [
    'repeat-complete-loop',
    'gradation-complete-loop',
    'symmetry-complete-axis',
    'balance-complete-loop-heavy',
    'contrast-complete-loop-large',
    'rhythm-complete-loop',
    'proportion-complete-loop-main',
    'unity-complete-loop-feature',
    'harmony-complete-loop',
    'simplicity-complete-loop-focus'
  ];

  for (const animationName of loops) {
    assert.match(stylesSource, new RegExp('animation:' + animationName + ' 3s[^;}]*infinite both'));
    assert.match(stylesSource, new RegExp('@keyframes ' + animationName));
  }
  assert.match(stylesSource, /animation:symmetry-complete-left 3s[^;}]*infinite both/);
  assert.match(stylesSource, /animation:symmetry-complete-right 3s[^;}]*infinite both/);
  assert.match(stylesSource, /55%,100%\{filter:none/);
});

test('balance completion adjusts unequal visual weights by opposing distance changes', () => {
  assert.doesNotMatch(stylesSource, /animation:balance-complete-loop-field/);
  assert.match(stylesSource, /--balance-entry-x:-34px/);
  assert.match(stylesSource, /@keyframes balance-complete-loop-heavy\{0%,4%\{[^}]*- 44px[^}]*\+ 26px[^}]*\}38%\{[^}]*\+ 2px[^}]*- 2px/);
  assert.match(stylesSource, /@keyframes balance-complete-loop-light\{0%,4%\{[^}]*var\(--balance-entry-x\)[^}]*- 26px[^}]*\}38%\{[^}]*\+ 2px[^}]*\+ 2px/);
});

test('harmony completion and wall icon share both warm square colors', () => {
  const artwork = completionArtwork('harmony');
  assert.match(artwork, /square harmony-complete-coral-square/);
  assert.match(artwork, /--x:30%;--y:31%;--w:20px;--h:20px;--family-color:#E78662/);
  assert.match(artwork, /square harmony-complete-warm-square/);
  assert.match(artwork, /--x:57%;--y:39%;--w:55px;--h:55px;--family-color:#E89A5D/);
  assert.match(renderersSource, /square harmony-final-warm-square/);
  assert.match(renderersSource, /square harmony-final-coral-square/);
  assert.match(stylesSource, /\.harmony-final-warm-square\{background:#E89A5D\}/);
  assert.match(stylesSource, /\.harmony-final-coral-square\{background:#E78662\}/);
});

test('harmony completion changes color in place from strong differences to warm harmony', () => {
  const artwork = completionArtwork('harmony');
  for (const startColor of ['black', 'blue', 'yellow', 'red']) {
    assert.match(artwork, new RegExp('--start-color:var\\\(--' + startColor + '\\\)'));
  }
  assert.doesNotMatch(artwork, /--entry-[xy]|--entry-rotation/);
  assert.match(stylesSource, /@keyframes harmony-complete-loop\{0%,4%\{background:var\(--start-color\)[^}]*translate\(-50%,-50%\) scale\(1\)[^}]*\}45%\{background:var\(--family-color\)/);
});

test('repetition experiment animation stays intact while completion pages loop independently', () => {
  assert.match(stylesSource, /\.repeat-success \.review-symbol,\.complete-art-repetition \.review-symbol\{animation:repeat-unit-glow \.42s ease both\}/);
  assert.match(stylesSource, /\.complete-art-repetition \.review-symbol\{[^}]*animation:repeat-complete-loop 3s[^}]*infinite both\}/);
  assert.match(stylesSource, /\.complete-art-gradation \.dot\{[^}]*animation:gradation-complete-loop 3s[^}]*infinite both\}/);
  assert.match(stylesSource, /\.complete-art-gradation \.dot:nth-child\(6\)\{--loop-delay:\.4s\}/);
});

test('completion loops honor reduced motion and keep simplicity on its final composition', () => {
  assert.match(stylesSource, /@media\(prefers-reduced-motion:reduce\)\{\.complete-art \*\{animation:none!important\}/);
  assert.match(stylesSource, /\.complete-art-simplicity \.simplicity-complete-extra\{opacity:0!important\}/);
});
