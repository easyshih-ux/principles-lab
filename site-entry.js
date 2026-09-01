export function siteEntryMarkup() {
  return `
    <section class="site-entry-page" aria-labelledby="site-entry-title">
      <header class="site-entry-header">
        <p>FORM · PRINCIPLES LAB</p>
        <button id="enter-teacher" type="button">教師登入 ↗</button>
      </header>
      <div class="site-entry-art" aria-hidden="true">
        <i class="entry-red-circle"></i><i class="entry-blue-half"></i>
        <i class="entry-yellow-block"></i><i class="entry-line-set"></i><i class="entry-dot-grid"></i>
      </div>
      <main class="site-entry-panel">
        <div class="site-entry-title-frame">
          <h1 id="site-entry-title"><span>形式原理</span><span>視覺實驗室</span></h1>
        </div>
        <p class="site-entry-lead">探索形式原理，開啟你的視覺思考力</p>
        <button class="site-entry-button" id="enter-student" type="button">
          <strong>開始實驗 →</strong><small>班級與座號確認 →</small>
        </button>
      </main>
    </section>`;
}

export function renderSiteEntry({ app, navigate }) {
  app.innerHTML = siteEntryMarkup();
  app.querySelector('#enter-student')?.addEventListener('click', () => navigate('#student'));
  app.querySelector('#enter-teacher')?.addEventListener('click', () => navigate('#teacher'));
}
