import { LEGACY_DEFAULT_ACADEMIC_YEAR, normalizeAcademicYear } from './academic-year.js?v=v2-d3-1';
import { buildClassConfigData, buildClassConfigKey, loadClassConfigs } from './class-config-service.js?v=v2-d3-1';

export const ACADEMIC_YEARS_COLLECTION = 'academicYears';
export const ACADEMIC_YEAR_SETTINGS_COLLECTION = 'appSettings';
export const ACADEMIC_YEAR_SETTINGS_DOCUMENT = 'academicYear';
const SAFE_BATCH_SIZE = 450;

function settingsRef(client) { return client.doc(client.db, ACADEMIC_YEAR_SETTINGS_COLLECTION, ACADEMIC_YEAR_SETTINGS_DOCUMENT); }
function yearRef(client, academicYear) { return client.doc(client.db, ACADEMIC_YEARS_COLLECTION, academicYear); }

export async function loadActiveAcademicYear(client) {
  try {
    const snapshot = await client.getDoc(settingsRef(client));
    if (!snapshot.exists()) return { academicYear: LEGACY_DEFAULT_ACADEMIC_YEAR, source: 'legacy-missing', initialized: false, warning: '尚未建立學年度管理設定，目前暫用 115 學年度。' };
    const academicYear = normalizeAcademicYear(snapshot.data()?.activeAcademicYear);
    return { academicYear, source: 'firestore', initialized: true, warning: '' };
  } catch (error) {
    return { academicYear: LEGACY_DEFAULT_ACADEMIC_YEAR, source: 'legacy-error', initialized: false, warning: '學年度設定暫時無法連線，目前使用暫存年度 115。', cause: error };
  }
}

export async function listAcademicYears(client, activeAcademicYear) {
  const snapshot = await client.getDocs(client.collection(client.db, ACADEMIC_YEARS_COLLECTION));
  const years = snapshot.docs.map((item) => {
    const data = item.data();
    return { academicYear: normalizeAcademicYear(data.academicYear), status: data.status };
  }).sort((left, right) => Number(right.academicYear) - Number(left.academicYear));
  const activeYears = years.filter((year) => year.status === 'active').map((year) => year.academicYear);
  const inconsistent = activeYears.length !== 1 || activeYears[0] !== activeAcademicYear;
  return { years, inconsistent };
}

export async function bootstrapAcademicYear(client) {
  const settings = await client.getDoc(settingsRef(client));
  if (settings.exists()) throw new TypeError('學年度管理設定已存在。');
  const timestamp = client.serverTimestamp();
  const batch = client.writeBatch(client.db);
  batch.set(yearRef(client, LEGACY_DEFAULT_ACADEMIC_YEAR), { academicYear: LEGACY_DEFAULT_ACADEMIC_YEAR, status: 'active', createdAt: timestamp, updatedAt: timestamp });
  batch.set(settingsRef(client), { activeAcademicYear: LEGACY_DEFAULT_ACADEMIC_YEAR, updatedAt: timestamp });
  await batch.commit();
  return LEGACY_DEFAULT_ACADEMIC_YEAR;
}

async function commitInChunks(client, writes) {
  for (let offset = 0; offset < writes.length; offset += SAFE_BATCH_SIZE) {
    const batch = client.writeBatch(client.db);
    for (const write of writes.slice(offset, offset + SAFE_BATCH_SIZE)) batch.set(write.ref, write.data);
    await batch.commit();
  }
}

export async function createAcademicYear(client, value, { copyFrom = null } = {}) {
  const academicYear = normalizeAcademicYear(value);
  const target = yearRef(client, academicYear);
  if ((await client.getDoc(target)).exists()) throw new TypeError(`${academicYear} 學年度已存在。`);
  let copiedConfigs = [];
  if (copyFrom) {
    const sourceYear = normalizeAcademicYear(copyFrom);
    const result = await loadClassConfigs(client, sourceYear, [], { allowLegacyFallback: false });
    if (result.status === 'error') throw result.cause ?? new Error('無法讀取班級設定');
    copiedConfigs = result.configs;
  }
  const timestamp = client.serverTimestamp();
  const writes = [];
  for (const config of copiedConfigs) {
    const data = buildClassConfigData({ ...config, academicYear }, timestamp, academicYear);
    writes.push({ ref: client.doc(client.db, 'classConfigs', buildClassConfigKey(academicYear, config.classId)), data });
  }
  writes.push({ ref: target, data: { academicYear, status: 'archived', createdAt: timestamp, updatedAt: timestamp } });
  await commitInChunks(client, writes);
  return { academicYear, copiedClassCount: copiedConfigs.length };
}

export async function switchActiveAcademicYear(client, nextValue, currentValue) {
  const nextYear = normalizeAcademicYear(nextValue);
  normalizeAcademicYear(currentValue);
  await client.runTransaction(client.db, async (transaction) => {
    const settingsSnapshot = await transaction.get(settingsRef(client));
    if (!settingsSnapshot.exists()) throw new TypeError('尚未建立學年度管理設定。');
    const currentYear = normalizeAcademicYear(settingsSnapshot.data().activeAcademicYear);
    if (nextYear === currentYear) return;
    const targetRef = yearRef(client, nextYear);
    const currentRef = yearRef(client, currentYear);
    const target = await transaction.get(targetRef);
    const current = await transaction.get(currentRef);
    if (!target.exists()) throw new TypeError(`${nextYear} 學年度不存在。`);
    const timestamp = client.serverTimestamp();
    transaction.set(settingsRef(client), { activeAcademicYear: nextYear, updatedAt: timestamp });
    transaction.set(targetRef, { ...target.data(), academicYear: nextYear, status: 'active', updatedAt: timestamp });
    if (current.exists()) transaction.set(currentRef, { ...current.data(), academicYear: currentYear, status: 'archived', updatedAt: timestamp });
  });
  return nextYear;
}
