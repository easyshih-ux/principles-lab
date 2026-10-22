import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 10/22: an iPad kept an old app.js after an update. Each release changes the app.js version in both
// entry pages so browsers fetch the new program; the two pages must always load the same versions.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
function versionOf(html, file) {
  const start = html.indexOf(`${file}?v=`);
  if (start < 0) return null;
  const rest = html.slice(start + file.length + 3);
  return rest.slice(0, rest.indexOf('"'));
}

test('class and explore pages load the same app.js and styles.css versions', () => {
  const main = read('../index.html');
  const explore = read('../explore/index.html');
  assert.ok(versionOf(main, 'app.js'));
  assert.equal(versionOf(explore, 'app.js'), versionOf(main, 'app.js'));
  assert.equal(versionOf(explore, 'styles.css'), versionOf(main, 'styles.css'));
});
