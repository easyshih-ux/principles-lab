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
} from './teacher-progress-dashboard.js?v=v2-d3-1';
import { formatSeatNumber } from './classroom-config.js';
import { changeDraftMaximum, createTeacherClassSettingsController, toggleDraftSeat } from './teacher-class-settings.js?v=v2-d3-1';
import { createAcademicYearManagementController } from './teacher-academic-year-management.js?v=v2-d3-1-1';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
            return `
            <article class="teacher-progress-card teacher-progress-card-${index + 1}">
              <h3>${label}</h3>
              <p class="teacher-progress-count"><strong>${summary?.counts?.[key] ?? 0}</strong><span>/ ${validCount}</span></p>
              <button class="teacher-seats-toggle" type="button" data-completed-seats-toggle="${key}" aria-expanded="${expanded}">${expanded ? '收起已完成座號 ▴' : '查看已完成座號 ▾'}</button>
              ${expanded ? `<div class="teacher-completed-seats">
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

export function teacherPageMarkup({ user = null, authorization = 'idle', dashboard = null, settings = null, management = null, teacherView = 'dashboard', ready = true, busy = false, error = '', copyStatus = '', expandedCheckpoints = new Set() } = {}) {
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
          ${authorization === 'authorized' ? `<nav class="teacher-section-nav"><button type="button" id="teacher-show-dashboard" ${teacherView === 'dashboard' ? 'aria-current="page"' : ''}>學習進度</button><button type="button" id="teacher-show-settings" ${teacherView === 'settings' ? 'aria-current="page"' : ''}>班級設定</button><button type="button" id="teacher-show-years" ${teacherView === 'years' ? 'aria-current="page"' : ''}>學年度管理</button></nav>` : ''}
          ${authorization === 'authorized' && teacherView === 'dashboard' && dashboard ? teacherDashboardMarkup(dashboard, expandedCheckpoints) : ''}
          ${authorization === 'authorized' && teacherView === 'settings' ? teacherClassSettingsMarkup(settings) : ''}
          ${authorization === 'authorized' && teacherView === 'years' ? academicYearManagementMarkup(management) : ''}
          <button class="primary-button" id="teacher-sign-out" type="button" ${busy ? 'disabled' : ''}>登出並返回網站入口</button>
        ` : `
          <p class="teacher-auth-lead">請使用授權的教師 Google 帳號登入</p>
          <button class="primary-button" id="teacher-google-sign-in" type="button" ${busy || !ready ? 'disabled' : ''}>${busy ? '正在開啟登入…' : !ready ? '正在準備登入…' : '使用 Google 帳號登入'}</button>
          <button class="teacher-home-link" id="teacher-home" type="button">返回網站入口</button>
        `}
        <p class="teacher-auth-error" role="alert">${escapeHtml(error)}</p>
      </div>
    </section>`;
}

export function renderTeacherPage({ app, navigate, getClient = getTeacherFirebaseClient }) {
  let client = null;
  let unsubscribe = null;
  let disposed = false;
  const pageState = { user: null, authorization: 'idle', dashboard: null, settings: null, management: null, teacherView: 'dashboard', ready: false, busy: false, error: '', copyStatus: '' };
  let authorizationGeneration = 0;
  let dashboardController = null;
  let settingsController = null;
  let managementController = null;
  const expandedCheckpoints = new Set();

  async function loadActiveYearViews(academicYear, allowLegacyFallback) {
    settingsController = createTeacherClassSettingsController({ client, academicYear, allowLegacyFallback, onChange: (settings) => { pageState.settings = settings; render(); } });
    const classResult = await settingsController.refresh();
    dashboardController?.destroy();
    dashboardController = createTeacherDashboardController({ client, academicYear, classrooms: classResult.configs, onChange: (dashboard) => { pageState.dashboard = dashboard; render(); } });
    pageState.dashboard = dashboardController.getState();
    void dashboardController.refresh();
  }

  async function applyTeacherUser(user) {
    const generation = ++authorizationGeneration;
    pageState.user = user;
    dashboardController?.destroy();
    dashboardController = null;
    settingsController = null;
    managementController = null;
    pageState.dashboard = null;
    pageState.error = '';
    pageState.copyStatus = '';
    pageState.authorization = user ? 'checking' : 'idle';
    render();
    if (!user) return;
    try {
      const isAuthorized = await verifyTeacherAuthorization(client);
      if (disposed || generation !== authorizationGeneration) return;
      pageState.authorization = isAuthorized ? 'authorized' : 'unauthorized';
      if (isAuthorized) {
        managementController = createAcademicYearManagementController({ client, onChange: (management) => { pageState.management = management; render(); }, onActiveYearChange: async (academicYear, legacyBootstrap) => { await loadActiveYearViews(academicYear, legacyBootstrap); } });
        const management = await managementController.refresh();
        if (disposed || generation !== authorizationGeneration) return;
        if (management.activeAcademicYear) await loadActiveYearViews(management.activeAcademicYear, !management.initialized);
        else pageState.teacherView = 'years';
      }
    } catch (error) {
      if (disposed || generation !== authorizationGeneration) return;
      pageState.authorization = 'error';
      pageState.error = '無法確認教師權限，請檢查網路後重新整理頁面。';
    }
    render();
  }

  function render() {
    if (disposed) return;
    app.innerHTML = teacherPageMarkup({ ...pageState, expandedCheckpoints });
    app.querySelector('#teacher-home')?.addEventListener('click', () => navigate('#entry'));
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
        dashboardController?.destroy();
        dashboardController = null;
        pageState.dashboard = null;
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
    app.querySelector('#teacher-show-dashboard')?.addEventListener('click', () => { pageState.teacherView = 'dashboard'; render(); });
    app.querySelector('#teacher-show-settings')?.addEventListener('click', () => { pageState.teacherView = 'settings'; render(); });
    app.querySelector('#teacher-show-years')?.addEventListener('click', () => { pageState.teacherView = 'years'; render(); });
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
        dashboardController = createTeacherDashboardController({ client, classrooms: pageState.settings.configs, onChange: (dashboard) => { pageState.dashboard = dashboard; render(); } });
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
        dashboardController = createTeacherDashboardController({ client, classrooms: pageState.settings.configs, onChange: (dashboard) => { pageState.dashboard = dashboard; render(); } });
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
