import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeAcademicYear } from '../academic-year.js';
import { bootstrapAcademicYear, createAcademicYear, listAcademicYears, loadActiveAcademicYear, switchActiveAcademicYear, verifyActiveAcademicYear } from '../academic-year-service.js';
import { createAcademicYearManagementController } from '../teacher-academic-year-management.js';
import { academicYearManagementMarkup, teacherClassSettingsMarkup } from '../teacher-page.js';
import { loadClassConfigs } from '../class-config-service.js';

function memoryClient(initial = {}) {
  const docs = new Map(Object.entries(initial));
  const commits = [];
  const ref = (...parts) => parts.join('/');
  return {
    db: 'db', docs, commits,
    doc: (_db, ...parts) => ref(...parts), collection: (_db, name) => name,
    getDoc: async (path) => ({ exists: () => docs.has(path), data: () => docs.get(path) }),
    getDocs: async (request) => {
      const collection = typeof request === 'string' ? request : request.collection;
      const year = request.year;
      return { docs: [...docs.entries()].filter(([key, data]) => key.startsWith(`${collection}/`) && (!year || data.academicYear === year)).map(([, data]) => ({ data: () => data })) };
    },
    where: (_field, _op, year) => ({ year }), query: (collection, constraint) => ({ collection, year: constraint.year }),
    serverTimestamp: () => 'timestamp',
    writeBatch: () => {
      const writes = [];
      return { set: (path, data) => writes.push([path, data]), commit: async () => { commits.push(writes); for (const [path, data] of writes) docs.set(path, data); } };
    },
    runTransaction: async (_db, operation) => {
      const writes = [];
      const transaction = {
        get: async (path) => ({ exists: () => docs.has(path), data: () => docs.get(path) }),
        set: (path, data) => writes.push([path, data])
      };
      await operation(transaction); commits.push(writes); for (const [path, data] of writes) docs.set(path, data);
    }
  };
}

test('active year uses canonical appSettings and only missing/network failures fall back', async () => {
  const canonical = await loadActiveAcademicYear(memoryClient({ 'appSettings/academicYear': { activeAcademicYear: '116' } }));
  assert.deepEqual(canonical, { academicYear: '116', source: 'firestore', initialized: true, warning: '' });
  const missing = await loadActiveAcademicYear(memoryClient());
  assert.equal(missing.source, 'legacy-missing'); assert.equal(missing.academicYear, '115');
  const failedClient = memoryClient(); failedClient.getDoc = async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); };
  const failed = await loadActiveAcademicYear(failedClient);
  assert.equal(failed.source, 'network-fallback'); assert.equal(failed.errorCode, 'unavailable'); assert.match(failed.warning, /暫存年度 115/);
});

test('permission and schema failures never masquerade as a normal legacy bootstrap', async () => {
  const denied = memoryClient(); denied.getDoc = async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); };
  const permissionResult = await loadActiveAcademicYear(denied);
  assert.equal(permissionResult.academicYear, null); assert.equal(permissionResult.source, 'permission-denied');
  const invalid = await loadActiveAcademicYear(memoryClient({ 'appSettings/academicYear': { activeAcademicYear: 'invalid' } }));
  assert.equal(invalid.academicYear, null); assert.equal(invalid.source, 'invalid-schema');
  const programmingError = memoryClient(); programmingError.getDoc = async () => { throw new ReferenceError('bug'); };
  await assert.rejects(() => loadActiveAcademicYear(programmingError), /bug/);
});

test('anonymous auth readiness is awaited before canonical academic-year loading', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const authReady = app.indexOf('await ensureAnonymousAuth(client)');
  const activeYearRead = app.indexOf('const result = await loadActiveAcademicYear(client)');
  assert.ok(authReady >= 0 && activeYearRead > authReady);
});

test('academic years validate canonical trimmed numeric strings', () => {
  assert.equal(normalizeAcademicYear(' 116 '), '116');
  for (const invalid of ['', '  ', '11a', '1', '0000', '12345']) assert.throws(() => normalizeAcademicYear(invalid));
});

test('teacher bootstrap creates only year metadata and settings without class or progress writes', async () => {
  const client = memoryClient();
  await bootstrapAcademicYear(client);
  assert.equal(client.docs.get('academicYears/115').status, 'active');
  assert.equal(client.docs.get('appSettings/academicYear').activeAcademicYear, '115');
  assert.equal([...client.docs.keys()].some((key) => key.startsWith('classConfigs/') || key.startsWith('studentProgress/')), false);
  await assert.rejects(() => bootstrapAcademicYear(client), /已存在/);
});

test('create empty year is archived, rejects duplicates, and never switches settings', async () => {
  const client = memoryClient({ 'appSettings/academicYear': { activeAcademicYear: '115' } });
  const result = await createAcademicYear(client, ' 116 ');
  assert.deepEqual(result, { academicYear: '116', copiedClassCount: 0 });
  assert.equal(client.docs.get('academicYears/116').status, 'archived');
  assert.equal(client.docs.get('appSettings/academicYear').activeAcademicYear, '115');
  await assert.rejects(() => createAcademicYear(client, '116'), /已存在/);
});

