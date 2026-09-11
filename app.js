import { principles, stages } from './data.js';
import { createRenderers } from './renderers.js?v=explore-1';
import { resolveRoute } from './router.js?v=v2-entry-1';
import { createAppState, setCurrentRoute } from './state.js?v=v2-b2-checkpoints-1';
import { renderGeometryPlayground } from './geometry/playground.js';
import { renderValidatorLab } from './validator-lab.js';
import { recognizeQuestions } from './recognize-questions.js';
import { createRecognizeCourseRenderers } from './recognize-course.js?v=v2-b2-checkpoints-1';
import { discoverQuestions } from './discover-questions.js';
import { createDiscoverCourseRenderers } from './discover-course.js?v=v2-b2-checkpoints-1';
import { createExperimentCourseRenderers } from './experiment-course.js?v=v2-b2-checkpoints-1';
import { createPhase6cCourseState } from './phase6c-course-state.js?v=balance-asymmetry-2';
import { phase6cDefinitions, phase6cDefinitionsById } from './phase6c-definitions.js?v=balance-asymmetry-2';
import { isClassroomRouteAllowed, loadClassroomUnlocks, requiredUnlockForRoute, resetClassroomUnlocks } from './classroom-unlocks.js?v=classroom-control-1';
import { classroomOptions, formatSeatNumber, seatOptions } from './classroom-config.js';
import { fallbackClassConfigs, loadClassConfigs } from './class-config-service.js?v=v2-d3-1';
import { isAcademicYearNetworkError, loadActiveAcademicYear } from './academic-year-service.js?v=v2-d3-1-1';
import { ensureAnonymousAuth, getFirebaseClient } from './firebase-client.js?v=v2-d3-1-1';
import { clearCurrentStudent, createStudentIdentity, loadCurrentStudent, saveCurrentStudent } from './student-session.js?v=v2-d3-1';
import { writeStudentProgressCheckpoint } from './student-progress-cloud.js?v=v2-b2-checkpoints-1';
import { renderTeacherPage } from './teacher-page.js?v=teacher-return-1';
import { renderSiteEntry } from './site-entry.js?v=author-credit-1';

const captureWidth = Number(new URLSearchParams(location.search).get('capture'));
const runtimePath = location.pathname.replace(/\/+$/, '');
const runtimeMode = runtimePath === '/principles-lab/explore' || runtimePath === '/explore' ? 'explore' : 'class';
const isExploreMode = runtimeMode === 'explore';
if (captureWidth) {
  document.documentElement.classList.add('capture-wide');
  document.documentElement.style.setProperty('--capture-width', `${captureWidth}px`);
}

const app = document.querySelector('#app');
const state = createAppState(stages, recognizeQuestions, discoverQuestions);
let classroomStorage = null;
if (!isExploreMode) {
  try { classroomStorage = window.localStorage; } catch { /* storage may be unavailable */ }
}
state.classroomUnlocks = isExploreMode
  ? { recognize: true, discover: true, experiment: true }
  : loadClassroomUnlocks(classroomStorage);
const pendingStoredStudent = isExploreMode ? null : loadCurrentStudent(classroomStorage);
state.currentStudent = null;
state.experimentCourse = createPhase6cCourseState(phase6cDefinitions);
let identityDraft = { classId: '', seatNo: '', confirming: false, ending: false };
let classConfigState = { status: 'loading', source: 'fallback', configs: fallbackClassConfigs(), error: '' };
let classConfigRequest = null;
let academicYearState = isExploreMode
  ? { status: 'ready', academicYear: null, source: 'explore', initialized: false, warning: '' }
  : { status: 'loading', academicYear: '115', source: '', initialized: false, warning: '' };
let academicYearRequest = null;

