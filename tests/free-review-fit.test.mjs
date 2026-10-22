import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stages } from '../data.js';

const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const renderers = await readFile(new URL('../renderers.js', import.meta.url), 'utf8');

test('free-practice answer cards shrink their pictures to the card width on iPads', () => {
  assert.match(css, /\.choice-art\{container-type:inline-size\}/);
  assert.match(css, /\.choice-art \.review-symbol\{[^}]*font-size:min\(48px,11cqi\)/);
  assert.match(css, /\.choice-art \.proportion-composition i\{[^}]*calc\(var\(--shape-n\) \* min\(1px,\.32cqi\)\)/);
  assert.match(renderers, /--shape-size:\$\{size\}px;--shape-n:\$\{size\};/);
});

test('the six repetition symbols fit a 240-point card (iPad held upright)', () => {
  const card = 240;
  const cqi = card / 100;
  const box = Math.min(54, 13 * cqi);
  const gap = Math.min(12, 2.5 * cqi);
  const longest = Math.max(...stages.find(({ id }) => id === 'repetition-observe').options.map(({ symbols }) => symbols.length));
  assert.ok(longest * box + (longest - 1) * gap <= card * 0.95);
});

test('the proportion pictures fit a 240-point card (iPad held upright)', () => {
  const card = 240;
  const unit = Math.min(1, 0.32 * card / 100);
  const gap = Math.min(13, 3 * card / 100);
  for (const { sizes } of stages.find(({ id }) => id === 'proportion-observe').options) {
    const width = sizes.reduce((sum, size) => sum + size * unit, 0) + (sizes.length - 1) * gap;
    assert.ok(width <= card * 0.95, `${width}`);
  }
});

test('in the proportion question the correct artwork has one clear main shape (at least 3.5 times the others)', () => {
  const stage = stages.find(({ id }) => id === 'proportion-observe');
  const correct = stage.options.find(({ id }) => id === stage.validation.correctOptionId);
  const [main, ...supports] = correct.sizes;
  assert.ok(main >= Math.max(...supports) * 3.5);
});
