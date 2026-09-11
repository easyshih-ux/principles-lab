import {
  getPrinciple,
  getStagesForPrinciple,
  principles,
  stages
} from './data.js';
import {
  clearStageCompletion,
  areFreeReviewStagesComplete,
  getStageState,
  markPrincipleComplete,
  isFreeReviewComplete,
  markFreeReviewPrincipleComplete,
  markFreeReviewVisited,
  markStageComplete,
  resetPrincipleStages,
  updateStageState
} from './state.js?v=v2-b2-checkpoints-1';
import { nextHashForStage, stageHash } from './router.js';
import { validateStage } from './validators.js';
import { attemptClassroomUnlock, CLASSROOM_COURSES } from './classroom-unlocks.js?v=classroom-control-1';
import { getDisplayColor } from './geometry/palette.js';

const homeCoursePresentation = Object.freeze({
  recognize: Object.freeze({ number: '01', title: '看得出來', subtitle: '觀察與辨識' }),
  discover: Object.freeze({ number: '02', title: '找得到', subtitle: '分析與判斷' }),
  experiment: Object.freeze({ number: '03', title: '做得出來', subtitle: '創作與實踐' })
});

function homeCourseArt(courseId) {
  if (courseId === 'recognize') return '<span class="home-art-circle"></span><span class="home-art-square"></span><span class="home-art-lens"></span>';
  if (courseId === 'discover') return '<span class="home-art-square"></span><span class="home-art-circle"></span><span class="home-art-black-square"></span><span class="home-art-cross"></span>';
  return '<span class="home-art-triangle"></span><span class="home-art-circle"></span><span class="home-art-pencil"></span><span class="home-art-line"></span>';
}

export function classroomCourseCardsMarkup(unlocks = {}, completion = {}, gate = {}, presentation = 'wall') {
  return CLASSROOM_COURSES.map((course) => {
    const unlocked = unlocks[course.id] === true;
    const completed = completion[course.id] === true;
    const active = gate.activeCourseId === course.id;
    const status = unlocked ? (completed ? '✓ 已完成' : '🔓 已開放') : '🔒 等待老師開放';
    const action = unlocked
      ? `<button type="button" class="${course.id === 'recognize' ? 'primary-button' : 'secondary-button'} compact" data-course-enter="${course.id}">${completed ? '再次進入' : `進入${course.name}`}</button>`
      : `<button type="button" class="secondary-button compact" data-unlock-open="${course.id}">輸入通行碼</button>`;
    const form = !unlocked && active ? `
      <form class="classroom-passcode-form" data-unlock-form="${course.id}">
        <label for="classroom-code-${course.id}">${course.name}通行碼</label>
        <div><input id="classroom-code-${course.id}" name="passcode" type="text" autocomplete="off" autocapitalize="characters" required><button type="submit" class="primary-button compact">確認開放</button></div>
        ${gate.error ? `<p class="classroom-gate-error" role="alert">${gate.error}</p>` : ''}
      </form>` : '';
    if (presentation === 'home') {
      const copy = homeCoursePresentation[course.id];
      return `<article class="classroom-course-card home-course-card home-course-${course.id} ${unlocked ? 'is-unlocked' : 'is-locked'}">
        <div class="home-course-copy">
          <span class="home-course-number">${copy.number}</span>
          <span class="classroom-course-status">${status}</span>
          <h2>${copy.title}</h2>
          <p>${copy.subtitle}</p>
        </div>
        <div class="home-course-art" aria-hidden="true">${homeCourseArt(course.id)}</div>
        <div class="home-course-action">${action}</div>
        ${form}
      </article>`;
    }
    return `<article class="classroom-course-card ${unlocked ? 'is-unlocked' : 'is-locked'}"><div><span class="classroom-course-status">${status}</span><h2>${course.name}｜${course.title}</h2>${course.id === 'experiment' ? '<p>運用有限工具，親手做出形式原理。</p>' : ''}</div>${action}${form}</article>`;
  }).join('');
}

const dotColors = [
  'var(--red)',
  'var(--blue)',
  'var(--yellow)',
  'var(--black)',
  'var(--green)',
  'var(--red)'
];

function visualColor(color) {
  return ['red', 'blue', 'yellow', 'black'].includes(color)
    ? `var(--${color})`
    : getDisplayColor(color, 3);
}

function button(label, className = 'primary-button', id = '') {
  return `<button type="button" class="${className}" ${id ? `id="${id}"` : ''}>${label}</button>`;
}

export function bindSquareSizePreview(input, shape, onSize) {
  input.addEventListener('input', () => {
    const size = Number(input.value);
    onSize(size);
    shape.style.width = `${size}px`;
    shape.style.height = `${size}px`;
  });
}

function successActionButton(label, stage) {
  const duration = stage.stageType === 'experiment' || stage.interactionType === 'rhythm-follow' ? 1050 : 850;
  return `<button type="button" class="primary-button compact" id="next" disabled data-success-delay="${duration}">${label}</button>`;
}

function enableSuccessAction() {
  const action = document.querySelector('[data-success-delay]');
  if (!action) return;
  window.setTimeout(() => { action.disabled = false; }, Number(action.dataset.successDelay));
}

function dot(size, index, extraClass = '') {
  return `
    <span
      class="dot ${extraClass}"
      style="--size:${size}px;--dot-color:${dotColors[index % dotColors.length]}"
      aria-hidden="true"
    ></span>`;
}

function symbolMark(symbol, index = 0) {
  const names = { '●': '圓形', '■': '方形', '▲': '三角形', '★': '星形', '◆': '菱形' };
  return `<span class="review-symbol symbol-${index % 3}" aria-label="${names[symbol] ?? symbol}">${symbol}</span>`;
}

function symmetryComposition(option, animated = false) {
  return `<span class="symmetry-mini ${animated ? 'symmetry-success' : ''}">
    <i class="symmetry-axis" aria-hidden="true"></i>
    ${option.pairs.map(([y, leftX, rightX], index) => `
      <span class="symmetry-pair-left pair-${index}" style="--x:${leftX}%;--y:${y}%">${symbolMark(['●', '■', '▲'][index], index)}</span>
      ${rightX == null ? '' : `<span class="symmetry-pair-right pair-${index}" style="--x:${rightX}%;--y:${y}%">${symbolMark(['●', '■', '▲'][index], index)}</span>`}
    `).join('')}
  </span>`;
}

function balanceComposition(option) {
  const kind = typeof option === 'string' ? option : option.kind;
  const colors = typeof option === 'string' ? ['red', 'blue', 'yellow'] : option.colors;
  const rightXs = kind === 'asymmetric-balanced' ? [66, 73, 80] : kind === 'unbalanced' ? [76, 84, 92] : [70];
  return `<span class="balance-mini"><i class="balance-center"></i>
    <span class="balance-shape large" style="--x:30%;--y:52%;--balance-color:var(--${colors[0]})"></span>
    ${rightXs.map((x, index) => `<span class="balance-shape small" style="--x:${x}%;--y:${35 + index * 17}%;--balance-color:var(--${colors[1 + index % (colors.length - 1)]})"></span>`).join('')}
    ${kind === 'symmetric' ? `<span class="balance-shape large mirror" style="--x:70%;--y:52%;--balance-color:var(--${colors[2]})"></span>` : ''}
  </span>`;
}

function rhythmComposition(ys, animated = false) {
  const animationClass = [
    'rhythm-bauhaus',
    animated ? 'rhythm-success' : ''
  ].filter(Boolean).join(' ');
  return `<span class="rhythm-mini ${animationClass}">${ys.map((y, index) => `<i style="--x:${12 + index * 15}%;--y:${y}%;--delay:${index * .1}s"></i>`).join('')}</span>`;
}

function unityComposition(option, animated = false) {
  return `<span class="principle-family unity-family ${animated ? 'unity-recognize-success' : ''}">${option.shapes.map((shape, index) => `<i class="family-shape ${shape}" style="--family-color:${visualColor(option.colors[index])};--delay:${index * .08}s"></i>`).join('')}</span>`;
}

