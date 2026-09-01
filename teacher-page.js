import {
  getTeacherFirebaseClient,
  signInTeacherWithGoogle,
  signOutTeacher,
  teacherAuthErrorMessage,
  verifyTeacherAuthorization
} from './teacher-auth.js?v=v2-c1-b-1';
import {
  createTeacherDashboardController,
  TEACHER_PROGRESS_ITEMS
} from './teacher-progress-dashboard.js?v=v2-c2-a-1';
import { formatSeatNumber } from './classroom-config.js';

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
        : dashboard.status === 'permission-denied' || dashboard.status === 'error'
          ? escapeHtml(dashboard.error)
          : `${escapeHtml(dashboard.selectedClassId)} 班學習進度`}</p>
      ${dashboard.status === 'permission-denied' ? '' : `
        <div class="teacher-progress-grid">
          ${TEACHER_PROGRESS_ITEMS.map(({ key, label }, index) => {
            const expanded = expandedCheckpoints.has(key);
            const completedSeats = summary?.completedSeats?.[key] ?? [];
            return `
            <article class="teacher-progress-card teacher-progress-card-${index + 1}">
              <h3>${label}</h3>
              <p><strong>${summary?.counts?.[key] ?? 0}</strong><span>/ ${validCount}</span></p>
              <button class="teacher-seats-toggle" type="button" data-completed-seats-toggle="${key}" aria-expanded="${expanded}">查看已完成座號 ${expanded ? '▴' : '▾'}</button>
              ${expanded ? `<div class="teacher-completed-seats">
                <h4>已完成座號</h4>
                ${completedSeats.length
                  ? `<div class="teacher-seat-chips">${completedSeats.map((seatNo) => `<span>${formatSeatNumber(seatNo)}</span>`).join('')}</div><p>共 ${completedSeats.length} 人</p>`
                  : '<p>尚無完成紀錄</p>'}
              </div>` : ''}
            </article>`;
          }).join('')}
        </div>`}
      <button class="teacher-refresh-button" id="teacher-dashboard-refresh" type="button" ${dashboard.status === 'loading' ? 'disabled' : ''}>更新進度</button>
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

export function teacherPageMarkup({ user = null, authorization = 'idle', dashboard = null, ready = true, busy = false, error = '', copyStatus = '', expandedCheckpoints = new Set() } = {}) {
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
          ${authorization === 'authorized' && dashboard ? teacherDashboardMarkup(dashboard, expandedCheckpoints) : ''}
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
  const pageState = { user: null, authorization: 'idle', dashboard: null, ready: false, busy: false, error: '', copyStatus: '' };
  let authorizationGeneration = 0;
  let dashboardController = null;
  const expandedCheckpoints = new Set();

  async function applyTeacherUser(user) {
    const generation = ++authorizationGeneration;
    pageState.user = user;
    dashboardController?.destroy();
    dashboardController = null;
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
        dashboardController = createTeacherDashboardController({
          client,
          onChange: (dashboard) => {
            pageState.dashboard = dashboard;
            render();
          }
        });
        pageState.dashboard = dashboardController.getState();
        void dashboardController.refresh();
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