function loadStudentAcademicYear() {
  if (academicYearRequest) return academicYearRequest;
  academicYearRequest = getFirebaseClient().then(async (client) => {
    await ensureAnonymousAuth(client);
    const result = await loadActiveAcademicYear(client);
    academicYearState = { ...result, status: 'ready' };
    if (result.errorCode) console.warn(`[academic year] read failed: ${result.errorCode}`);
    const restored = result.academicYear ? loadCurrentStudent(classroomStorage, result.academicYear) : null;
    state.currentStudent = restored;
    if (pendingStoredStudent && !restored) {
      clearCurrentStudent(classroomStorage);
      state.classroomUnlocks = resetClassroomUnlocks(classroomStorage);
      state.classroomGate = { activeCourseId: null, message: '', error: '' };
      history.replaceState(null, '', '#student');
    }
    return { client, result };
  }).catch((error) => {
    const networkFallback = isAcademicYearNetworkError(error);
    academicYearState = networkFallback
      ? { status: 'ready', academicYear: '115', source: 'network-fallback', initialized: false, warning: '學年度設定暫時無法連線，目前使用暫存年度 115。', errorCode: error?.code ?? 'network-error' }
      : { status: 'ready', academicYear: null, source: 'runtime-error', initialized: false, warning: '目前無法取得學年度設定，請稍後重新整理或通知老師。', errorCode: error?.code ?? 'runtime-error' };
    console.warn(`[academic year] initialization failed: ${academicYearState.errorCode}`);
    state.currentStudent = networkFallback ? loadCurrentStudent(classroomStorage, '115') : null;
    return { client: null, result: academicYearState };
  }).then((loaded) => { renderCurrentRoute(); return loaded; });
  return academicYearRequest;
}

function loadStudentClassConfigs() {
  if (classConfigRequest) return classConfigRequest;
  classConfigRequest = loadStudentAcademicYear()
    .then(async ({ client, result: academicYear }) => {
      if (!client) throw new Error('offline');
      if (!academicYear.academicYear) return { status: 'error', source: academicYear.source, configs: [], error: academicYear.warning };
      return loadClassConfigs(client, academicYear.academicYear, undefined, { allowLegacyFallback: !academicYear.initialized });
    })
    .catch(() => ({
      status: 'error', source: academicYearState.source,
      configs: academicYearState.source === 'network-fallback' || academicYearState.source === 'legacy-missing' ? fallbackClassConfigs() : [],
      error: academicYearState.source === 'network-fallback' || academicYearState.source === 'legacy-missing' ? '班級設定暫時無法連線，目前使用既有班級設定。' : academicYearState.warning
    }))
    .then((result) => {
      classConfigState = result;
      const activeConfigs = result.configs.filter(({ active }) => active);
      const selectedSeats = seatOptions(identityDraft.classId, activeConfigs);
      if (identityDraft.classId && (!selectedSeats.length || (identityDraft.seatNo && !selectedSeats.includes(Number(identityDraft.seatNo))))) {
        identityDraft = { classId: '', seatNo: '', confirming: false, ending: false };
      }
      if (location.hash === '#student') renderCurrentRoute();
      return result;
    });
  return classConfigRequest;
}

function saveCloudCheckpoint(checkpointName) {
  if (runtimeMode !== 'class') return;
  void writeStudentProgressCheckpoint(state.currentStudent, checkpointName).then((result) => {
    if (!result.ok) console.warn(`[cloud progress] ${checkpointName}: ${result.message}`);
  });
}