function harmonyComposition(option, animated = false) {
  return `<span class="principle-family harmony-family ${animated ? 'harmony-recognize-success' : ''}">${option.colors.map((color, index) => `<i style="--family-color:${visualColor(color)};--delay:${index * .08}s"></i>`).join('')}</span>`;
}

function contrastComposition(option, animated = false) {
  return `<span class="contrast-composition ${animated ? 'contrast-recognize-success' : ''}">${option.sizes.map((size, index) => `<i style="--shape-size:${size}px;--shape-color:${visualColor(option.colors[index])};--delay:${index * .08}s"></i>`).join('')}</span>`;
}

function proportionComposition(option, animated = false) {
  return `<span class="proportion-composition ${animated ? 'proportion-recognize-success' : ''}">${option.sizes.map((size, index) => `<i class="${index === 0 ? 'main' : 'support'} shape-${index % 3}" style="--shape-size:${size}px;--shape-color:${visualColor(option.colors[index])};--delay:${index * .07}s"></i>`).join('')}</span>`;
}

function simplicityComposition(option, animated = false) {
  const counts = { busy: 9, clear: 5, empty: 2 };
  return `<span class="simplicity-composition ${option.kind} ${animated ? 'simplicity-recognize-success' : ''}">${Array.from({ length: counts[option.kind] }, (_, index) => `<i class="${index < 3 ? 'core' : 'extra'} shape-${index % 3}" style="--shape-color:${visualColor(option.colors[index % option.colors.length])};--delay:${index * .06}s"></i>`).join('')}</span>`;
}

function editableShape(element, extraClass = '') {
  return `<span class="free-shape ${element.shape} ${element.core ? 'core' : ''} ${element.extra ? 'extra' : ''} ${extraClass}" style="--x:${element.x}%;--y:${element.y}%;--shape-size:${element.size}px;--shape-color:${visualColor(element.color)}"></span>`;
}

function sampleDots(principle) {
  return `
    <div class="mini-dots ${principle.id}">
      ${principle.previewSizes.map((size, index) => dot(size, index)).join('')}
    </div>`;
}

function principleCardIcon(principleId) {
  const item = (className, extra = '') => `<i class="${className}" ${extra}></i>`;
  const icons = {
    repetition: `<span class="icon-row repeat-row">${['red','blue','red','blue','red'].map((color) => item(`circle ${color}`)).join('')}</span>`,
    gradation: `<span class="icon-row gradation-row">${[10,16,23,31,41].map((size) => item('circle yellow', `style="--icon-size:${size}px"`)).join('')}</span>`,
    symmetry: `<span class="symmetry-card-icon"><b></b>${item('square red left-outer')}${item('circle blue left-inner')}${item('circle blue right-inner')}${item('square red right-outer')}</span>`,
    balance: `<span class="balance-card-icon">${item('circle red heavy')}${item('square blue light-one')}${item('circle yellow light-two')}${item('square black light-three')}</span>`,
    contrast: `<span class="contrast-card-icon">${item('square black large')}${item('circle yellow small')}${item('square red accent')}</span>`,
    rhythm: `<span class="rhythm-card-icon"><b></b>${['red','yellow','blue','red','yellow','blue'].map((color, index) => item(`circle ${color} beat-${index + 1}`)).join('')}</span>`,
    proportion: `<span class="proportion-card-icon">${item('circle red main')}${item('square blue support-one')}${item('circle yellow support-two')}${item('square black support-three')}${item('circle blue support-four')}</span>`,
    unity: `<span class="icon-row unity-row">${['square blue','square blue','circle blue','square blue','square blue'].map((classes) => item(classes)).join('')}</span>`,
    harmony: `<span class="harmony-card-icon">${item('circle red')}${item('square yellow')}${item('triangle red-soft')}${item('circle yellow-soft')}${item('square black')}</span>`,
    simplicity: `<span class="simplicity-card-icon">${item('circle red main')}${item('bar blue')}${item('square black')}${item('circle yellow')}</span>`
  };
  return `<span class="principle-card-icon icon-${principleId}" aria-hidden="true">${icons[principleId]}</span>`;
}

function taskFrame({ principle, stage, canvas, controls, feedback }) {
  const progress = `${stage.progress.current}／${stage.progress.total}`;

  return `
    <section class="task-page page-shell">
      <header class="task-header">
        <button class="back-link" id="task-back">← 返回形式原理選擇頁</button>
        <h1>${stage.title}</h1>
        <span class="progress">${progress}</span>
      </header>
      <div class="task-prompt">
        <p class="section-label">${principle.name}實驗</p>
        <h2>${stage.prompt}</h2>
        ${stage.description ? `<p>${stage.description}</p>` : ''}
      </div>
      <div class="artboard-wrap">${canvas}</div>
      <div class="task-footer">
        <div class="feedback" role="status" aria-live="polite" aria-atomic="true">
          ${feedback}
        </div>
        <div class="task-actions">${controls}</div>
      </div>
    </section>`;
}