test('copy year preserves class configuration under new keys and never copies student progress', async () => {
  const client = memoryClient({
    'classConfigs/115-701': { academicYear: '115', classId: '701', active: true, validSeatNumbers: [1, 3], updatedAt: 'old' },
    'classConfigs/115-702': { academicYear: '115', classId: '702', active: false, validSeatNumbers: [2], updatedAt: 'old' },
    'studentProgress/115-701-1': { academicYear: '115', classId: '701', seatNo: 1 }
  });
  const result = await createAcademicYear(client, '116', { copyFrom: '115' });
  assert.equal(result.copiedClassCount, 2);
  assert.deepEqual(client.docs.get('classConfigs/116-701'), { academicYear: '116', classId: '701', active: true, validSeatNumbers: [1, 3], updatedAt: 'timestamp' });
  assert.equal(client.docs.get('classConfigs/116-702').active, false);
  assert.equal([...client.docs.keys()].filter((key) => key.startsWith('studentProgress/')).length, 1);
});

test('active switch commits settings and both statuses atomically', async () => {
  const client = memoryClient({
    'appSettings/academicYear': { activeAcademicYear: '115', updatedAt: 'old' },
    'academicYears/115': { academicYear: '115', status: 'active', createdAt: 'old', updatedAt: 'old' },
    'academicYears/116': { academicYear: '116', status: 'archived', createdAt: 'old', updatedAt: 'old' }
  });
  await switchActiveAcademicYear(client, '116', '115');
  assert.equal(client.commits.at(-1).length, 3);
  assert.equal(client.docs.get('appSettings/academicYear').activeAcademicYear, '116');
  assert.equal(client.docs.get('academicYears/116').status, 'active');
  assert.equal(client.docs.get('academicYears/115').status, 'archived');
  assert.equal((await verifyActiveAcademicYear(client, '116')).source, 'firestore');
});

test('controller only reports switch success after canonical readback matches', async () => {
  const client = memoryClient({
    'appSettings/academicYear': { activeAcademicYear: '115', updatedAt: 'old' },
    'academicYears/115': { academicYear: '115', status: 'active', createdAt: 'old', updatedAt: 'old' },
    'academicYears/116': { academicYear: '116', status: 'archived', createdAt: 'old', updatedAt: 'old' }
  });
  const controller = createAcademicYearManagementController({ client }); await controller.refresh();
  assert.equal(await controller.activate('116', true), true);
  assert.equal(controller.getState().activeAcademicYear, '116');
  assert.match(controller.getState().message, /已將 116 學年度設為目前學年度/);
});

test('post-write read failure or stale value never reports switch success', async () => {
  for (const readback of ['failure', 'stale']) {
    const client = memoryClient({
      'appSettings/academicYear': { activeAcademicYear: '115', updatedAt: 'old' },
      'academicYears/115': { academicYear: '115', status: 'active', createdAt: 'old', updatedAt: 'old' },
      'academicYears/116': { academicYear: '116', status: 'archived', createdAt: 'old', updatedAt: 'old' }
    });
    const controller = createAcademicYearManagementController({ client }); await controller.refresh();
    const normalGetDoc = client.getDoc;
    client.getDoc = async (path) => {
      if (path === 'appSettings/academicYear') {
        if (readback === 'failure') throw Object.assign(new Error('offline'), { code: 'unavailable' });
        return { exists: () => true, data: () => ({ activeAcademicYear: '115' }) };
      }
      return normalGetDoc(path);
    };
    assert.equal(await controller.activate('116', true), false);
    assert.equal(controller.getState().message, '');
    assert.match(controller.getState().error, /已送出更新.*無法確認最新設定/);
  }
});

test('controller requires confirmation and failed switch leaves its visible active year unchanged', async () => {
  const client = memoryClient({ 'appSettings/academicYear': { activeAcademicYear: '115' }, 'academicYears/115': { academicYear: '115', status: 'active' }, 'academicYears/116': { academicYear: '116', status: 'archived' } });
  const controller = createAcademicYearManagementController({ client }); await controller.refresh();
  assert.equal(await controller.activate('116', false), false);
  const originalRunTransaction = client.runTransaction; client.runTransaction = async () => { throw new Error('offline'); };
  assert.equal(await controller.activate('116', true), false);
  assert.equal(controller.getState().activeAcademicYear, '115');
  client.runTransaction = originalRunTransaction;
});

test('list is newest-first, inconsistency warns, and initialized empty year never uses legacy classes', async () => {
  const client = memoryClient({ 'academicYears/115': { academicYear: '115', status: 'active' }, 'academicYears/117': { academicYear: '117', status: 'archived' }, 'academicYears/116': { academicYear: '116', status: 'archived' } });
  assert.deepEqual((await listAcademicYears(client, '115')).years.map((item) => item.academicYear), ['117', '116', '115']);
  assert.equal((await listAcademicYears(client, '116')).inconsistent, true);
  const empty = await loadClassConfigs(client, '116', undefined, { allowLegacyFallback: false });
  assert.equal(empty.source, 'firestore'); assert.deepEqual(empty.configs, []);
  assert.match(teacherClassSettingsMarkup({ academicYear: '116', mode: 'list', source: 'firestore', configs: [], message: '', error: '' }), /116 學年度尚未建立班級設定/);
});

test('teacher management UI exposes bootstrap, add modes, current protection, and confirmation wiring', () => {
  const markup = academicYearManagementMarkup({ activeAcademicYear: '115', initialized: true, warning: '', inconsistent: false, mode: 'list', status: 'success', years: [{ academicYear: '116', status: 'archived' }, { academicYear: '115', status: 'active' }], message: '', error: '' });
  assert.match(markup, /116 學年度[\s\S]*設為目前學年度/); assert.match(markup, /目前年度不可封存/); assert.match(markup, /＋ 新增學年度/);
  const source = readFileSync(new URL('../teacher-page.js', import.meta.url), 'utf8');
  assert.match(source, /confirm\(`確定將 \$\{academicYear\} 學年度設為目前學年度嗎/);
  assert.doesNotMatch(source, /deleteDoc/);
});
