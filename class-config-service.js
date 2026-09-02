import { LEGACY_DEFAULT_ACADEMIC_YEAR } from './academic-year.js?v=v2-d3-1';
import { CLASSROOMS } from './classroom-config.js';

export const CLASS_CONFIG_COLLECTION = 'classConfigs';
export const DEFAULT_NEW_CLASS_MAX_SEAT = 30;

export function buildClassConfigKey(academicYear, classId) {
  const year = String(academicYear).trim();
  const id = String(classId).trim();
  if (!/^\d+$/.test(year) || !/^\d{3}$/.test(id)) return null;
  return `${year}-${id}`;
}

export function normalizeValidSeatNumbers(seats) {
  if (!Array.isArray(seats)) throw new TypeError('有效座號必須是陣列');
  const normalized = seats.map(Number);
  if (normalized.some((seat) => !Number.isInteger(seat) || seat <= 0)) {
    throw new TypeError('座號必須是正整數');
  }
  return [...new Set(normalized)].sort((left, right) => left - right);
}

export function normalizeClassConfig(input, academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR) {
  const year = String(input?.academicYear ?? academicYear).trim();
  const classId = String(input?.classId ?? input?.id ?? '').trim();
  if (!buildClassConfigKey(year, classId) || typeof input?.active !== 'boolean') {
    throw new TypeError('班級設定格式不正確');
  }
  return Object.freeze({
    academicYear: year,
    classId,
    id: classId,
    active: input.active,
    validSeatNumbers: Object.freeze(normalizeValidSeatNumbers(input.validSeatNumbers))
  });
}

export function fallbackClassConfigs(academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR, classrooms = CLASSROOMS) {
  return classrooms.map((item) => normalizeClassConfig({
    academicYear,
    classId: item.id,
    active: item.active !== false,
    validSeatNumbers: item.validSeatNumbers
  }, academicYear));
}

export async function loadClassConfigs(client, academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR, classrooms = CLASSROOMS, { allowLegacyFallback = true } = {}) {
  try {
    const reference = client.collection(client.db, CLASS_CONFIG_COLLECTION);
    const request = client.query(reference, client.where('academicYear', '==', academicYear));
    const snapshot = await client.getDocs(request);
    const configs = snapshot.docs.map((item) => normalizeClassConfig(item.data(), academicYear))
      .sort((left, right) => left.classId.localeCompare(right.classId, 'en', { numeric: true }));
    if (configs.length) return { status: 'success', source: 'firestore', configs, error: '' };
    if (!allowLegacyFallback) return { status: 'empty', source: 'firestore', configs: [], error: '' };
    return { status: 'empty', source: 'fallback', configs: fallbackClassConfigs(academicYear, classrooms), error: '' };
  } catch (error) {
    return {
      status: 'error', source: allowLegacyFallback ? 'fallback' : 'firestore',
      configs: allowLegacyFallback ? fallbackClassConfigs(academicYear, classrooms) : [],
      error: allowLegacyFallback ? '班級設定暫時無法連線，目前使用既有班級設定。' : '班級設定暫時無法連線。', cause: error
    };
  }
}

export function buildClassConfigData(input, updatedAt, academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR) {
  const config = normalizeClassConfig(input, academicYear);
  return {
    academicYear: config.academicYear,
    classId: config.classId,
    active: config.active,
    validSeatNumbers: [...config.validSeatNumbers],
    updatedAt
  };
}

export async function saveClassConfig(client, input, academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR) {
  const data = buildClassConfigData(input, client.serverTimestamp(), academicYear);
  const key = buildClassConfigKey(data.academicYear, data.classId);
  await client.setDoc(client.doc(client.db, CLASS_CONFIG_COLLECTION, key), data, { merge: false });
  return normalizeClassConfig(data, academicYear);
}

export async function bootstrapClassConfigs(client, academicYear = LEGACY_DEFAULT_ACADEMIC_YEAR, classrooms = CLASSROOMS) {
  const configs = fallbackClassConfigs(academicYear, classrooms);
  const batch = client.writeBatch(client.db);
  for (const config of configs) {
    const data = buildClassConfigData(config, client.serverTimestamp(), academicYear);
    batch.set(client.doc(client.db, CLASS_CONFIG_COLLECTION, buildClassConfigKey(academicYear, config.classId)), data);
  }
  await batch.commit();
  return configs;
}

export function seatsForMaximum(maxSeat, previousSeats = [], previousMaximum = 0) {
  const maximum = Number(maxSeat);
  if (!Number.isInteger(maximum) || maximum <= 0 || maximum > 200) throw new TypeError('最大座號不正確');
  const prior = new Set(normalizeValidSeatNumbers(previousSeats).filter((seat) => seat <= maximum));
  const priorMaximum = Number(previousMaximum) || (previousSeats.length ? Math.max(...previousSeats.map(Number)) : 0);
  for (let seat = priorMaximum + 1; seat <= maximum; seat += 1) prior.add(seat);
  return [...prior].sort((left, right) => left - right);
}