export function createRenderers({ app, state, navigate, classroomStorage = null, onCheckpoint = () => {} }) {
  function completeFreeReviewPrinciple(principleId) {
    markPrincipleComplete(state, principleId);
    if (!areFreeReviewStagesComplete(state, getStagesForPrinciple(principleId))) return;
    markFreeReviewPrincipleComplete(state, principleId);
    if (isFreeReviewComplete(state, principles.map(({ id }) => id))) onCheckpoint('freeReviewComplete');
  }
  function bindClassroomControls(rerender) {
    document.querySelectorAll('[data-course-enter]').forEach((courseButton) => courseButton.addEventListener('click', () => {
      const course = CLASSROOM_COURSES.find(({ id }) => id === courseButton.dataset.courseEnter);
      if (course) navigate(course.route);
    }));
    document.querySelectorAll('[data-unlock-open]').forEach((unlockButton) => unlockButton.addEventListener('click', () => {
      state.classroomGate.activeCourseId = unlockButton.dataset.unlockOpen;
      state.classroomGate.message = '';
      state.classroomGate.error = '';
      rerender();
      queueMicrotask(() => document.querySelector(`#classroom-code-${unlockButton.dataset.unlockOpen}`)?.focus());
    }));
    document.querySelectorAll('[data-unlock-form]').forEach((form) => form.addEventListener('submit', (event) => {
      event.preventDefault();
      const courseId = form.dataset.unlockForm;
      const result = attemptClassroomUnlock(courseId, new FormData(form).get('passcode'), state.classroomUnlocks, classroomStorage);
      state.classroomUnlocks = result.unlocks;
      if (result.ok) {
        const course = CLASSROOM_COURSES.find(({ id }) => id === courseId);
        state.classroomGate.activeCourseId = null;
        state.classroomGate.error = '';
        state.classroomGate.message = `${course.name}已開放！`;
        rerender();
        queueMicrotask(() => document.querySelector(`[data-course-enter="${courseId}"]`)?.focus());
        return;
      }
      state.classroomGate.error = '通行碼不正確，請確認老師公布的通行碼。';
      state.classroomGate.message = '';
      rerender();
      queueMicrotask(() => document.querySelector(`#classroom-code-${courseId}`)?.focus());
    }));
  }

  function renderHome() {
    app.innerHTML = `
      <section class="final-home" aria-labelledby="home-title">
        <div class="home-decor home-decor-left" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="home-decor home-decor-right" aria-hidden="true"><i></i><i></i><i></i></div>
        <header class="home-brand">
          <span class="home-brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span><strong>FORM LAB</strong><small>形式原理視覺實驗室</small><span class="home-brand-credit">Made by WenYi</span></span>
        </header>
        <div class="home-dot-grid home-dot-grid-top" aria-hidden="true"></div>
        <div class="home-main">
          <h1 class="home-title" id="home-title"><span>形式原理</span><span>視覺實驗室</span></h1>
          <div class="home-learning-path" aria-label="學習流程">
            <span><i class="path-red"></i>看得出來</span><b>→</b>
            <span><i class="path-yellow"></i>找得到</span><b>→</b>
            <span><i class="path-blue"></i>做得出來</span>
          </div>
          <aside class="home-review-entry" aria-labelledby="home-review-title">
            <span class="home-review-mark" aria-hidden="true"><i></i><i></i><i></i></span>
            <div><p>自由複習</p><h2 id="home-review-title">10 個形式原理</h2><span>還不確定？先自由探索與複習</span></div>
            <button type="button" class="home-review-button" id="enter-free-review">開始複習 →</button>
          </aside>
          <div class="home-course-grid" aria-label="學習關卡">
            ${classroomCourseCardsMarkup(state.classroomUnlocks, state.completion.courses, state.classroomGate, 'home')}
          </div>
          <p class="classroom-gate-message home-gate-message" role="status" aria-live="polite">${state.classroomGate.message}</p>
        </div>
        <button class="home-teacher-entry" id="enter-teacher" type="button">教師進度 →</button>
        <footer class="home-footer" aria-hidden="true"><span></span><b>FORM LAB</b><span></span></footer>
      </section>`;
    bindClassroomControls(renderHome);
    document.querySelector('#enter-free-review').addEventListener('click', () => navigate('#principles'));
    document.querySelector('#enter-teacher').addEventListener('click', () => navigate('#teacher'));
  }
  function renderPrinciples() {
    app.innerHTML = `
      <section class="wall principles-page page-shell">
        <header class="wall-header principles-header">
          <button class="principles-back" id="home-back">← 返回</button>
          <div class="principles-heading">
            <p class="section-label">自由複習</p>
            <h1>10 個形式原理視覺實驗</h1>
            <p class="wall-review-note">點選任一原理，開始自由複習與練習</p>
          </div>
        </header>
        <div class="sample-wall principles-grid">
          ${principles.map((principle, index) => {
            const isAvailable = principle.status === 'available' && principle.hasContent;
            const isVisited = state.freeReviewVisited[principle.id] === true;
            return `
              <article class="sample principle-card sample-${index + 1} ${isAvailable ? 'available' : ''} ${isVisited ? 'visited' : ''}" style="--card-index:'${String(index + 1).padStart(2, '0')}'">
                <span class="card-accent" aria-hidden="true"></span>
                ${isVisited ? '<span class="visited-mark" aria-label="已練習">✓</span>' : ''}
                <div class="sample-visual">${principleCardIcon(principle.id)}</div>
                <div class="sample-copy">
                  <span class="sample-no">${String(index + 1).padStart(2, '0')}</span>
                  <h2>${principle.name}</h2>
                  <p>${principle.shortDescription}</p>
                  ${isAvailable
                    ? `<button class="sample-enter" data-principle-id="${principle.id}">視覺實驗 →</button>`
                    : '<span class="sample-status">形式樣本</span>'}
                </div>
              </article>`;
          }).join('')}
        </div>
        <div class="principles-legend" aria-label="卡片狀態說明"><span><i class="visited-dot"></i>已練習過</span><span><i></i>尚未練習</span></div>
      </section>`;

    document.querySelector('#home-back').addEventListener('click', () => navigate('#home'));

    document.querySelectorAll('[data-principle-id]').forEach((element) => {
      element.addEventListener('click', () => {
        const principleId = element.dataset.principleId;
        const principleStages = getStagesForPrinciple(principleId);
        if (!principleStages.length) return;
        markFreeReviewVisited(state, principleId);
        resetPrincipleStages(state, stages, principleId);
        navigate(stageHash(principleStages[0]));
      });
    });
  }

  function bindTaskBack() {
    document.querySelector('#task-back').addEventListener('click', () => {
      navigate('#principles');
    });
  }

  function renderRecognizeStage(stage) {
    if (stage.interactionType === 'rhythm-follow') {
      renderRhythmFollowStage(stage);
      return;
    }
    if (stage.interactionType === 'contrast-diagnose-options' || stage.interactionType === 'proportion-diagnose-options') {
      renderRelationshipDiagnoseStage(stage);
      return;
    }
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const canvas = `
      <div class="choice-grid" aria-label="三張圓點構圖">
        ${stage.options.map((option, index) => {
          const isSelected = stageState.selectedOptionId === option.id;
          const shouldReobserve = stageState.attempts >= 2
            && option.id !== stage.validation.correctOptionId;
          const shouldAnimate = stageState.isComplete
            && option.id === stage.validation.correctOptionId;

          return `
            <button
              class="choice-art ${isSelected ? 'selected' : ''} ${shouldReobserve ? 'reobserve' : ''}"
              data-option-id="${option.id}"
              aria-pressed="${isSelected}"
            >
              <span class="choice-label">作品 ${String.fromCharCode(65 + index)}</span>
              <span class="choice-dots ${shouldAnimate ? 'sequence-glow' : ''}">
                ${stage.interactionType === 'symbol-options'
                  ? `<span class="symbol-sequence ${shouldAnimate ? 'repeat-success' : ''}">${option.symbols.map(symbolMark).join('')}</span>`
                  : stage.interactionType === 'symmetry-options'
                    ? symmetryComposition(option, shouldAnimate)
                    : stage.interactionType === 'balance-options'
                      ? `<span class="${shouldAnimate ? 'balance-success balance-success-recognize' : ''}">${balanceComposition(option)}</span>`
                      : stage.interactionType === 'rhythm-options'
                        ? rhythmComposition(option.ys, shouldAnimate)
                      : stage.interactionType === 'unity-options'
                        ? unityComposition(option, shouldAnimate)
                      : stage.interactionType === 'harmony-options'
                        ? harmonyComposition(option, shouldAnimate)
                      : stage.interactionType === 'contrast-options'
                        ? contrastComposition(option, shouldAnimate)
                      : stage.interactionType === 'proportion-options'
                        ? proportionComposition(option, shouldAnimate)
                      : stage.interactionType === 'simplicity-options'
                        ? simplicityComposition(option, shouldAnimate)
                    : option.sizes.map((size, dotIndex) => dot(size, dotIndex)).join('')}
              </span>
            </button>`;
        }).join('')}
      </div>`;
    const controls = [
      button('提示', 'secondary-button', 'hint'),
      button('完成檢測', 'primary-button compact', 'check'),
      stageState.isComplete
        ? successActionButton('下一個任務', stage)
        : ''
    ].join('');

    app.innerHTML = taskFrame({
      principle,
      stage,
      canvas,
      controls,
      feedback: stageState.isComplete
        ? `<strong>${stage.successFeedback}</strong>`
        : stageState.feedback
    });
    bindTaskBack();
    enableSuccessAction();

    document.querySelectorAll('[data-option-id]').forEach((element) => {
      element.addEventListener('click', () => {
        updateStageState(state, stage.id, {
          selectedOptionId: element.dataset.optionId,
          feedback: ''
        });
        renderRecognizeStage(stage);
      });
    });

    document.querySelector('#hint').addEventListener('click', () => {
      updateStageState(state, stage.id, { feedback: stage.hints[0] });
      renderRecognizeStage(stage);
    });

    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, {
        selectedOptionId: stageState.selectedOptionId
      });

      if (result.isValid) {
        markStageComplete(state, stage);
        updateStageState(state, stage.id, { feedback: stage.successFeedback });
      } else if (result.code === 'incomplete') {
        updateStageState(state, stage.id, {
          feedback: stage.feedbackByCode[result.code]
        });
      } else {
        const attempts = stageState.attempts + 1;
        updateStageState(state, stage.id, {
          attempts,
          feedback: stage.hints[Math.min(attempts - 1, stage.hints.length - 1)]
        });
      }
      renderRecognizeStage(stage);
    });

    document.querySelector('#next')?.addEventListener('click', () => {
      navigate(nextHashForStage(stage, stages));
    });
  }

  function renderRelationshipDiagnoseStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const isContrast = stage.interactionType === 'contrast-diagnose-options';
    const composition = isContrast
      ? contrastComposition({ sizes: stage.composition.sizes, colors: stage.composition.colors }, stageState.isComplete)
      : proportionComposition({ sizes: stage.composition.sizes, colors: stage.composition.colors }, stageState.isComplete);
    const canvas = `<div class="relationship-diagnose ${isContrast ? 'contrast-diagnose' : 'proportion-diagnose'}">${composition}</div>
      <div class="diagnose-answer-list">${stage.options.map((option) => `<button type="button" data-option-id="${option.id}" class="${stageState.selectedOptionId === option.id ? 'selected' : ''}" aria-pressed="${stageState.selectedOptionId === option.id}">${option.label}</button>`).join('')}</div>`;
    const controls = [button('提示', 'secondary-button', 'hint'), button('完成檢測', 'primary-button compact', 'check'), stageState.isComplete ? successActionButton('下一個任務', stage) : ''].join('');
    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();
    document.querySelectorAll('[data-option-id]').forEach((element) => element.addEventListener('click', () => {
      if (stageState.isComplete) return;
      updateStageState(state, stage.id, { selectedOptionId: element.dataset.optionId, feedback: '' });
      renderRelationshipDiagnoseStage(stage);
    }));
    document.querySelector('#hint').addEventListener('click', () => {
      updateStageState(state, stage.id, { feedback: stage.hints[0] });
      renderRelationshipDiagnoseStage(stage);
    });
    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, { selectedOptionId: stageState.selectedOptionId });
      if (result.isValid) {
        markStageComplete(state, stage);
        updateStageState(state, stage.id, { feedback: stage.successFeedback });
      } else {
        updateStageState(state, stage.id, { feedback: result.code === 'incomplete' ? stage.feedbackByCode.incomplete : stage.hints[0] });
      }
      renderRelationshipDiagnoseStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => navigate(nextHashForStage(stage, stages)));
  }

  function renderRhythmFollowStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const canvas = `<div class="single-artboard rhythm-follow-board rhythm-bauhaus ${!stageState.demoComplete ? 'rhythm-follow-demo' : ''} ${stageState.isComplete ? 'rhythm-success' : ''}" aria-label="由左到右的六顆律動圓點">
      ${stage.positions.map((y, index) => `<button type="button" class="rhythm-element ${index < stageState.nextIndex ? 'followed' : ''} ${stageState.pulseIndex === index ? 'rhythm-tap' : ''}" data-rhythm-follow-index="${index}" style="--x:${12 + index * 15}%;--y:${y}%;--delay:${index * .1}s" ${stageState.demoComplete && !stageState.isComplete ? '' : 'disabled'} aria-label="第 ${index + 1} 顆圓點"></button>`).join('')}
    </div>`;
    const controls = [button('提示', 'secondary-button', 'hint'), stageState.isComplete ? successActionButton('下一個任務', stage) : ''].join('');

    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();

    if (!stageState.demoComplete) {
      window.setTimeout(() => {
        updateStageState(state, stage.id, { demoComplete: true });
        renderRhythmFollowStage(stage);
      }, 1050);
      return;
    }

    document.querySelectorAll('[data-rhythm-follow-index]').forEach((element) => {
      element.addEventListener('click', () => {
        if (stageState.isComplete) return;
        const index = Number(element.dataset.rhythmFollowIndex);
        if (index !== stageState.nextIndex) {
          updateStageState(state, stage.id, { feedback: stage.hints[0], pulseIndex: null });
          renderRhythmFollowStage(stage);
          return;
        }
        const nextIndex = stageState.nextIndex + 1;
        if (nextIndex === stage.positions.length) {
          markStageComplete(state, stage);
          updateStageState(state, stage.id, { nextIndex, pulseIndex: null, feedback: stage.successFeedback });
        } else {
          updateStageState(state, stage.id, { nextIndex, pulseIndex: index, feedback: '' });
        }
        renderRhythmFollowStage(stage);
      });
    });
    document.querySelector('#hint')?.addEventListener('click', () => {
      updateStageState(state, stage.id, { feedback: stage.hints[0] });
      renderRhythmFollowStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => navigate(nextHashForStage(stage, stages)));
  }

  function renderDiscoverStage(stage) {
    if (stage.interactionType === 'simplicity-multi-diagnose') {
      renderSimplicityDiscoverStage(stage);
      return;
    }
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const correctIndex = stage.elements.findIndex(
      (element) => element.id === stage.validation.correctElementId
    );
    const isSymbolDiagnose = stage.interactionType === 'symbol-diagnose';
    const isSymmetryDiagnose = stage.interactionType === 'symmetry-diagnose';
    const isBalanceDiagnose = stage.interactionType === 'balance-diagnose';
    const isUnityDiagnose = stage.interactionType === 'unity-direction-diagnose';
    const isHarmonyDiagnose = stage.interactionType === 'harmony-color-diagnose';
    const canvas = isUnityDiagnose ? `<div class="single-artboard principle-diagnose unity-diagnose ${stageState.isComplete ? 'unity-diagnose-success' : ''}">
      ${stage.elements.map((element, index) => `<button class="direction-arrow ${element.id === stage.validation.correctElementId ? 'outlier' : ''} ${stageState.selectedElementId === element.id ? 'selected' : ''}" data-element-id="${element.id}" style="--x:${element.x}%;--y:${element.y}%;--rotation:${element.rotation}deg;--family-color:${visualColor(element.color)};--delay:${index * .08}s" aria-label="第 ${index + 1} 個箭頭">➜</button>`).join('')}
    </div>` : isHarmonyDiagnose ? `<div class="single-artboard principle-diagnose harmony-diagnose ${stageState.isComplete ? 'harmony-diagnose-success' : ''}">
      ${stage.elements.map((element, index) => `<button class="harmony-dot ${element.id === stage.validation.correctElementId ? 'outlier' : ''} ${stageState.selectedElementId === element.id ? 'selected' : ''}" data-element-id="${element.id}" style="--x:${element.x}%;--family-color:${visualColor(element.color)};--delay:${index * .08}s" aria-label="第 ${index + 1} 個色彩元素"></button>`).join('')}
    </div>` : isBalanceDiagnose ? `<div class="single-artboard position-board ${stageState.isComplete ? 'balance-success balance-success-discover' : ''}"><div class="balance-center"></div>
      ${stage.elements.map((element, index) => `<button class="position-element ${stageState.selectedElementId === element.id ? 'selected' : ''}" data-element-id="${element.id}" style="--x:${element.x}%;--y:${element.y}%;--size:${element.size}px;--balance-color:var(--${element.color})" aria-label="第 ${index + 1} 個均衡元素"></button>`).join('')}
    </div>` : isSymmetryDiagnose ? `
      <div class="single-artboard symmetry-board ${stageState.isComplete ? 'mirror-success' : ''}">
        <div class="symmetry-axis" aria-hidden="true"></div>
        ${stage.elements.map((element, index) => {
          const rightY = stageState.isComplete && element.id === stage.validation.correctElementId
            ? element.correctY : element.y;
          const isSelected = stageState.selectedElementId === element.id;
          return `<span class="mirror-fixed mirror-left" style="--x:30%;--y:${element.correctY}%">${symbolMark(element.symbol, index)}</span>
            <button class="mirror-fixed mirror-right ${isSelected ? 'selected' : ''}" data-element-id="${element.id}" style="--x:70%;--y:${rightY}%" aria-label="右側第 ${index + 1} 個圖形">${symbolMark(element.symbol, index)}</button>`;
        }).join('')}
      </div>` : `
      <div class="single-artboard">
        <div class="diagnose-row ${stageState.isComplete ? 'restored' : ''}">
          ${stage.elements.map((element, index) => {
            const size = stageState.isComplete && element.id === stage.validation.correctElementId
              ? stage.validation.fixedSize
              : element.size;
            const symbol = stageState.isComplete && element.id === stage.validation.correctElementId
              ? stage.validation.fixedSymbol : element.symbol;
            const isSelected = stageState.selectedElementId === element.id;
            const showNeighborHint = stageState.attempts >= 2
              && Math.abs(index - correctIndex) <= 1;
            return `
              <button
                class="diagnose-dot ${isSelected ? 'selected' : ''} ${showNeighborHint ? 'neighbor-hint' : ''}"
                data-element-id="${element.id}"
                aria-label="第 ${index + 1} 個${isSymbolDiagnose ? '圖形' : `圓點，直徑 ${size}`}"
              >
                ${isSymbolDiagnose ? symbolMark(symbol, index) : `<span style="--size:${size}px;--dot-color:${dotColors[index]}"></span>`}
              </button>`;
          }).join('')}
        </div>
        ${isSymbolDiagnose ? '' : '<div class="baseline" aria-hidden="true"></div>'}
      </div>`;
    const controls = [
      button('提示', 'secondary-button', 'hint'),
      button('完成檢測', 'primary-button compact', 'check'),
      stageState.isComplete
        ? successActionButton('下一個任務', stage)
        : ''
    ].join('');

    app.innerHTML = taskFrame({
      principle,
      stage,
      canvas,
      controls,
      feedback: stageState.isComplete
        ? `<strong>${stage.successFeedback}</strong>`
        : stageState.feedback
    });
    bindTaskBack();
    enableSuccessAction();

    document.querySelectorAll('[data-element-id]').forEach((element) => {
      element.addEventListener('click', () => {
        if (stageState.isComplete) return;
        updateStageState(state, stage.id, {
          selectedElementId: element.dataset.elementId,
          feedback: ''
        });
        renderDiscoverStage(stage);
      });
    });

    document.querySelector('#hint').addEventListener('click', () => {
      updateStageState(state, stage.id, { feedback: stage.hints[0] });
      renderDiscoverStage(stage);
    });

    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, { selectedElementId: stageState.selectedElementId });

      if (result.isValid) {
        markStageComplete(state, stage);
        updateStageState(state, stage.id, { feedback: stage.successFeedback });
      } else if (result.code === 'incomplete') {
        updateStageState(state, stage.id, {
          feedback: stage.feedbackByCode[result.code]
        });
      } else {
        const attempts = stageState.attempts + 1;
        updateStageState(state, stage.id, {
          attempts,
          feedback: stage.hints[Math.min(attempts - 1, stage.hints.length - 1)]
        });
      }
      renderDiscoverStage(stage);
    });

    document.querySelector('#next')?.addEventListener('click', () => {
      navigate(nextHashForStage(stage, stages));
    });
  }

  function renderSimplicityDiscoverStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const canvas = `<div class="single-artboard simplicity-board ${stageState.isComplete ? 'simplicity-discover-success' : ''}">${stage.elements.map((element, index) => `<button type="button" class="simplicity-select ${stageState.selectedIds.includes(element.id) ? 'selected' : ''} ${element.core ? 'core' : 'extra'}" data-simplicity-id="${element.id}" style="--x:${element.x}%;--y:${element.y}%;--shape-size:${element.size}px;--shape-color:${visualColor(element.color)};--delay:${index * .08}s" aria-pressed="${stageState.selectedIds.includes(element.id)}" aria-label="構圖元素 ${index + 1}"></button>`).join('')}</div>`;
    const controls = [button('提示', 'secondary-button', 'hint'), button('完成檢測', 'primary-button compact', 'check'), stageState.isComplete ? successActionButton('下一個任務', stage) : ''].join('');
    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();
    document.querySelectorAll('[data-simplicity-id]').forEach((element) => element.addEventListener('click', () => {
      if (stageState.isComplete) return;
      const id = element.dataset.simplicityId;
      const item = stage.elements.find((candidate) => candidate.id === id);
      if (item.core) {
        updateStageState(state, stage.id, { feedback: stage.feedbackByCode['core-selected'] });
      } else {
        const selectedIds = stageState.selectedIds.includes(id) ? stageState.selectedIds.filter((value) => value !== id) : [...stageState.selectedIds, id];
        updateStageState(state, stage.id, { selectedIds, feedback: '' });
      }
      renderSimplicityDiscoverStage(stage);
    }));
    document.querySelector('#hint').addEventListener('click', () => {
      updateStageState(state, stage.id, { feedback: stage.hints[0] });
      renderSimplicityDiscoverStage(stage);
    });
    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, { selectedIds: stageState.selectedIds });
      if (result.isValid) {
        markStageComplete(state, stage);
        updateStageState(state, stage.id, { feedback: stage.successFeedback });
      } else updateStageState(state, stage.id, { feedback: stage.feedbackByCode[result.code] });
      renderSimplicityDiscoverStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => navigate(nextHashForStage(stage, stages)));
  }

  function renderExperimentStage(stage) {
    if (stage.interactionType === 'unity-rotate') {
      renderUnityRotateStage(stage);
      return;
    }
    if (stage.interactionType === 'harmony-palette') {
      renderHarmonyPaletteStage(stage);
      return;
    }
    if (stage.interactionType === 'balance-drag' || stage.interactionType === 'rhythm-drag') {
      renderPositionExperimentStage(stage);
      return;
    }
    if (stage.interactionType === 'mirror-drag') {
      renderMirrorExperimentStage(stage);
      return;
    }
    if (stage.interactionType === 'contrast-size') {
      renderContrastSizeStage(stage);
      return;
    }
    if (stage.interactionType === 'proportion-size') {
      renderProportionSizeStage(stage);
      return;
    }
    if (stage.interactionType === 'simplicity-delete') {
      renderSimplicityDeleteStage(stage);
      return;
    }
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const canvas = `
      <div class="single-artboard repair-board">
        <div class="slots ${stageState.isComplete ? (stage.principleId === 'repetition' ? 'repeat-success' : 'gradation-success') : ''}" role="list" aria-label="可拖曳排序的六個圓點">
          ${stageState.order.map((value, index) => `
            <button
              class="drag-dot"
              draggable="true"
              data-position="${index}"
              role="listitem"
              aria-label="${stage.interactionType === 'symbol-reorder' ? value + '圖形' : `直徑 ${value} 的圓點`}，目前第 ${index + 1} 位。使用左右方向鍵移動。"
            >
              ${stage.interactionType === 'symbol-reorder'
                ? symbolMark(value, stage.initialState.order.indexOf(value))
                : `<span style="--size:${value}px;--dot-color:${dotColors[stage.initialState.order.indexOf(value)]}"></span>`}
              <i>${index + 1}</i>
            </button>`).join('')}
        </div>
        <div class="slot-line" aria-hidden="true"></div>
      </div>`;
    const controls = [
      button('復原', 'secondary-button', 'undo'),
      button('提示', 'secondary-button', 'hint'),
      button('完成檢測', 'primary-button compact', 'check'),
      stageState.isComplete
        ? successActionButton('完成實驗', stage)
        : ''
    ].join('');

    app.innerHTML = taskFrame({
      principle,
      stage,
      canvas,
      controls,
      feedback: stageState.isComplete
        ? `<strong>${stage.successFeedback}</strong>`
        : stageState.feedback
    });
    bindTaskBack();
    enableSuccessAction();
    bindReorder(stage, renderExperimentStage);

    document.querySelector('#undo').addEventListener('click', () => {
      const previousOrder = stageState.history.pop();
      updateStageState(state, stage.id, {
        order: previousOrder ?? stage.initialState.order.slice(),
        feedback: ''
      });
      clearStageCompletion(state, stage.id);
      renderExperimentStage(stage);
    });

    document.querySelector('#hint').addEventListener('click', () => {
      updateStageState(state, stage.id, { feedback: stage.hints[0] });
      renderExperimentStage(stage);
    });

    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, { order: stageState.order });
      if (result.isValid) {
        markStageComplete(state, stage);
        updateStageState(state, stage.id, { feedback: stage.successFeedback });
      } else {
        updateStageState(state, stage.id, {
          feedback: stage.feedbackByCode[result.code]
        });
      }
      renderExperimentStage(stage);
    });

    document.querySelector('#next')?.addEventListener('click', () => {
      completeFreeReviewPrinciple(stage.principleId);
      navigate(nextHashForStage(stage, stages));
    });
  }

  function renderUnityRotateStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const canvas = `<div class="single-artboard unity-rotate-board ${stageState.isComplete ? 'unity-rotate-success' : ''}">
      ${stage.elements.map((element, index) => `<span class="direction-arrow ${index === stage.targetIndex ? 'target' : ''}" style="--x:${element.x}%;--y:${element.y}%;--rotation:${index === stage.targetIndex ? stageState.rotation : element.rotation}deg;--family-color:${visualColor(element.color)};--delay:${index * .08}s">➜</span>`).join('')}
    </div>`;
    const controls = [button('向左轉', 'secondary-button', 'rotate-left'), button('向右轉', 'secondary-button', 'rotate-right'), button('復原','secondary-button','undo'), button('提示','secondary-button','hint'), button('完成檢測','primary-button compact','check'), stageState.isComplete ? successActionButton('完成實驗',stage) : ''].join('');
    app.innerHTML = taskFrame({principle,stage,canvas,controls,feedback:stageState.isComplete?`<strong>${stage.successFeedback}</strong>`:stageState.feedback});
    bindTaskBack(); enableSuccessAction();
    const rotate = (amount) => { if(stageState.isComplete)return; updateStageState(state,stage.id,{rotation:(stageState.rotation+amount+360)%360,feedback:''}); renderUnityRotateStage(stage); };
    document.querySelector('#rotate-left').addEventListener('click',()=>rotate(-15));
    document.querySelector('#rotate-right').addEventListener('click',()=>rotate(15));
    document.querySelector('#undo').addEventListener('click',()=>{clearStageCompletion(state,stage.id);updateStageState(state,stage.id,{rotation:stage.initialState.rotation,feedback:''});renderUnityRotateStage(stage);});
    document.querySelector('#hint').addEventListener('click',()=>{updateStageState(state,stage.id,{feedback:stage.hints[0]});renderUnityRotateStage(stage);});
    document.querySelector('#check').addEventListener('click',()=>{const result=validateStage(stage,{rotation:stageState.rotation});if(result.isValid){markStageComplete(state,stage);updateStageState(state,stage.id,{feedback:stage.successFeedback});}else updateStageState(state,stage.id,{feedback:stage.feedbackByCode[result.code]});renderUnityRotateStage(stage);});
    document.querySelector('#next')?.addEventListener('click',()=>{completeFreeReviewPrinciple(stage.principleId);navigate(nextHashForStage(stage,stages));});
  }

  function renderHarmonyPaletteStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const colors = stage.elements.map((element, index) => index === stage.targetIndex ? stageState.selectedHue : element.color);
    const dots = colors.map((color, index) => {
      const style = `--x:${14 + index * 15}%;--family-color:${visualColor(color)};--delay:${index * .08}s`;
      return index === stage.targetIndex
        ? `<button type="button" class="harmony-repair-dot harmony-repair-target" id="harmony-repair-target" style="${style}" ${stageState.isComplete ? 'disabled' : ''} aria-label="可換色的藍色圓點"></button>`
        : `<span class="harmony-repair-dot" style="${style}"></span>`;
    }).join('');
    const palette = stageState.paletteOpen && !stageState.isComplete ? `<div class="harmony-palette-panel">
      <strong>選一個更適合的顏色</strong>
      <div class="harmony-palette" aria-label="三個候選色">${stage.candidates.map((color) => `<button type="button" data-harmony-color="${color}" class="${stageState.selectedHue === color ? 'selected' : ''}" style="--family-color:${visualColor(color)}" aria-label="候選色塊"></button>`).join('')}</div>
    </div>` : '';
    const canvas = `<div class="harmony-repair-interaction">
      <div class="single-artboard harmony-repair-board ${stageState.isComplete ? 'harmony-repair-success' : ''}">${dots}</div>
      <p class="harmony-operation-hint">點一下藍色圓點，幫它換個顏色。</p>
      ${palette}
    </div>`;
    const controls = [button('提示', 'secondary-button', 'hint'), stageState.isComplete ? successActionButton('完成實驗', stage) : ''].join('');
    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();

    document.querySelector('#harmony-repair-target')?.addEventListener('click', () => {
      updateStageState(state, stage.id, { paletteOpen: true, feedback: '' });
      renderHarmonyPaletteStage(stage);
    });
    document.querySelectorAll('[data-harmony-color]').forEach((element) => element.addEventListener('click', () => {
      const selectedHue = element.dataset.harmonyColor;
      const result = validateStage(stage, { selectedHue });
      if (result.isValid) {
        markStageComplete(state, stage);
        updateStageState(state, stage.id, { selectedHue, paletteOpen: false, feedback: stage.successFeedback });
      } else {
        updateStageState(state, stage.id, { selectedHue, paletteOpen: true, feedback: stage.feedbackByCode[result.code] });
      }
      renderHarmonyPaletteStage(stage);
    }));
    document.querySelector('#hint').addEventListener('click', () => {
      updateStageState(state, stage.id, { paletteOpen: true, feedback: stage.hints[0] });
      renderHarmonyPaletteStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => {
      completeFreeReviewPrinciple(stage.principleId);
      navigate(nextHashForStage(stage, stages));
    });
  }

  function renderContrastSizeStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const canvas = `<div class="size-stage-layout"><div class="single-artboard contrast-work ${stageState.isComplete ? 'contrast-experiment-success' : ''}">${stageState.sizes.map((size, index) => `<i class="${size === Math.max(...stageState.sizes) ? 'larger' : 'smaller'}" data-contrast-shape="${index}" style="width:${size}px;height:${size}px;--shape-color:${visualColor(stage.colors[index])};--delay:${index * .08}s"></i>`).join('')}</div>
      <div class="size-controls" aria-label="調整兩個元素大小">${stageState.sizes.map((size, index) => `<label>${index === 0 ? '紅色圓形' : '藍色方形'}<input type="range" min="22" max="76" value="${size}" data-contrast-size="${index}" ${stageState.isComplete ? 'disabled' : ''}></label>`).join('')}</div></div>`;
    const controls = [button('復原', 'secondary-button', 'undo'), button('提示', 'secondary-button', 'hint'), button('完成檢測', 'primary-button compact', 'check'), stageState.isComplete ? successActionButton('完成實驗', stage) : ''].join('');
    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();
    document.querySelectorAll('[data-contrast-size]').forEach((input) => {
      const index = Number(input.dataset.contrastSize);
      const shape = document.querySelector(`[data-contrast-shape="${index}"]`);
      bindSquareSizePreview(input, shape, (size) => {
        const sizes = stageState.sizes.slice();
        sizes[index] = size;
        updateStageState(state, stage.id, { sizes, feedback: '' });
        clearStageCompletion(state, stage.id);
        document.querySelector('.feedback').textContent = '';
      });
    });
    document.querySelector('#undo').addEventListener('click', () => {
      updateStageState(state, stage.id, { sizes: stage.initialState.sizes.slice(), feedback: '' });
      clearStageCompletion(state, stage.id);
      renderContrastSizeStage(stage);
    });
    document.querySelector('#hint').addEventListener('click', () => { updateStageState(state, stage.id, { feedback: stage.hints[0] }); renderContrastSizeStage(stage); });
    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, { sizes: stageState.sizes });
      if (result.isValid) { markStageComplete(state, stage); updateStageState(state, stage.id, { feedback: stage.successFeedback }); }
      else updateStageState(state, stage.id, { feedback: stage.feedbackByCode[result.code] });
      renderContrastSizeStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => { completeFreeReviewPrinciple(stage.principleId); navigate(nextHashForStage(stage, stages)); });
  }

  function renderProportionSizeStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const sizes = [stageState.mainSize, stage.supportSize, stage.supportSize - 3, stage.supportSize + 1, stage.supportSize - 2];
    const canvas = `<div class="size-stage-layout"><div class="single-artboard proportion-work ${stageState.isComplete ? 'proportion-experiment-success' : ''}">${proportionComposition({ sizes, colors: stage.colors })}</div>
      <div class="size-controls single"><label>主角大小<input type="range" min="28" max="72" value="${stageState.mainSize}" id="proportion-size" ${stageState.isComplete ? 'disabled' : ''}></label></div></div>`;
    const controls = [button('復原', 'secondary-button', 'undo'), button('提示', 'secondary-button', 'hint'), button('完成檢測', 'primary-button compact', 'check'), stageState.isComplete ? successActionButton('完成實驗', stage) : ''].join('');
    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();
    bindSquareSizePreview(document.querySelector('#proportion-size'), document.querySelector('.proportion-work .main'), (mainSize) => {
      updateStageState(state, stage.id, { mainSize, feedback: '' });
      clearStageCompletion(state, stage.id);
      document.querySelector('.feedback').textContent = '';
    });
    document.querySelector('#undo').addEventListener('click', () => { updateStageState(state, stage.id, { mainSize: stage.initialState.mainSize, feedback: '' }); clearStageCompletion(state, stage.id); renderProportionSizeStage(stage); });
    document.querySelector('#hint').addEventListener('click', () => { updateStageState(state, stage.id, { feedback: stage.hints[0] }); renderProportionSizeStage(stage); });
    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, { mainSize: stageState.mainSize, supportSize: stage.supportSize });
      if (result.isValid) { markStageComplete(state, stage); updateStageState(state, stage.id, { feedback: stage.successFeedback }); }
      else updateStageState(state, stage.id, { feedback: stage.feedbackByCode[result.code] });
      renderProportionSizeStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => { completeFreeReviewPrinciple(stage.principleId); navigate(nextHashForStage(stage, stages)); });
  }

  function renderSimplicityDeleteStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const remaining = stage.elements.filter((element) => stageState.remainingIds.includes(element.id));
    const ghosts = stageState.isComplete ? stage.elements.filter((element) => stageState.deletedIds.includes(element.id)).map((element) => editableShape(element, 'deleted-ghost')).join('') : '';
    const canvas = `<div class="single-artboard simplicity-board simplicity-delete-board poster-composition ${stageState.isComplete ? 'simplicity-delete-success' : ''}"><span class="poster-frame" aria-hidden="true"></span>${remaining.map((element, index) => `<button type="button" class="simplicity-delete ${element.shape} ${element.core ? 'core' : 'support'}" data-delete-id="${element.id}" style="--x:${element.x}%;--y:${element.y}%;--shape-size:${element.size}px;--shape-color:${visualColor(element.color)};--delay:${index * .07}s" ${stageState.isComplete ? 'disabled' : ''} aria-label="移除作品元素 ${index + 1}"></button>`).join('')}${ghosts}</div>`;
    const controls = [button('復原上一步', 'secondary-button', 'undo'), button('提示', 'secondary-button', 'hint'), button('完成檢測', 'primary-button compact', 'check'), stageState.isComplete ? successActionButton('完成實驗', stage) : ''].join('');
    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();
    document.querySelectorAll('[data-delete-id]').forEach((element) => element.addEventListener('click', () => {
      if (stageState.isComplete) return;
      const id = element.dataset.deleteId;
      const remainingIds = stageState.remainingIds.filter((value) => value !== id);
      updateStageState(state, stage.id, { remainingIds, deletedIds: [...stageState.deletedIds, id], feedback: '' });
      renderSimplicityDeleteStage(stage);
    }));
    document.querySelector('#undo').addEventListener('click', () => {
      const restored = stageState.deletedIds.at(-1);
      if (!restored) return;
      updateStageState(state, stage.id, { remainingIds: [...stageState.remainingIds, restored], deletedIds: stageState.deletedIds.slice(0, -1), feedback: '' });
      clearStageCompletion(state, stage.id);
      renderSimplicityDeleteStage(stage);
    });
    document.querySelector('#hint').addEventListener('click', () => { updateStageState(state, stage.id, { feedback: stage.hints[0] }); renderSimplicityDeleteStage(stage); });
    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, { remainingIds: stageState.remainingIds });
      if (result.isValid) { markStageComplete(state, stage); updateStageState(state, stage.id, { feedback: stage.successFeedback }); }
      else updateStageState(state, stage.id, { feedback: stage.feedbackByCode[result.code] });
      renderSimplicityDeleteStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => { completeFreeReviewPrinciple(stage.principleId); navigate(nextHashForStage(stage, stages)); });
  }

  function renderPositionExperimentStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const isBalance = stage.interactionType === 'balance-drag';
    const canvas = isBalance ? `<div class="single-artboard position-board balance-board ${stageState.isComplete ? 'balance-success balance-success-repair' : ''}" id="position-board"><div class="balance-center"></div>
      ${stage.elements.map((element) => `<span class="position-element fixed ${element.shape}" style="--x:${element.x}%;--y:${element.y}%;--size:${element.size}px;--balance-color:var(--${element.color})"></span>`).join('')}
      <button class="position-element movable" data-position-index="0" style="--x:${stageState.position.x}%;--y:${stageState.position.y}%;--size:28px;--balance-color:var(--${stage.initialState.color})" aria-label="可拖曳的小方形，使用方向鍵微調"></button>
    </div>` : `<div class="single-artboard position-board rhythm-board ${stageState.isComplete ? 'rhythm-success' : ''}" id="position-board">
      ${stageState.positions.map((y, index) => `<button class="rhythm-element movable" data-position-index="${index}" style="--x:${12 + index * 15}%;--y:${y}%;--delay:${index * .07}s;--rhythm-color:${['var(--blue)', 'var(--red)', 'var(--yellow)'][index % 3]}" aria-label="第 ${index + 1} 個律動元素，使用上下方向鍵移動"></button>`).join('')}
    </div>`;
    const controls = [button('復原', 'secondary-button', 'undo'), button('提示', 'secondary-button', 'hint'), button('完成檢測', 'primary-button compact', 'check'), stageState.isComplete ? successActionButton('完成實驗', stage) : ''].join('');
    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();
    const board = document.querySelector('#position-board');

    function move(index, x, y) {
      clearStageCompletion(state, stage.id);
      if (isBalance) updateStageState(state, stage.id, { position: { x: Math.max(54, Math.min(92, x)), y: stage.initialState.position.y }, feedback: '' });
      else {
        const positions = stageState.positions.slice();
        positions[index] = Math.max(18, Math.min(82, y));
        updateStageState(state, stage.id, { positions, feedback: '' });
      }
      renderPositionExperimentStage(stage);
    }

    document.querySelectorAll('[data-position-index]').forEach((element) => {
      const index = Number(element.dataset.positionIndex);
      element.addEventListener('pointerdown', (event) => element.setPointerCapture(event.pointerId));
      element.addEventListener('pointerup', (event) => {
        const rect = board.getBoundingClientRect();
        move(index, ((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
      });
      element.addEventListener('keydown', (event) => {
        const delta = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[event.key];
        if (!delta) return;
        event.preventDefault();
        const current = isBalance ? stageState.position : { x: 12 + index * 15, y: stageState.positions[index] };
        move(index, current.x + delta[0], current.y + delta[1]);
      });
    });
    document.querySelector('#undo').addEventListener('click', () => {
      if (isBalance) updateStageState(state, stage.id, { position: { ...stage.initialState.position }, feedback: '' });
      else updateStageState(state, stage.id, { positions: stage.initialState.positions.slice(), feedback: '' });
      clearStageCompletion(state, stage.id);
      renderPositionExperimentStage(stage);
    });
    document.querySelector('#hint').addEventListener('click', () => { updateStageState(state, stage.id, { feedback: stage.hints[0] }); renderPositionExperimentStage(stage); });
    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, isBalance ? { position: stageState.position } : { positions: stageState.positions });
      if (result.isValid) { markStageComplete(state, stage); updateStageState(state, stage.id, { feedback: stage.successFeedback }); }
      else updateStageState(state, stage.id, { feedback: stage.feedbackByCode[result.code] });
      renderPositionExperimentStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => { completeFreeReviewPrinciple(stage.principleId); navigate(nextHashForStage(stage, stages)); });
  }

  function renderMirrorExperimentStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const target = stage.validation.target;
    const position = stageState.isComplete ? target : stageState.position;
    const canvas = `<div class="single-artboard symmetry-board ${stageState.isComplete ? 'mirror-success' : ''}" id="mirror-board">
      <div class="symmetry-axis" aria-hidden="true"></div>
      ${stage.elements.map((element, index) => `<span class="mirror-fixed mirror-left" style="--x:30%;--y:${element.y}%">${symbolMark(element.symbol, index)}</span>
        ${element.id === 'pair-middle' ? '' : `<span class="mirror-fixed mirror-right" style="--x:70%;--y:${element.y}%">${symbolMark(element.symbol, index)}</span>`}`).join('')}
      <button class="mirror-draggable" id="mirror-piece" style="--x:${position.x}%;--y:${position.y}%" aria-label="可拖曳的右側方形，使用方向鍵微調">${symbolMark('■', 1)}</button>
    </div>`;
    const controls = [
      button('復原', 'secondary-button', 'undo'),
      button('提示', 'secondary-button', 'hint'),
      button('完成檢測', 'primary-button compact', 'check'),
      stageState.isComplete ? successActionButton('完成實驗', stage) : ''
    ].join('');

    app.innerHTML = taskFrame({ principle, stage, canvas, controls, feedback: stageState.isComplete ? `<strong>${stage.successFeedback}</strong>` : stageState.feedback });
    bindTaskBack();
    enableSuccessAction();
    const board = document.querySelector('#mirror-board');
    const piece = document.querySelector('#mirror-piece');

    function setPosition(x, y) {
      const snapTolerance = stage.validation.snapTolerance;
      const next = Math.hypot(x - target.x, y - target.y) <= snapTolerance
        ? { ...target } : { x: Math.max(54, Math.min(92, x)), y: Math.max(12, Math.min(88, y)) };
      updateStageState(state, stage.id, { position: next, feedback: '' });
      clearStageCompletion(state, stage.id);
      renderMirrorExperimentStage(stage);
    }

    piece.addEventListener('pointerdown', (event) => {
      if (stageState.isComplete) return;
      piece.setPointerCapture(event.pointerId);
    });
    piece.addEventListener('pointerup', (event) => {
      if (stageState.isComplete) return;
      const rect = board.getBoundingClientRect();
      setPosition(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
    });
    piece.addEventListener('keydown', (event) => {
      const delta = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[event.key];
      if (!delta || stageState.isComplete) return;
      event.preventDefault();
      setPosition(stageState.position.x + delta[0], stageState.position.y + delta[1]);
    });
    document.querySelector('#undo').addEventListener('click', () => {
      updateStageState(state, stage.id, { position: { ...stage.initialState.position }, feedback: '' });
      clearStageCompletion(state, stage.id);
      renderMirrorExperimentStage(stage);
    });
    document.querySelector('#hint').addEventListener('click', () => {
      updateStageState(state, stage.id, { feedback: stage.hints[0] });
      renderMirrorExperimentStage(stage);
    });
    document.querySelector('#check').addEventListener('click', () => {
      const result = validateStage(stage, { position: stageState.position });
      if (result.isValid) {
        markStageComplete(state, stage);
        updateStageState(state, stage.id, { position: { ...target }, feedback: stage.successFeedback });
      } else {
        updateStageState(state, stage.id, { feedback: stage.feedbackByCode[result.code] });
      }
      renderMirrorExperimentStage(stage);
    });
    document.querySelector('#next')?.addEventListener('click', () => {
      completeFreeReviewPrinciple(stage.principleId);
      navigate(nextHashForStage(stage, stages));
    });
  }

  function moveItem(stage, from, to, rerender) {
    const stageState = getStageState(state, stage.id);
    if (from === to || to < 0 || to >= stageState.order.length) return;

    const nextOrder = stageState.order.slice();
    const [item] = nextOrder.splice(from, 1);
    nextOrder.splice(to, 0, item);
    stageState.history.push(stageState.order.slice());
    updateStageState(state, stage.id, {
      order: nextOrder,
      feedback: ''
    });
    clearStageCompletion(state, stage.id);
    rerender(stage);
    document.querySelector(`[data-position="${to}"]`)?.focus();
  }

  function bindReorder(stage, rerender) {
    let from = null;
    document.querySelectorAll('.drag-dot').forEach((element) => {
      element.addEventListener('dragstart', () => {
        from = Number(element.dataset.position);
        element.classList.add('dragging');
      });
      element.addEventListener('dragend', () => element.classList.remove('dragging'));
      element.addEventListener('dragover', (event) => event.preventDefault());
      element.addEventListener('drop', (event) => {
        event.preventDefault();
        moveItem(stage, from, Number(element.dataset.position), rerender);
      });
      element.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse') return;
        from = Number(element.dataset.position);
        element.setPointerCapture(event.pointerId);
      });
      element.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse') return;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.drag-dot');
        if (target) moveItem(stage, from, Number(target.dataset.position), rerender);
      });
      element.addEventListener('keydown', (event) => {
        const position = Number(element.dataset.position);
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveItem(stage, position, position - 1, rerender);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveItem(stage, position, position + 1, rerender);
        }
      });
    });
  }

  const stageRenderers = Object.freeze({
    recognize: renderRecognizeStage,
    discover: renderDiscoverStage,
    experiment: renderExperimentStage
  });

  function renderStage(stage) {
    const renderer = stageRenderers[stage.stageType];
    if (!renderer) {
      navigate('#home');
      return;
    }
    renderer(stage);
  }

  function renderComplete(principle) {
    const completedStage = getStagesForPrinciple(principle.id).at(-1);
    const finalOrder = completedStage && Array.isArray(getStageState(state, completedStage.id).order)
      ? getStageState(state, completedStage.id).order.slice().sort((a, b) => a - b)
      : [18, 28, 38, 48, 58, 70];
    const completionDescription = principle.completionDescription
      ?? '你已完成這項形式原理實驗。';

    app.innerHTML = `
      <section class="complete page-shell">
        <div class="complete-copy">
          <p class="section-label">觀察・比較・診斷・修正</p>
          <h1>${principle.name}實驗完成</h1>
          <p>${completionDescription}</p>
          ${button('回到實驗樣本牆', 'primary-button', 'back-wall')}
        </div>
        <div class="complete-art complete-art-${principle.id}" aria-label="${principle.name}完成圖">
          ${principle.id === 'repetition'
            ? ['●', '■', '●', '■', '●', '■'].map(symbolMark).join('')
            : principle.id === 'symmetry'
              ? symmetryComposition({ pairs: [[26, 28, 72], [42, 30, 70], [58, 32, 68]] }, true)
              : principle.id === 'balance'
                ? balanceComposition('asymmetric-balanced')
                : principle.id === 'rhythm'
                  ? rhythmComposition([65, 48, 32, 44, 61, 75], true)
              : finalOrder.map((size, index) => dot(size, index)).join('')}
          <i aria-hidden="true"></i>
        </div>
      </section>`;

    document.querySelector('#back-wall').addEventListener('click', () => {
      navigate('#principles');
    });
  }

  return {
    home: renderHome,
    principles: renderPrinciples,
    stage: renderStage,
    complete: renderComplete
  };
}
