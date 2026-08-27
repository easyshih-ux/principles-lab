export const CLASSROOM_UNLOCK_STORAGE_KEY = 'formalPrinciplesLab.classroomUnlocks.v1';

export const CLASSROOM_COURSES = Object.freeze([
  Object.freeze({ id: 'recognize', name: '第一關', title: '我看得出來', route: '#level/recognize/start' }),
  Object.freeze({ id: 'discover', name: '第二關', title: '我找得到問題', route: '#level/discover/start' }),
  Object.freeze({ id: 'experiment', name: '第三關', title: '我自己做得出來', route: '#level/experiment/start' })
]);

const PASSCODES = Object.freeze({ recognize: 'LOOK', discover: 'THINK', experiment: 'CREATE' });
const COURSE_IDS = CLASSROOM_COURSES.map(({ id }) => id);

export function createLockedClassroomUnlocks() {
  return Object.fromEntries(COURSE_IDS.map((id) => [id, false]));
}

function normalizedUnlocks(value) {
  const fallback = createLockedClassroomUnlocks();
  if (!value || typeof value !== 'object') return fallback;
  COURSE_IDS.forEach((id) => { fallback[id] = value[id] === true; });
  return fallback;
}

export function loadClassroomUnlocks(storage) {
  if (!storage) return createLockedClassroomUnlocks();
  try {
    return normalizedUnlocks(JSON.parse(storage.getItem(CLASSROOM_UNLOCK_STORAGE_KEY) ?? 'null'));
  } catch {
    return createLockedClassroomUnlocks();
  }
}

export function saveClassroomUnlocks(unlocks, storage) {
  const clean = normalizedUnlocks(unlocks);
  try { storage?.setItem(CLASSROOM_UNLOCK_STORAGE_KEY, JSON.stringify(clean)); } catch { /* classroom gating remains usable in memory */ }
  return clean;
}

export function attemptClassroomUnlock(courseId, input, unlocks, storage) {
  const clean = normalizedUnlocks(unlocks);
  const submitted = String(input ?? '').trim().toUpperCase();
  if (!PASSCODES[courseId] || submitted !== PASSCODES[courseId]) {
    return { ok: false, unlocks: clean };
  }
  const next = { ...clean, [courseId]: true };
  return { ok: true, unlocks: saveClassroomUnlocks(next, storage) };
}

export function resetClassroomUnlocks(storage) {
  const locked = createLockedClassroomUnlocks();
  try { storage?.removeItem(CLASSROOM_UNLOCK_STORAGE_KEY); } catch { /* return a clean in-memory state */ }
  return locked;
}

export function requiredUnlockForRoute(route) {
  if (['recognizeStart', 'recognizeQuestion', 'recognizeComplete'].includes(route?.name)) return 'recognize';
  if (['discoverStart', 'discoverQuestion', 'discoverComplete'].includes(route?.name)) return 'discover';
  if (['experimentStart', 'experiment', 'experimentComplete'].includes(route?.name)) return 'experiment';
  return null;
}

export function isClassroomRouteAllowed(route, unlocks) {
  const courseId = requiredUnlockForRoute(route);
  return courseId == null || unlocks?.[courseId] === true;
}
