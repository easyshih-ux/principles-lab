import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BACK_GUARD_HASH, BACK_GUARD_NOTICE, createBackGuard } from '../student-back-guard.js';

function fakeBrowser(startHash) {
  const entries = [{ hash: startHash, state: null }];
  let index = 0;
  const location = { get hash() { return entries[index].hash; } };
  const history = {
    replaceState(state, _title, hash) { entries[index] = { hash, state }; },
    pushState(state, _title, hash) { entries.splice(index + 1); entries.push({ hash, state }); index += 1; },
    back() { if (index > 0) index -= 1; },
    forward() { if (index < entries.length - 1) index += 1; }
  };
  return { entries, location, history, get index() { return index; } };
}

test('a signed-in student gets a stay entry just below the current page', () => {
  const browser = fakeBrowser('#home');
  const guard = createBackGuard({ history: browser.history, location: browser.location, isActive: () => true });
  assert.equal(guard.install(), true);
  assert.deepEqual(browser.entries.map(({ hash }) => hash), [BACK_GUARD_HASH, '#home']);
  assert.equal(browser.location.hash, '#home');
  browser.history.back();
  assert.equal(guard.isGuardHash(), true);
  browser.history.forward();
  assert.equal(browser.location.hash, '#home');
});

test('the stay entry is placed only once per student, and again after reset', () => {
  const browser = fakeBrowser('#home');
  const guard = createBackGuard({ history: browser.history, location: browser.location, isActive: () => true });
  guard.install();
  assert.equal(guard.install(), false);
  assert.equal(browser.entries.filter(({ hash }) => hash === BACK_GUARD_HASH).length, 1);
  guard.reset();
  assert.equal(guard.install(), true);
});

test('nothing is added when no student is signed in', () => {
  const browser = fakeBrowser('#student');
  const guard = createBackGuard({ history: browser.history, location: browser.location, isActive: () => false });
  assert.equal(guard.install(), false);
  assert.deepEqual(browser.entries.map(({ hash }) => hash), ['#student']);
});

test('app wires the guard: taps install it, the stay entry bounces forward with a notice, a new student resets it', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /student-back-guard\.js\?v=back-guard-1/);
  assert.match(app, /addEventListener\('pointerdown', \(\) => backGuard\.install\(\), \{ capture: true \}\)/);
  assert.match(app, /if \(backGuard\.isGuardHash\(\)\) leaveGuardEntry\(\);\s*else renderCurrentRoute\(\);/);
  assert.match(app, /history\.forward\(\);/);
  assert.match(app, /backGuard\.reset\(\);\s*history\.replaceState\(null, '', nextHash\);/);
  assert.match(app, /isActive: \(\) => !isExploreMode && Boolean\(state\.currentStudent\) && !isTeacherTeachingMode\(\)/);
  assert.match(BACK_GUARD_NOTICE, /結束本次使用/);
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.back-guard-notice\{/);
});
