import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCheckpointTracker, shouldStartFresh } from '../student-handoff.js';

// Shared iPads (10/22): when a different student logs in, or a student ends the session, the page
// starts fresh — after the previous student's completion marks have been sent to the cloud.
const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('Hand-off: only a different student starts fresh; the same student keeps the work', () => {
  assert.equal(shouldStartFresh('115-701-03', '115-701-04'), true, 'next student without pressing 結束');
  assert.equal(shouldStartFresh('115-701-03', '115-702-03'), true, 'same seat, another class');
  assert.equal(shouldStartFresh('115-701-03', '115-701-03'), false, 'same student logs in again');
  assert.equal(shouldStartFresh(null, '115-701-03'), false, 'first student on a fresh page');
});

test('Hand-off: pending completion marks are waited for before the page clears', async () => {
  const tracker = createCheckpointTracker();
  let written = false;
  tracker.track(new Promise((resolve) => setTimeout(() => { written = true; resolve(); }, 30)));
  tracker.track(Promise.reject(new Error('offline')).catch(() => {}));
  const result = await tracker.flush(1000);
  assert.equal(result.finished, true);
  assert.equal(written, true);
  assert.equal(tracker.size, 0);
});

test('Hand-off: a cloud write that never answers does not block the next student forever', async () => {
  const tracker = createCheckpointTracker();
  tracker.track(new Promise(() => {}));
  const started = Date.now();
  const result = await tracker.flush(50);
  assert.equal(result.finished, false);
  assert.ok(Date.now() - started < 1000);
});

test('Hand-off: app wiring — checkpoints are tracked, login compares students, ending starts fresh', () => {
  assert.match(appSource, /checkpointWrites\.track\(writeStudentProgressCheckpoint\(state\.currentStudent, checkpointName\)/);
  const fresh = appSource.slice(appSource.indexOf('async function startFreshForNextStudent'));
  assert.ok(fresh.indexOf('await checkpointWrites.flush()') < fresh.indexOf('location.reload()'), 'marks are flushed before the page reloads');
  const confirm = appSource.slice(appSource.indexOf("querySelector('#identity-confirm')"), appSource.indexOf('function attachStudentControls'));
  assert.match(confirm, /shouldStartFresh\(progressOwner, state\.currentStudent\.studentKey\)/);
  assert.ok(confirm.indexOf('startFreshForNextStudent') < confirm.indexOf('renderCurrentRoute()'), 'a different student never sees the old work');
  const end = appSource.slice(appSource.indexOf("querySelector('#student-end-confirm')"));
  assert.match(end.slice(0, 600), /startFreshForNextStudent\(\)/);
});

test('Hand-off: the next student is never marked with the third level the previous student finished', async () => {
  // Model of the page: progress lives in memory; a fresh start replaces it entirely.
  const writes = [];
  const tracker = createCheckpointTracker();
  let page = { owner: '115-701-03', experimentCompleted: true };
  const complete = (student) => { if (page.experimentCompleted) tracker.track(Promise.resolve(writes.push([student, 'level3Complete']))); };
  complete('115-701-03'); // the previous student finished level 3
  const next = '115-701-04';
  if (shouldStartFresh(page.owner, next)) { await tracker.flush(); page = { owner: next, experimentCompleted: false }; }
  complete(next); // the next student reaches a completion screen
  assert.deepEqual(writes, [['115-701-03', 'level3Complete']]);
});
