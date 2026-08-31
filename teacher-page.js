import {
  getTeacherFirebaseClient,
  signInTeacherWithGoogle,
  signOutTeacher,
  teacherAuthErrorMessage
} from './teacher-auth.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function teacherPageMarkup({ user = null, ready = true, busy = false, error = '' } = {}) {
  return `
    <section class="teacher-auth-page" aria-labelledby="teacher-title">
      <div class="teacher-auth-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="teacher-auth-panel">
        <p class="section-label">TEACHER · C1-A</p>
        <h1 id="teacher-title">教師進度</h1>
        ${user ? `
          <p class="teacher-auth-status">Google 登入成功</p>
          <dl class="teacher-auth-identity">
            ${user.displayName ? `<div><dt>名稱</dt><dd>${escapeHtml(user.displayName)}</dd></div>` : ''}
            ${user.email ? `<div><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>` : ''}
            <div><dt>Firebase UID</dt><dd class="teacher-auth-uid">${escapeHtml(user.uid)}</dd></div>
          </dl>
          <p class="teacher-auth-notice">教師身分尚未授權</p>
          <button class="primary-button" id="teacher-sign-out" type="button" ${busy ? 'disabled' : ''}>登出並返回學生首頁</button>
        ` : `
          <p class="teacher-auth-lead">請使用授權的教師 Google 帳號登入</p>
          <button class="primary-button" id="teacher-google-sign-in" type="button" ${busy || !ready ? 'disabled' : ''}>${busy ? '正在開啟登入…' : !ready ? '正在準備登入…' : '使用 Google 帳號登入'}</button>
          <button class="teacher-home-link" id="teacher-home" type="button">返回學生首頁</button>
        `}
        <p class="teacher-auth-error" role="alert">${escapeHtml(error)}</p>
      </div>
    </section>`;
}

export function renderTeacherPage({ app, navigate, getClient = getTeacherFirebaseClient }) {
  let client = null;
  let unsubscribe = null;
  let disposed = false;
  const pageState = { user: null, ready: false, busy: false, error: '' };

  function render() {
    if (disposed) return;
    app.innerHTML = teacherPageMarkup(pageState);
    app.querySelector('#teacher-home')?.addEventListener('click', () => navigate('#home'));
    app.querySelector('#teacher-google-sign-in')?.addEventListener('click', async () => {
      pageState.busy = true;
      pageState.error = '';
      render();
      try {
        const credential = await signInTeacherWithGoogle(client);
        pageState.user = credential.user;
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
        pageState.user = null;
        navigate('#home');
      } catch (error) {
        pageState.busy = false;
        pageState.error = teacherAuthErrorMessage(error);
        render();
      }
    });
  }

  render();
  void getClient().then((teacherClient) => {
    if (disposed) return;
    client = teacherClient;
    pageState.ready = true;
    unsubscribe = client.onAuthStateChanged(client.auth, (user) => {
      pageState.user = user;
      pageState.error = '';
      render();
    });
  }).catch((error) => {
    pageState.error = teacherAuthErrorMessage(error);
    render();
  });

  return {
    destroy() {
      disposed = true;
      unsubscribe?.();
    }
  };
}
