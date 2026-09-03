import { normalizeAcademicYear } from './academic-year.js?v=v2-d3-1';
import { bootstrapAcademicYear, createAcademicYear, listAcademicYears, loadActiveAcademicYear, switchActiveAcademicYear, verifyActiveAcademicYear } from './academic-year-service.js?v=v2-d3-1-1';

export function suggestedNextAcademicYear(activeAcademicYear) {
  return String(Number(normalizeAcademicYear(activeAcademicYear)) + 1);
}

export function createAcademicYearManagementController({ client, onActiveYearChange = async () => {}, onChange = () => {} }) {
  const state = { status: 'loading', activeAcademicYear: '115', initialized: false, warning: '', years: [], inconsistent: false, mode: 'list', draft: null, message: '', error: '' };
  const notify = () => onChange({ ...state, years: [...state.years], draft: state.draft ? { ...state.draft } : null });
  async function refresh() {
    state.status = 'loading'; state.error = ''; notify();
    const active = await loadActiveAcademicYear(client);
    Object.assign(state, active, { activeAcademicYear: active.academicYear });
    if (!active.academicYear) {
      Object.assign(state, { status: 'error', years: [], inconsistent: false, error: active.warning });
      notify(); return { ...state };
    }
    try {
      const listed = await listAcademicYears(client, active.academicYear);
      Object.assign(state, listed, { status: 'success' });
    } catch { state.status = 'error'; state.error = '暫時無法取得學年度列表。'; }
    notify(); return { ...state };
  }
  async function bootstrap() {
    state.status = 'saving'; state.error = ''; notify();
    try { await bootstrapAcademicYear(client); state.message = '已建立 115 學年度管理設定。'; await refresh(); await onActiveYearChange('115', false); }
    catch (error) { state.status = 'error'; state.error = error instanceof TypeError ? error.message : '建立學年度管理設定失敗。'; notify(); }
  }
  function add() { state.mode = 'add'; state.draft = { academicYear: suggestedNextAcademicYear(state.activeAcademicYear), method: 'copy' }; state.error = ''; state.message = ''; notify(); }
  function cancel() { state.mode = 'list'; state.draft = null; state.error = ''; notify(); }
  function setDraft(draft) { state.draft = { ...draft }; notify(); }
  async function create() {
    state.status = 'saving'; state.error = ''; notify();
    try {
      const result = await createAcademicYear(client, state.draft?.academicYear, { copyFrom: state.draft?.method === 'copy' ? state.activeAcademicYear : null });
      state.mode = 'list'; state.draft = null;
      await refresh(); state.message = result.copiedClassCount ? `已建立 ${result.academicYear} 學年度並複製 ${result.copiedClassCount} 個班級。` : `已建立空白的 ${result.academicYear} 學年度。`; notify();
    } catch (error) { state.status = 'error'; state.error = error instanceof TypeError ? error.message : '新增學年度失敗，請稍後再試。'; notify(); }
  }
  async function activate(academicYear, confirmed = false) {
    if (!confirmed) return false;
    state.status = 'saving'; state.error = ''; notify();
    let transactionCompleted = false;
    try {
      await switchActiveAcademicYear(client, academicYear, state.activeAcademicYear);
      transactionCompleted = true;
      await verifyActiveAcademicYear(client, academicYear);
      await refresh();
      if (state.source !== 'firestore' || state.activeAcademicYear !== academicYear) throw new Error('academic-year/verification-failed');
      state.message = `已將 ${academicYear} 學年度設為目前學年度。`; notify();
      await onActiveYearChange(academicYear, false); return true;
    } catch (error) {
      state.status = 'error'; state.message = '';
      state.error = transactionCompleted
        ? '年度已送出更新，但目前無法確認最新設定，請稍後重新整理。'
        : error instanceof TypeError ? error.message : '切換學年度失敗，原設定未變更。';
      notify(); return false;
    }
  }
  return { getState: () => ({ ...state }), refresh, bootstrap, add, cancel, setDraft, create, activate };
}
