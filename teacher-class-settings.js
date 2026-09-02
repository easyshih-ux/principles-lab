import { ACTIVE_ACADEMIC_YEAR } from './academic-year.js';
import {
  DEFAULT_NEW_CLASS_MAX_SEAT,
  bootstrapClassConfigs,
  loadClassConfigs,
  normalizeClassConfig,
  saveClassConfig,
  seatsForMaximum
} from './class-config-service.js';

export function createNewClassDraft(classId = '', maximum = DEFAULT_NEW_CLASS_MAX_SEAT) {
  return {
    academicYear: ACTIVE_ACADEMIC_YEAR,
    classId: String(classId).trim(), active: true, maximum,
    validSeatNumbers: Array.from({ length: maximum }, (_, index) => index + 1)
  };
}

export function createEditClassDraft(config) {
  const normalized = normalizeClassConfig(config);
  return {
    ...normalized,
    maximum: normalized.validSeatNumbers.length ? Math.max(...normalized.validSeatNumbers) : 1,
    validSeatNumbers: [...normalized.validSeatNumbers]
  };
}

export function toggleDraftSeat(draft, seatNo) {
  const seat = Number(seatNo);
  const selected = new Set(draft.validSeatNumbers);
  if (selected.has(seat)) selected.delete(seat); else selected.add(seat);
  return { ...draft, validSeatNumbers: [...selected].sort((a, b) => a - b) };
}

export function changeDraftMaximum(draft, maximum) {
  return { ...draft, maximum: Number(maximum), validSeatNumbers: seatsForMaximum(maximum, draft.validSeatNumbers, draft.maximum) };
}

export function validateClassDraft(draft, configs, originalClassId = '') {
  const classId = String(draft.classId).trim();
  if (!/^\d{3}$/.test(classId)) throw new TypeError('請輸入三位數班級代碼。');
  if (configs.some((config) => config.classId === classId && classId !== originalClassId)) {
    throw new TypeError('目前學年度已有相同班級。');
  }
  return normalizeClassConfig({ ...draft, classId });
}

export function createTeacherClassSettingsController({ client, onChange = () => {} }) {
  const state = { status: 'loading', source: '', configs: [], mode: 'list', draft: null, originalClassId: '', message: '', error: '' };
  const notify = () => onChange({ ...state, configs: [...state.configs] });
  async function refresh() {
    state.status = 'loading'; notify();
    const result = await loadClassConfigs(client);
    Object.assign(state, result, { mode: 'list', draft: null, message: '', error: result.error });
    notify(); return result;
  }
  async function bootstrap() {
    state.status = 'saving'; state.error = ''; notify();
    try {
      await bootstrapClassConfigs(client);
      const result = await loadClassConfigs(client);
      Object.assign(state, result, { status: 'success', source: 'firestore', message: '已建立目前學年度班級設定。', error: '' });
    } catch { state.status = 'error'; state.error = '建立班級設定失敗，請稍後再試。'; }
    notify();
  }
  function add() { state.mode = 'add'; state.draft = createNewClassDraft(); state.originalClassId = ''; state.message = ''; state.error = ''; notify(); }
  function edit(classId) { const config = state.configs.find((item) => item.classId === classId); if (!config) return; state.mode = 'edit'; state.draft = createEditClassDraft(config); state.originalClassId = classId; state.message = ''; state.error = ''; notify(); }
  function cancel() { state.mode = 'list'; state.draft = null; state.error = ''; notify(); }
  function setDraft(draft) { state.draft = draft; notify(); }
  async function save() {
    state.status = 'saving'; state.error = ''; notify();
    try {
      const config = validateClassDraft(state.draft, state.configs, state.originalClassId);
      await saveClassConfig(client, config);
      const result = await loadClassConfigs(client);
      Object.assign(state, result, { status: 'success', source: 'firestore', mode: 'list', draft: null, message: `${config.classId} 班設定已儲存。`, error: '' });
    } catch (error) { state.status = 'error'; state.error = error instanceof TypeError ? error.message : '儲存失敗，請稍後再試。'; }
    notify();
  }
  return { getState: () => ({ ...state }), refresh, bootstrap, add, edit, cancel, setDraft, save };
}