function renderIdentityGate() {
  void loadStudentAcademicYear();
  void loadStudentClassConfigs();
  const activeConfigs = classConfigState.configs.filter(({ active }) => active);
  const configReady = classConfigState.status !== 'loading';
  const classes = classroomOptions(activeConfigs);
  const seats = seatOptions(identityDraft.classId, activeConfigs);
  app.innerHTML = `
    <section class="identity-gate page-shell" aria-labelledby="identity-title">
      <button class="identity-entry-back" id="identity-entry-back" type="button">← 返回入口</button>
      <div class="identity-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="identity-panel">
        <p class="section-label">V2 · DEMO 班級資料</p>
        <h1 id="identity-title">今天是哪位同學使用？</h1>
        ${academicYearState.warning ? `<p class="identity-config-notice" role="status">${academicYearState.warning}</p>` : ''}
        ${classConfigState.status === 'loading' ? '<p role="status">正在讀取班級設定…</p>' : ''}
        ${classConfigState.error ? `<p class="identity-config-notice" role="status">${classConfigState.error}</p>` : ''}
        ${configReady && !activeConfigs.length ? `<p class="identity-config-notice" role="status">目前尚未設定班級。</p>` : identityDraft.confirming ? `
          <p class="identity-confirm-question">你是 <strong>${identityDraft.classId} 班 ${identityDraft.seatNo} 號</strong>嗎？</p>
          <div class="identity-actions">
            <button class="secondary-button" id="identity-reselect" type="button">重新選擇</button>
            <button class="primary-button" id="identity-confirm" type="button">確認進入</button>
          </div>
        ` : `
          <div class="identity-fields">
            <label>選擇班級
              <select id="identity-class" ${configReady ? '' : 'disabled'}>
                <option value="">請選擇班級</option>
                ${classes.map(({ value, label }) => `<option value="${value}" ${identityDraft.classId === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </label>
            <label>選擇座號
              <select id="identity-seat" ${configReady && identityDraft.classId ? '' : 'disabled'}>
                <option value="">請選擇座號</option>
                ${seats.map((seat) => `<option value="${seat}" ${Number(identityDraft.seatNo) === seat ? 'selected' : ''}>${formatSeatNumber(seat)} 號</option>`).join('')}
              </select>
            </label>
          </div>
          <button class="primary-button identity-next" id="identity-next" type="button" ${configReady && identityDraft.classId && identityDraft.seatNo ? '' : 'disabled'}>確認身分</button>
        `}
      </div>
    </section>`;

  document.querySelector('#identity-entry-back')?.addEventListener('click', () => navigate('#entry'));
  document.querySelector('#identity-class')?.addEventListener('change', (event) => {
    identityDraft = { classId: event.target.value, seatNo: '', confirming: false, ending: false };
    renderIdentityGate();
  });
  document.querySelector('#identity-seat')?.addEventListener('change', (event) => {
    identityDraft.seatNo = event.target.value;
    renderIdentityGate();
  });
  document.querySelector('#identity-next')?.addEventListener('click', () => {
    if (!createStudentIdentity(identityDraft.classId, identityDraft.seatNo, academicYearState.academicYear, activeConfigs)) return;
    identityDraft.confirming = true;
    renderIdentityGate();
  });
  document.querySelector('#identity-reselect')?.addEventListener('click', () => {
    identityDraft.confirming = false;
    renderIdentityGate();
  });
  document.querySelector('#identity-confirm')?.addEventListener('click', () => {
    state.currentStudent = saveCurrentStudent(identityDraft, classroomStorage, activeConfigs, academicYearState.academicYear);
    identityDraft = { classId: '', seatNo: '', confirming: false, ending: false };
    renderCurrentRoute();
  });
}

function attachStudentControls() {
  const { classId, seatNo } = state.currentStudent;
  app.insertAdjacentHTML('beforeend', `
    <aside class="student-identity-dock" aria-label="目前平板身分">
      <strong>${classId}｜${seatNo}</strong>
      ${identityDraft.ending ? `
        <span>確定要結束 ${classId} 班 ${seatNo} 號的本次使用嗎？</span>
        <button type="button" id="student-end-cancel">取消</button>
        <button type="button" id="student-end-confirm">結束使用</button>
      ` : '<button type="button" id="teacher-progress">教師進度</button><button type="button" id="student-end">結束本次使用</button>'}
    </aside>`);
  document.querySelector('#teacher-progress')?.addEventListener('click', openTeacherProgress);
  document.querySelector('#student-end')?.addEventListener('click', () => { identityDraft.ending = true; renderCurrentRoute(); });
  document.querySelector('#student-end-cancel')?.addEventListener('click', () => { identityDraft.ending = false; renderCurrentRoute(); });
  document.querySelector('#student-end-confirm')?.addEventListener('click', () => {
    state.currentStudent = clearCurrentStudent(classroomStorage);
    state.classroomUnlocks = resetClassroomUnlocks(classroomStorage);
    state.classroomGate = { activeCourseId: null, message: '', error: '' };
    identityDraft = { classId: '', seatNo: '', confirming: false, ending: false };
    renderCurrentRoute();
  });
}

function focusRouteHeading() {
  const heading = app.querySelector('h1');
  if (!heading) return;
  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

function navigate(hash) {
  if (location.hash === hash) {
    renderCurrentRoute();
    return;
  }
  location.hash = hash;
}

const checkpointCallback = isExploreMode ? () => {} : saveCloudCheckpoint;
const renderers = createRenderers({ app, state, navigate, classroomStorage, onCheckpoint: checkpointCallback, mode: runtimeMode });
const recognizeRenderers = createRecognizeCourseRenderers({ app, state, navigate, onCheckpoint: checkpointCallback });
const discoverRenderers = createDiscoverCourseRenderers({ app, state, navigate, onCheckpoint: checkpointCallback });
const experimentRenderers = createExperimentCourseRenderers({ app, state, navigate, onCheckpoint: checkpointCallback });
let activePlayground = null;
let activeTeacherPage = null;
let teachingReturnHash = '#home';

function isTeachingRoute(route) {
  return !route.isFallback
    && !route.isLegacyAlias
    && !['entry', 'studentEntry', 'teacher', 'geometryPlayground', 'validatorLab', 'recognizeTemplateDev', 'discoverDev', 'experimentDev'].includes(route.name);
}

function openTeacherProgress() {
  const route = resolveRoute(location.hash, stages, principles, recognizeQuestions);
  teachingReturnHash = isTeachingRoute(route) ? route.hash : '#home';
  navigate('#teacher');
}

function returnToTeaching() {
  const route = resolveRoute(teachingReturnHash, stages, principles, recognizeQuestions);
  navigate(isTeachingRoute(route) ? route.hash : '#home');
}

function renderCurrentRoute() {
  activePlayground?.canvas.destroy();
  activePlayground = null;
  activeTeacherPage?.destroy();
  activeTeacherPage = null;
  experimentRenderers.destroy();
  let route = resolveRoute(location.hash, stages, principles, recognizeQuestions);
  if (isExploreMode && ['entry', 'studentEntry', 'teacher'].includes(route.name)) {
    history.replaceState(null, '', '#home');
    route = resolveRoute('#home', stages, principles, recognizeQuestions);
  }
  if (route.name === 'entry') {
    renderSiteEntry({ app, navigate });
    window.scrollTo(0, 0);
    focusRouteHeading();
    return;
  }
  if (route.name === 'teacher') {
    activeTeacherPage = renderTeacherPage({ app, navigate, returnToTeaching });
    window.scrollTo(0, 0);
    focusRouteHeading();
    return;
  }
  if (!isExploreMode && academicYearState.status === 'loading') {
    void loadStudentAcademicYear();
    renderIdentityGate();
    window.scrollTo(0, 0);
    focusRouteHeading();
    return;
  }
  if (!isExploreMode && !state.currentStudent) {
    if (route.name === 'studentEntry') renderIdentityGate();
    else renderSiteEntry({ app, navigate });
    window.scrollTo(0, 0);
    focusRouteHeading();
    return;
  }
  if (route.name === 'studentEntry') {
    history.replaceState(null, '', '#home');
    route = resolveRoute('#home', stages, principles, recognizeQuestions);
  }
  if (!isClassroomRouteAllowed(route, state.classroomUnlocks)) {
    const courseId = requiredUnlockForRoute(route);
    state.classroomGate.activeCourseId = courseId;
    state.classroomGate.error = '';
    state.classroomGate.message = '這一關尚未開放，請等待老師公布通行碼。';
    history.replaceState(null, '', '#principles');
    route = resolveRoute('#principles', stages, principles, recognizeQuestions);
  }
  setCurrentRoute(state, route);

  if (route.isFallback || route.isLegacyAlias) {
    history.replaceState(null, '', route.hash);
  }

  if (route.name === 'geometryPlayground') {
    activePlayground = renderGeometryPlayground({ app, navigate });
  } else if (route.name === 'validatorLab') {
    renderValidatorLab({ app, navigate });
  } else if (route.name === 'recognizeTemplateDev') {
    recognizeRenderers.dev();
  } else if (route.name === 'recognizeStart') {
    recognizeRenderers.start();
  } else if (route.name === 'recognizeQuestion') {
    recognizeRenderers.question(route.question);
  } else if (route.name === 'recognizeComplete') {
    recognizeRenderers.complete();
  } else if (route.name === 'discoverStart') {
    discoverRenderers.start();
  } else if (route.name === 'discoverQuestion') {
    discoverRenderers.question();
  } else if (route.name === 'discoverComplete') {
    discoverRenderers.complete();
  } else if (route.name === 'discoverDev') {
    discoverRenderers.dev();
  } else if (route.name === 'experimentStart') {
    experimentRenderers.start();
  } else if (route.name === 'experiment') {
    experimentRenderers.experiment(phase6cDefinitionsById[`experiment-${route.principleId}`]);
  } else if (route.name === 'experimentComplete') {
    experimentRenderers.complete();
  } else if (route.name === 'experimentDev') {
    experimentRenderers.dev();
  } else if (route.name === 'stage') {
    renderers.stage(route.stage);
  } else if (route.name === 'complete') {
    renderers.complete(route.principle);
  } else {
    renderers[route.name]();
  }

  if (!isExploreMode) attachStudentControls();

  window.scrollTo(0, 0);
  focusRouteHeading();
}

window.addEventListener('hashchange', renderCurrentRoute);
renderCurrentRoute();

export { navigate, renderCurrentRoute, runtimeMode, state };
