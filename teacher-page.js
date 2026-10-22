import {
  getTeacherFirebaseClient,
  signInTeacherWithGoogle,
  signOutTeacher,
  teacherAuthErrorMessage,
  verifyTeacherAuthorization
} from './teacher-auth.js?v=v2-d3-1-1';
import {
  createTeacherDashboardController,
  TEACHER_PROGRESS_ITEMS
} from './teacher-progress-dashboard.js?v=teacher-segments-1';
import { formatSeatNumber } from './classroom-config.js';
import { changeDraftMaximum, createTeacherClassSettingsController, toggleDraftSeat } from './teacher-class-settings.js?v=v2-d3-1';
import { createAcademicYearManagementController } from './teacher-academic-year-management.js?v=v2-d3-1-1';
import {
  loadTeacherApplication,
  loadTeacherReviewData,
  reviewTeacherAccess,
  submitTeacherApplication,
  verifyAdminAuthorization
} from './teacher-application-service.js?v=gate2-1';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// 10/22: free practice in three parts (01–03, 04–06, 07–10), each with its own seats.
function seatChips(seats, pending = false) {
  return `<div class="teacher-seat-chips${pending ? ' teacher-seat-chips-pending' : ''}">${seats.map((seatNo) => `<span>${formatSeatNumber(seatNo)}</span>`).join('')}</div>`;
}
function freeReviewSegmentsMarkup(summary, expandedCheckpoints) {
  const segments = summary?.segments ?? [];
  if (!segments.length) return '';
  return `<div class="teacher-completed-seats teacher-free-segments">
    <h4>分段進度</h4>
    ${segments.map((segment) => {
      const open = expandedCheckpoints.has(segment.key);
      return `<div class="teacher-free-segment">
        <button class="teacher-seats-toggle teacher-segment-toggle" type="button" data-completed-seats-toggle="${segment.key}" aria-expanded="${open}"><strong>${segment.label}</strong> ${segment.names}　<b>${segment.completedSeats.length}</b> 人完成 ${open ? '▴' : `（未完成 ${segment.pendingSeats.length} 人）▾`}</button>
        ${open ? `<div class="teacher-segment-seats">
          <p class="teacher-segment-heading">未完成</p>${segment.pendingSeats.length ? seatChips(segment.pendingSeats, true) : '<p>全部完成</p>'}
          <p class="teacher-segment-heading">已完成</p>${segment.completedSeats.length ? seatChips(segment.completedSeats) : '<p>尚無完成紀錄</p>'}
        </div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

function teacherDashboardMarkup(dashboard, expandedCheckpoints = new Set()) {
  const summary = dashboard.summary;
  const validCount = summary?.validCount ?? 0;
  return `
    <section class="teacher-dashboard" aria-labelledby="teacher-dashboard-title">
      <div class="teacher-dashboard-heading">
        <h2 id="teacher-dashboard-title">班級學習進度</h2>
        <label>選擇班級
          <select id="teacher-class-select" ${dashboard.status === 'loading' ? 'disabled' : ''}>
            ${dashboard.classrooms.map(({ id }) => `<option value="${escapeHtml(id)}" ${id === dashboard.selectedClassId ? 'selected' : ''}>${escapeHtml(id)} 班</option>`).join('')}
          </select>
        </label>
      </div>
      <p class="teacher-dashboard-state" role="status">${dashboard.status === 'loading'
        ? '正在讀取班級進度…'
        : !dashboard.classrooms.length
          ? `${escapeHtml(dashboard.academicYear)} 學年度尚未建立班級設定。`
        : dashboard.status === 'permission-denied' || dashboard.status === 'error'
          ? escapeHtml(dashboard.error)
          : `${escapeHtml(dashboard.academicYear)} 學年度｜${escapeHtml(dashboard.selectedClassId)} 班學習進度`}</p>
      ${dashboard.status === 'permission-denied' ? '' : `
        <div class="teacher-progress-grid">
          ${TEACHER_PROGRESS_ITEMS.map(({ key, label }, index) => {
            const expanded = expandedCheckpoints.has(key);
            const completedSeats = summary?.completedSeats?.[key] ?? [];
            const pendingSeats = summary?.pendingSeats?.[key] ?? [];
            return `
            <article class="teacher-progress-card teacher-progress-card-${index + 1}">
              <h3>${label}</h3>
              <p class="teacher-progress-count"><strong>${summary?.counts?.[key] ?? 0}</strong><span>/ ${validCount}</span></p>
              <button class="teacher-seats-toggle" type="button" data-completed-seats-toggle="${key}" aria-expanded="${expanded}">${expanded ? '收起座號 ▴' : `查看座號（未完成 ${pendingSeats.length} 人）▾`}</button>
              ${expanded ? `<div class="teacher-completed-seats teacher-pending-seats">
                <h4>未完成座號</h4>
                ${pendingSeats.length
                  ? `<div class="teacher-completed-seats-row"><div class="teacher-seat-chips teacher-seat-chips-pending">${pendingSeats.map((seatNo) => `<span>${formatSeatNumber(seatNo)}</span>`).join('')}</div><p>共 ${pendingSeats.length} 人</p></div>`
                  : '<p>全部完成</p>'}
              </div>
              ${key === 'freeReviewComplete' ? freeReviewSegmentsMarkup(summary, expandedCheckpoints) : ''}
              <div class="teacher-completed-seats">
                <h4>已完成座號</h4>
                ${completedSeats.length
                  ? `<div class="teacher-completed-seats-row"><div class="teacher-seat-chips">${completedSeats.map((seatNo) => `<span>${formatSeatNumber(seatNo)}</span>`).join('')}</div><p>共 ${completedSeats.length} 人</p></div>`
                  : '<p>尚無完成紀錄</p>'}
              </div>` : ''}
            </article>`;
          }).join('')}
        </div>`}
      <button class="teacher-refresh-button" id="teacher-dashboard-refresh" type="button" ${dashboard.status === 'loading' ? 'disabled' : ''}>取得最新進度</button>
    </section>`;
}

export function teacherClassSettingsMarkup(settings) {
  if (!settings) return '<p role="status">正在讀取班級設定…</p>';
  if (settings.mode === 'add' || settings.mode === 'edit') {
    const draft = settings.draft;
    const seats = Array.from({ length: Number(draft.maximum) || 0 }, (_, index) => index + 1);
    return `<section class="teacher-class-settings" aria-labelledby="class-settings-title">
      <h2 id="class-settings-title">${escapeHtml(settings.academicYear)} 學年度班級設定</h2>
      <p>儲存班級：<strong>${escapeHtml(draft.classId || '尚未輸入')}</strong></p>
      <label>班級代碼 <input id="class-settings-id" inputmode="numeric" value="${escapeHtml(draft.classId)}" ${settings.mode === 'edit' ? 'readonly' : ''}></label>
      <label>最大座號 <input id="class-settings-maximum" type="number" min="1" max="200" value="${draft.maximum}"></label>
      <label class="class-settings-active"><input id="class-settings-active" type="checkbox" ${draft.active ? 'checked' : ''}> 啟用班級</label>
      <p>有效學生：<strong>${draft.validSeatNumbers.length}</strong> 人</p>
      <div class="class-settings-seats" aria-label="有效座號設定">${seats.map((seat) => {
        const active = draft.validSeatNumbers.includes(seat);
        return `<button type="button" data-class-seat="${seat}" class="${active ? 'is-valid' : 'is-empty'}" aria-pressed="${active}">${formatSeatNumber(seat)}<small>${active ? '有效' : '空號'}</small></button>`;
      }).join('')}</div>
      <div class="identity-actions"><button type="button" class="secondary-button" id="class-settings-cancel">取消</button><button type="button" class="primary-button" id="class-settings-save" ${settings.status === 'saving' ? 'disabled' : ''}>${settings.status === 'saving' ? '儲存中…' : '儲存設定'}</button></div>
      <p role="alert">${escapeHtml(settings.error)}</p>
    </section>`;
  }
  return `<section class="teacher-class-settings" aria-labelledby="class-settings-title">
    <h2 id="class-settings-title">${escapeHtml(settings.academicYear)} 學年度班級設定</h2>
    ${settings.source === 'fallback' ? '<p class="teacher-settings-bootstrap">Firestore 尚未建立本年度設定，目前顯示既有班級。<button type="button" id="class-settings-bootstrap">建立目前年度班級設定</button></p>' : ''}
    ${settings.source === 'firestore' && !settings.configs.length ? `<p class="teacher-settings-empty">${escapeHtml(settings.academicYear)} 學年度尚未建立班級設定。</p>` : ''}
    <div class="class-settings-list">${settings.configs.map((config) => `<article><strong>${escapeHtml(config.classId)} 班</strong><span>${config.validSeatNumbers.length} 人</span><span>${config.active ? '啟用' : '停用'}</span><button type="button" data-edit-class="${escapeHtml(config.classId)}">編輯</button></article>`).join('')}</div>
    <button type="button" class="primary-button" id="class-settings-add" ${settings.source !== 'firestore' ? 'disabled' : ''}>＋ 新增班級</button>
    <p class="teacher-settings-message" role="status">${escapeHtml(settings.message)}</p><p role="alert">${escapeHtml(settings.error)}</p>
  </section>`;
}

export function academicYearManagementMarkup(management) {
  if (!management) return '<p role="status">正在讀取學年度設定…</p>';
  if (management.mode === 'add') return `<section class="teacher-year-management" aria-labelledby="year-management-title">
    <h2 id="year-management-title">新增學年度</h2>
    <label>學年度 <input id="academic-year-input" inputmode="numeric" value="${escapeHtml(management.draft.academicYear)}"></label>
    <fieldset><legend>班級設定</legend>
      <label><input type="radio" name="academic-year-method" value="copy" ${management.draft.method === 'copy' ? 'checked' : ''}> 複製目前 ${escapeHtml(management.activeAcademicYear)} 學年度</label>
      <label><input type="radio" name="academic-year-method" value="empty" ${management.draft.method === 'empty' ? 'checked' : ''}> 建立空白年度</label>
    </fieldset>
    <div class="identity-actions"><button type="button" class="secondary-button" id="academic-year-cancel">取消</button><button type="button" class="primary-button" id="academic-year-create" ${management.status === 'saving' ? 'disabled' : ''}>${management.status === 'saving' ? '建立中…' : '建立'}</button></div>
    <p role="alert">${escapeHtml(management.error)}</p></section>`;
  return `<section class="teacher-year-management" aria-labelledby="year-management-title">
    <h2 id="year-management-title">學年度管理</h2>
    ${management.warning ? `<p class="teacher-year-warning" role="status">${escapeHtml(management.warning)}</p>` : ''}
    ${management.inconsistent ? '<p class="teacher-year-warning" role="alert">目前學年度設定與年度狀態不一致；系統仍以目前學年度設定為準。</p>' : ''}
    ${!management.initialized ? '<button type="button" class="primary-button" id="academic-year-bootstrap">建立 115 學年度管理設定</button>' : ''}
    <div class="academic-year-list">${management.years.map((year) => {
      const active = year.academicYear === management.activeAcademicYear;
      return `<article><div><strong>${escapeHtml(year.academicYear)} 學年度</strong><span>${active ? '目前使用中' : '已封存'}</span></div>${active ? '<button type="button" disabled>目前年度不可封存</button>' : `<button type="button" data-activate-year="${escapeHtml(year.academicYear)}">設為目前學年度</button>`}</article>`;
    }).join('')}</div>
    ${management.initialized ? '<button type="button" class="primary-button" id="academic-year-add">＋ 新增學年度</button>' : ''}
    <p class="teacher-settings-message" role="status">${escapeHtml(management.message)}</p><p role="alert">${escapeHtml(management.error)}</p>
  </section>`;
}

export async function copyTeacherUid(uid, clipboard = globalThis.navigator?.clipboard) {
  if (!uid || !clipboard?.writeText) return false;
  try {
    await clipboard.writeText(uid);
    return true;
  } catch {
    return false;
  }
}

function formatReviewDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '時間讀取中';
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(value);
}

function teacherApplicationMarkup(application, status, busy) {
  if (status === 'loading') return '<section class="teacher-application"><p role="status">正在讀取申請狀態…</p></section>';
  if (status === 'error') return '<section class="teacher-application"><p role="alert">暫時無法讀取申請狀態，請檢查網路後再試。</p><button class="secondary-button" id="teacher-recheck" type="button">重新驗證教師權限</button></section>';
  if (!application) return `<section class="teacher-application" aria-labelledby="teacher-application-title"><h2 id="teacher-application-title">申請教師權限</h2><p>系統將使用目前 Google 帳號的姓名與 Email 送出申請。</p><button class="primary-button" id="teacher-apply" type="button" ${busy ? 'disabled' : ''}>${busy ? '正在送出…' : '申請教師權限'}</button></section>`;
  const messages = {
    pending: ['已送出申請，等待管理員審核', '管理員完成審核後，請回到此頁重新驗證。'],
    approved: ['教師申請已通過', '不必登出 Google 帳號，請重新驗證教師權限。'],
    rejected: ['教師申請未通過', '如需重新申請，請聯絡管理員重新開啟申請。'],
    revoked: ['教師權限已撤銷', '如有疑問，請聯絡管理員。']
  };
  const [title, description] = messages[application.status] ?? ['申請狀態無法辨識', '請聯絡管理員。'];
  return `<section class="teacher-application is-${escapeHtml(application.status)}" aria-labelledby="teacher-application-title"><h2 id="teacher-application-title">${title}</h2><p>${description}</p>${application.status === 'approved' ? `<button class="primary-button" id="teacher-recheck" type="button" ${busy ? 'disabled' : ''}>${busy ? '正在驗證…' : '重新驗證教師權限'}</button>` : ''}</section>`;
}

function teacherReviewMarkup(review, busyKey = '') {
  if (!review || review.status === 'loading') return '<section class="teacher-review"><p role="status">正在讀取教師申請…</p></section>';
  if (review.status === 'error') return `<section class="teacher-review"><p role="alert">${escapeHtml(review.error || '暫時無法讀取教師申請。')}</p><button class="secondary-button" id="teacher-review-refresh" type="button">重新讀取</button></section>`;
  return `<section class="teacher-review" aria-labelledby="teacher-review-title">
    <div class="teacher-review-heading"><div><p class="section-label">OWNER ONLY</p><h2 id="teacher-review-title">教師審核</h2></div><button class="secondary-button" id="teacher-review-refresh" type="button" ${busyKey ? 'disabled' : ''}>重新整理</button></div>
    <h3>待審核申請</h3>
    <div class="teacher-review-list">${review.pending.length ? review.pending.map((item) => {
      const approveKey = `approved:${item.uid}`; const rejectKey = `rejected:${item.uid}`;
      return `<article><div><strong>${escapeHtml(item.displayName)}</strong><span>${escapeHtml(item.email)}</span><small>${formatReviewDate(item.createdAt)}</small></div><div class="teacher-review-actions"><button class="primary-button" type="button" data-review-action="approved" data-review-uid="${escapeHtml(item.uid)}" ${busyKey ? 'disabled' : ''}>${busyKey === approveKey ? '核准中…' : '核准'}</button><button class="secondary-button" type="button" data-review-action="rejected" data-review-uid="${escapeHtml(item.uid)}" ${busyKey ? 'disabled' : ''}>${busyKey === rejectKey ? '拒絕中…' : '拒絕'}</button></div></article>`;
    }).join('') : '<p class="teacher-review-empty">目前沒有待審核申請。</p>'}</div>
    <h3>已核准教師</h3>
    <div class="teacher-review-list">${review.teachers.length ? review.teachers.map((item) => {
      const revokeKey = `revoked:${item.uid}`;
      const action = item.isAdmin
        ? '<span aria-label="系統管理員，不可撤銷">系統管理員</span>'
        : `<button class="secondary-button danger-button" type="button" data-review-action="revoked" data-review-uid="${escapeHtml(item.uid)}" ${busyKey ? 'disabled' : ''}>${busyKey === revokeKey ? '撤銷中…' : '撤銷權限'}</button>`;
      return `<article><div><strong>${escapeHtml(item.displayName || '既有教師')}</strong><span>${escapeHtml(item.email || item.uid)}</span>${item.hasApplication ? '' : '<small>既有白名單教師</small>'}</div>${action}</article>`;
    }).join('') : '<p class="teacher-review-empty">目前沒有已核准教師。</p>'}</div>
    <p class="teacher-settings-message" role="status">${escapeHtml(review.message || '')}</p>
  </section>`;
}

export function teacherPageMarkup({ user = null, authorization = 'idle', adminAuthorization = 'idle', application = null, applicationStatus = 'idle', review = null, dashboard = null, settings = null, management = null, teacherView = 'dashboard', ready = true, busy = false, adminBusy = '', error = '', copyStatus = '', expandedCheckpoints = new Set() } = {}) {
  const isAuthorized = authorization === 'authorized';
  const isAdmin = adminAuthorization === 'authorized';
  return `
    <section class="teacher-auth-page" aria-labelledby="teacher-title">
      <div class="teacher-auth-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="teacher-auth-panel">
        <p class="section-label">TEACHER · C2-A</p>
        <h1 id="teacher-title">教師進度</h1>
        ${user ? `
          <p class="teacher-auth-status">Google 登入成功</p>
          <dl class="teacher-auth-identity">
            ${user.displayName ? `<div><dt>名稱</dt><dd>${escapeHtml(user.displayName)}</dd></div>` : ''}
            ${user.email ? `<div><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>` : ''}
          </dl>
          <p class="teacher-auth-notice ${authorization === 'authorized' ? 'is-authorized' : ''}" role="status">${authorization === 'checking'
            ? '正在確認教師權限…'
            : authorization === 'authorized'
              ? '教師身分已授權'
              : authorization === 'unauthorized'
                ? '此 Google 帳號未取得教師權限'
                : authorization === 'error'
                  ? '暫時無法確認教師權限'
                  : '尚未確認教師權限'}</p>
          ${authorization === 'unauthorized' ? `
            <section class="teacher-uid-copy" aria-labelledby="teacher-uid-label">
              <h2 id="teacher-uid-label">教師 UID</h2>
              <code>${escapeHtml(user.uid)}</code>
              <button class="secondary-button" id="teacher-copy-uid" type="button">複製 UID</button>
              <p id="teacher-copy-status" role="status">${escapeHtml(copyStatus)}</p>
            </section>` : ''}
          ${authorization === 'unauthorized' && !isAdmin ? teacherApplicationMarkup(application, applicationStatus, busy) : ''}
          ${(isAuthorized || isAdmin) ? `<nav class="teacher-section-nav">${isAuthorized ? `<button type="button" id="teacher-show-dashboard" ${teacherView === 'dashboard' ? 'aria-current="page"' : ''}>學習進度</button><button type="button" id="teacher-show-settings" ${teacherView === 'settings' ? 'aria-current="page"' : ''}>班級設定</button><button type="button" id="teacher-show-years" ${teacherView === 'years' ? 'aria-current="page"' : ''}>學年度管理</button>` : ''}${isAdmin ? `<button type="button" id="teacher-show-reviews" ${teacherView === 'reviews' ? 'aria-current="page"' : ''}>教師審核</button>` : ''}</nav>` : ''}
          ${isAuthorized && teacherView === 'dashboard' && dashboard ? teacherDashboardMarkup(dashboard, expandedCheckpoints) : ''}
          ${isAuthorized && teacherView === 'settings' ? teacherClassSettingsMarkup(settings) : ''}
          ${isAuthorized && teacherView === 'years' ? academicYearManagementMarkup(management) : ''}
          ${isAdmin && teacherView === 'reviews' ? teacherReviewMarkup(review, adminBusy) : ''}
          ${authorization === 'authorized' ? '<button class="primary-button" id="teacher-lab-home" type="button">返回教學畫面</button>' : ''}
          <button class="teacher-home-link" id="teacher-sign-out" type="button" ${busy ? 'disabled' : ''}>登出教師帳號</button>
        ` : `
          <p class="teacher-auth-lead">請使用授權的教師 Google 帳號登入</p>
          <button class="primary-button" id="teacher-google-sign-in" type="button" ${busy || !ready ? 'disabled' : ''}>${busy ? '正在開啟登入…' : !ready ? '正在準備登入…' : '使用 Google 帳號登入'}</button>
          <button class="teacher-home-link" id="teacher-home" type="button">返回網站入口</button>
        `}
        <p class="teacher-auth-error" role="alert">${escapeHtml(error)}</p>
      </div>
    </section>`;
}

export async function signOutTeacherFromTeachingMode(getClient = getTeacherFirebaseClient) {
  const client = await getClient();
  await signOutTeacher(client);
}

export function renderTeacherPage({ app, navigate, returnToTeaching = () => navigate('#home'), onAuthorizationChange = () => {}, getClient = getTeacherFirebaseClient }) {
  let client = null;
  let unsubscribe = null;
  let disposed = false;
  const pageState = {
    user: null,
    authorization: 'idle',
    adminAuthorization: 'idle',
    application: null,
    applicationStatus: 'idle',
    review: null,
    dashboard: null,
    settings: null,
    management: null,
    teacherView: 'dashboard',
    ready: false,
    busy: false,
    adminBusy: '',
    error: '',
    copyStatus: ''
  };
  let authorizationGeneration = 0;
  let dashboardController = null;
  let settingsController = null;
  let managementController = null;
  let revocationCheckPromise = null;
  const expandedCheckpoints = new Set();

  async function refreshApplication() {
    if (!pageState.user) return null;
    pageState.applicationStatus = 'loading';
    render();
    try {
      pageState.application = await loadTeacherApplication(client, pageState.user.uid);
      pageState.applicationStatus = 'success';
    } catch {
      pageState.applicationStatus = 'error';
    }
    render();
    return pageState.application;
  }

  async function refreshReview() {
    if (pageState.adminAuthorization !== 'authorized') return;
    pageState.review = { status: 'loading', pending: [], teachers: [], message: '', error: '' };
    render();
    try {
      const data = await loadTeacherReviewData(client);
      pageState.review = { status: 'success', ...data, message: '', error: '' };
    } catch (error) {
      pageState.review = {
        status: 'error', pending: [], teachers: [], message: '',
        error: error?.code === 'permission-denied' ? '管理員權限不足，無法讀取教師申請。' : '暫時無法讀取教師申請。'
      };
    }
    render();
  }

  async function revalidateAfterPermissionDenied() {
    if (!pageState.user || revocationCheckPromise) return revocationCheckPromise;
    revocationCheckPromise = verifyTeacherAuthorization(client).then(async (authorized) => {
      if (disposed || authorized) return authorized;
      authorizationGeneration += 1;
      pageState.authorization = 'unauthorized';
      pageState.teacherView = pageState.adminAuthorization === 'authorized' ? 'reviews' : 'dashboard';
      dashboardController?.destroy();
      dashboardController = null;
      settingsController = null;
      managementController = null;
      pageState.dashboard = null;
      pageState.settings = null;
      pageState.management = null;
      onAuthorizationChange(false);
      await refreshApplication();
      return false;
    }).catch(() => {
      if (!disposed) pageState.error = '網路暫時無法使用，尚未變更目前教師登入狀態。';
      return null;
    }).finally(() => {
      revocationCheckPromise = null;
      render();
    });
    return revocationCheckPromise;
  }

  async function loadActiveYearViews(academicYear, allowLegacyFallback) {
    settingsController = createTeacherClassSettingsController({ client, academicYear, allowLegacyFallback, onPermissionDenied: revalidateAfterPermissionDenied, onChange: (settings) => { pageState.settings = settings; render(); } });
    const classResult = await settingsController.refresh();
    dashboardController?.destroy();
    dashboardController = createTeacherDashboardController({ client, academicYear, classrooms: classResult.configs, onPermissionDenied: revalidateAfterPermissionDenied, onChange: (dashboard) => { pageState.dashboard = dashboard; render(); } });
    pageState.dashboard = dashboardController.getState();
    void dashboardController.refresh();
  }

  async function applyTeacherUser(user) {
    const generation = ++authorizationGeneration;
    const retainedTeacherAuthorization = Boolean(user && pageState.user?.uid === user.uid && pageState.authorization === 'authorized');
    const retainedAdminAuthorization = Boolean(user && pageState.user?.uid === user.uid && pageState.adminAuthorization === 'authorized');
    pageState.user = user;
    dashboardController?.destroy();
    dashboardController = null;
    settingsController = null;
    managementController = null;
    pageState.dashboard = null;
    pageState.settings = null;
    pageState.management = null;
    pageState.application = null;
    pageState.applicationStatus = user ? 'loading' : 'idle';
    pageState.review = null;
    pageState.error = '';
    pageState.copyStatus = '';
    pageState.authorization = user ? 'checking' : 'idle';
    pageState.adminAuthorization = user ? 'checking' : 'idle';
    render();
    if (!user) {
      onAuthorizationChange(false);
      return;
    }
    const [teacherResult, adminResult] = await Promise.allSettled([
      verifyTeacherAuthorization(client),
      verifyAdminAuthorization(client)
    ]);
    if (disposed || generation !== authorizationGeneration) return;
    const isAuthorized = teacherResult.status === 'fulfilled' ? teacherResult.value : retainedTeacherAuthorization;
    const isAdmin = adminResult.status === 'fulfilled' ? adminResult.value : retainedAdminAuthorization;
    pageState.authorization = teacherResult.status === 'rejected' ? retainedTeacherAuthorization ? 'authorized' : 'error' : isAuthorized ? 'authorized' : 'unauthorized';
    pageState.adminAuthorization = adminResult.status === 'rejected' ? retainedAdminAuthorization ? 'authorized' : 'error' : isAdmin ? 'authorized' : 'unauthorized';
    if (teacherResult.status === 'rejected' || adminResult.status === 'rejected') {
      pageState.error = '無法完整確認帳號權限，請檢查網路後重新整理頁面。';
    }
    onAuthorizationChange(Boolean(isAuthorized));
    if (!isAuthorized) await refreshApplication();
    if (disposed || generation !== authorizationGeneration) return;
    if (isAuthorized) {
      managementController = createAcademicYearManagementController({ client, onPermissionDenied: revalidateAfterPermissionDenied, onChange: (management) => { pageState.management = management; render(); }, onActiveYearChange: async (academicYear, legacyBootstrap) => { await loadActiveYearViews(academicYear, legacyBootstrap); } });
      const management = await managementController.refresh();
      if (disposed || generation !== authorizationGeneration) return;
      if (management.activeAcademicYear) await loadActiveYearViews(management.activeAcademicYear, !management.initialized);
      else pageState.teacherView = 'years';
    }
    if (isAdmin) {
      if (!isAuthorized) pageState.teacherView = 'reviews';
      await refreshReview();
    }
    render();
  }

  function render() {
    if (disposed) return;
    app.innerHTML = teacherPageMarkup({ ...pageState, expandedCheckpoints });
    app.querySelector('#teacher-home')?.addEventListener('click', () => navigate('#entry'));
    app.querySelector('#teacher-lab-home')?.addEventListener('click', returnToTeaching);
    app.querySelector('#teacher-google-sign-in')?.addEventListener('click', async () => {
      pageState.busy = true;
      pageState.error = '';
      render();
      try {
        await signInTeacherWithGoogle(client);
      } catch (error) {
        pageState.error = teacherAuthErrorMessage(error);
      } finally {
        pageState.busy = false;
        render();
      }
    });
    app.querySelector('#teacher-sign-out')?.addEventListener('click', async () => {
      pageState.busy = true;
      pageState.error = '';
      render();
      try {
        await signOutTeacher(client);
        authorizationGeneration += 1;
        pageState.user = null;
        pageState.authorization = 'idle';
        pageState.adminAuthorization = 'idle';
        pageState.application = null;
        pageState.applicationStatus = 'idle';
        pageState.review = null;
        dashboardController?.destroy();
        dashboardController = null;
        pageState.dashboard = null;
        onAuthorizationChange(false);
        navigate('#entry');
      } catch (error) {
        pageState.busy = false;
        pageState.error = teacherAuthErrorMessage(error);
        render();
      }
    });
    app.querySelector('#teacher-copy-uid')?.addEventListener('click', async () => {
      const copied = await copyTeacherUid(pageState.user?.uid);
      if (disposed || pageState.authorization !== 'unauthorized') return;
      pageState.copyStatus = copied ? '已複製 UID' : '無法複製，請手動選取 UID';
      render();
    });
    app.querySelector('#teacher-apply')?.addEventListener('click', async () => {
      if (!pageState.user || pageState.authorization !== 'unauthorized') return;
      pageState.busy = true;
      pageState.error = '';
      render();
      try {
        const result = await submitTeacherApplication(client, pageState.user);
        pageState.application = result.application;
        pageState.applicationStatus = 'success';
      } catch (error) {
        pageState.error = error instanceof TypeError ? error.message : '申請送出失敗，請檢查網路後再試。';
        await refreshApplication();
      } finally {
        pageState.busy = false;
        render();
      }
    });
    app.querySelector('#teacher-recheck')?.addEventListener('click', async () => {
      if (!pageState.user) return;
      pageState.busy = true;
      pageState.error = '';
      render();
      await applyTeacherUser(pageState.user);
      if (!disposed) { pageState.busy = false; render(); }
    });
    app.querySelector('#teacher-show-dashboard')?.addEventListener('click', () => { pageState.teacherView = 'dashboard'; render(); });
    app.querySelector('#teacher-show-settings')?.addEventListener('click', () => { pageState.teacherView = 'settings'; render(); });
    app.querySelector('#teacher-show-years')?.addEventListener('click', () => { pageState.teacherView = 'years'; render(); });
    app.querySelector('#teacher-show-reviews')?.addEventListener('click', () => { pageState.teacherView = 'reviews'; render(); });
    app.querySelector('#teacher-review-refresh')?.addEventListener('click', () => { void refreshReview(); });
    app.querySelectorAll('[data-review-action]').forEach((button) => button.addEventListener('click', async () => {
      if (pageState.adminAuthorization !== 'authorized' || pageState.adminBusy) return;
      const action = button.dataset.reviewAction;
      const uid = button.dataset.reviewUid;
      const labels = {
        approved: '確定核准此教師申請？核准後對方可重新驗證並使用教師功能。',
        rejected: '確定拒絕此教師申請？',
        revoked: '確定撤銷此教師權限？既有學習紀錄與班級資料不會刪除。'
      };
      if (!labels[action] || !globalThis.confirm(labels[action])) return;
      pageState.adminBusy = `${action}:${uid}`;
      pageState.error = '';
      render();
      try {
        await reviewTeacherAccess(client, { targetUid: uid, action });
        await refreshReview();
        if (uid === pageState.user?.uid) await applyTeacherUser(pageState.user);
        if (pageState.review) pageState.review.message = action === 'approved' ? '教師權限已核准。' : action === 'rejected' ? '申請已拒絕。' : '教師權限已撤銷。';
      } catch (error) {
        pageState.error = error instanceof TypeError ? error.message : '審核操作失敗，資料未變更。';
        await refreshReview();
      } finally {
        pageState.adminBusy = '';
        render();
      }
    }));
    app.querySelector('#academic-year-bootstrap')?.addEventListener('click', () => { void managementController?.bootstrap(); });
    app.querySelector('#academic-year-add')?.addEventListener('click', () => managementController?.add());
    app.querySelector('#academic-year-cancel')?.addEventListener('click', () => managementController?.cancel());
    app.querySelector('#academic-year-input')?.addEventListener('change', (event) => managementController?.setDraft({ ...pageState.management.draft, academicYear: event.currentTarget.value }));
    app.querySelectorAll('[name="academic-year-method"]').forEach((radio) => radio.addEventListener('change', (event) => managementController?.setDraft({ ...pageState.management.draft, method: event.currentTarget.value })));
    app.querySelector('#academic-year-create')?.addEventListener('click', () => { void managementController?.create(); });
    app.querySelectorAll('[data-activate-year]').forEach((button) => button.addEventListener('click', () => {
      const academicYear = button.dataset.activateYear;
      const confirmed = globalThis.confirm(`確定將 ${academicYear} 學年度設為目前學年度嗎？\n學生登入後將改用 ${academicYear} 的班級設定。`);
      void managementController?.activate(academicYear, confirmed);
    }));
    app.querySelector('#class-settings-bootstrap')?.addEventListener('click', async () => {
      await settingsController?.bootstrap();
      if (pageState.settings?.source === 'firestore') {
        dashboardController?.destroy();
        dashboardController = createTeacherDashboardController({ client, classrooms: pageState.settings.configs, onPermissionDenied: revalidateAfterPermissionDenied, onChange: (dashboard) => { pageState.dashboard = dashboard; render(); } });
        pageState.dashboard = dashboardController.getState(); void dashboardController.refresh();
      }
    });
    app.querySelector('#class-settings-add')?.addEventListener('click', () => settingsController?.add());
    app.querySelectorAll('[data-edit-class]').forEach((button) => button.addEventListener('click', () => settingsController?.edit(button.dataset.editClass)));
    app.querySelector('#class-settings-cancel')?.addEventListener('click', () => settingsController?.cancel());
    app.querySelector('#class-settings-id')?.addEventListener('change', (event) => settingsController?.setDraft({ ...pageState.settings.draft, classId: event.currentTarget.value }));
    app.querySelector('#class-settings-maximum')?.addEventListener('change', (event) => {
      const draft = pageState.settings.draft; const next = Number(event.currentTarget.value);
      if (next < draft.maximum && !globalThis.confirm(`將最大座號從 ${draft.maximum} 降為 ${next}，確定繼續？`)) { render(); return; }
      try { settingsController?.setDraft(changeDraftMaximum(draft, next)); } catch { render(); }
    });
    app.querySelector('#class-settings-active')?.addEventListener('change', (event) => {
      const active = event.currentTarget.checked;
      if (!active && !globalThis.confirm(`確定停用 ${pageState.settings.draft.classId} 班？既有學習進度不會刪除。`)) { render(); return; }
      settingsController?.setDraft({ ...pageState.settings.draft, active });
    });
    app.querySelectorAll('[data-class-seat]').forEach((button) => button.addEventListener('click', () => settingsController?.setDraft(toggleDraftSeat(pageState.settings.draft, button.dataset.classSeat))));
    app.querySelector('#class-settings-save')?.addEventListener('click', async () => {
      await settingsController?.save();
      if (pageState.settings?.source === 'firestore' && pageState.settings.mode === 'list') {
        dashboardController?.destroy();
        dashboardController = createTeacherDashboardController({ client, classrooms: pageState.settings.configs, onPermissionDenied: revalidateAfterPermissionDenied, onChange: (dashboard) => { pageState.dashboard = dashboard; render(); } });
        pageState.dashboard = dashboardController.getState(); void dashboardController.refresh();
      }
    });
    app.querySelector('#teacher-class-select')?.addEventListener('change', (event) => {
      void dashboardController?.selectClass(event.currentTarget.value);
    });
    app.querySelector('#teacher-dashboard-refresh')?.addEventListener('click', () => {
      void dashboardController?.refresh();
    });
    app.querySelectorAll('[data-completed-seats-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const checkpoint = button.dataset.completedSeatsToggle;
        if (expandedCheckpoints.has(checkpoint)) expandedCheckpoints.delete(checkpoint);
        else expandedCheckpoints.add(checkpoint);
        render();
      });
    });
  }

  render();
  void getClient().then((teacherClient) => {
    if (disposed) return;
    client = teacherClient;
    pageState.ready = true;
    unsubscribe = client.onAuthStateChanged(client.auth, (user) => {
      void applyTeacherUser(user);
    });
  }).catch((error) => {
    pageState.error = teacherAuthErrorMessage(error);
    render();
  });

  return {
    destroy() {
      disposed = true;
      dashboardController?.destroy();
      unsubscribe?.();
    }
  };
}
