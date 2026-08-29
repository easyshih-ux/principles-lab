import {
  getPrinciple,
  getStagesForPrinciple,
  principles,
  stages
} from './data.js';
import {
  clearStageCompletion,
  getStageState,
  markPrincipleComplete,
  markStageComplete,
  resetPrincipleStages,
  updateStageState
} from './state.js';
import { nextHashForStage, stageHash } from './router.js';
import { validateStage } from './validators.js';
import { attemptClassroomUnlock, CLASSROOM_COURSES } from './classroom-unlocks.js?v=classroom-control-1';

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

function button(label, className = 'primary-button', id = '') {
  return `<button type="button" class="${className}" ${id ? `id="${id}"` : ''}>${label}</button>`;
}

function dot(size, index, extraClass = '') {
  return `
    <span
      class="dot ${extraClass}"
      style="--size:${size}px;--dot-color:${dotColors[index % dotColors.length]}"
      aria-hidden="true"
    ></span>`;
}

function sampleDots(principle) {
  return `
    <div class="mini-dots ${principle.id}">
      ${principle.previewSizes.map((size, index) => dot(size, index)).join('')}
    </div>`;
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

export function createRenderers({ app, state, navigate, classroomStorage = null }) {
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
          <span><strong>FORM LAB</strong><small>形式原理視覺實驗室</small></span>
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
        <footer class="home-footer" aria-hidden="true"><span></span><b>FORM LAB</b><span></span></footer>
      </section>`;
    bindClassroomControls(renderHome);
    document.querySelector('#enter-free-review').addEventListener('click', () => navigate('#principles'));
  }
  function renderPrinciples() {
    app.innerHTML = `
      <section class="wall page-shell">
        <header class="wall-header">
          <button class="back-link" id="home-back">← 回到入口</button>
          <div>
            <p class="section-label">自由複習</p>
            <h1>10 個形式原理</h1>
            <p class="wall-review-note">自由探索形式樣本，不計分，也不影響正式三關進度。</p>
          </div>
          <div class="wall-course-entry">
            <p>三關由老師依課堂進度逐一開放。</p>
            <div class="wall-course-actions" aria-label="學習關卡">
              ${classroomCourseCardsMarkup(state.classroomUnlocks, state.completion.courses, state.classroomGate)}
            </div>
            <p class="classroom-gate-message" role="status" aria-live="polite">${state.classroomGate.message}</p>
          </div>
        </header>
        <div class="sample-wall">
          ${principles.map((principle, index) => {
            const isAvailable = principle.status === 'available' && principle.hasContent;
            return `
              <article class="sample sample-${index + 1} ${isAvailable ? 'available' : ''}">
                <div class="sample-visual">${sampleDots(principle)}</div>
                <div class="sample-copy">
                  <span class="sample-no">${String(index + 1).padStart(2, '0')}</span>
                  <h2>${principle.name}</h2>
                  <p>${principle.shortDescription}</p>
                  ${isAvailable
                    ? `<button class="sample-enter" data-principle-id="${principle.id}">漸層示範 →</button>`
                    : '<span class="sample-status">形式樣本</span>'}
                </div>
              </article>`;
          }).join('')}
        </div>
      </section>`;

    document.querySelector('#home-back').addEventListener('click', () => navigate('#home'));
    bindClassroomControls(renderPrinciples);

    document.querySelectorAll('[data-principle-id]').forEach((element) => {
      element.addEventListener('click', () => {
        const principleId = element.dataset.principleId;
        const principleStages = getStagesForPrinciple(principleId);
        if (!principleStages.length) return;
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
                ${option.sizes.map((size, dotIndex) => dot(size, dotIndex)).join('')}
              </span>
            </button>`;
        }).join('')}
      </div>`;
    const controls = [
      button('提示', 'secondary-button', 'hint'),
      button('完成檢測', 'primary-button compact', 'check'),
      stageState.isComplete
        ? button('下一個任務', 'primary-button compact', 'next')
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

  function renderDiscoverStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const correctIndex = stage.elements.findIndex(
      (element) => element.id === stage.validation.correctElementId
    );
    const canvas = `
      <div class="single-artboard">
        <div class="diagnose-row ${stageState.isComplete ? 'restored' : ''}">
          ${stage.elements.map((element, index) => {
            const size = stageState.isComplete && element.id === stage.validation.correctElementId
              ? stage.validation.fixedSize
              : element.size;
            const isSelected = stageState.selectedElementId === element.id;
            const showNeighborHint = stageState.attempts >= 2
              && Math.abs(index - correctIndex) <= 1;
            return `
              <button
                class="diagnose-dot ${isSelected ? 'selected' : ''} ${showNeighborHint ? 'neighbor-hint' : ''}"
                data-element-id="${element.id}"
                aria-label="第 ${index + 1} 顆圓點，直徑 ${size}"
              >
                <span style="--size:${size}px;--dot-color:${dotColors[index]}"></span>
              </button>`;
          }).join('')}
        </div>
        <div class="baseline" aria-hidden="true"></div>
      </div>`;
    const controls = [
      button('提示', 'secondary-button', 'hint'),
      button('完成檢測', 'primary-button compact', 'check'),
      stageState.isComplete
        ? button('下一個任務', 'primary-button compact', 'next')
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
      const result = validateStage(stage, {
        selectedElementId: stageState.selectedElementId
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
      renderDiscoverStage(stage);
    });

    document.querySelector('#next')?.addEventListener('click', () => {
      navigate(nextHashForStage(stage, stages));
    });
  }

  function renderExperimentStage(stage) {
    const principle = getPrinciple(stage.principleId);
    const stageState = getStageState(state, stage.id);
    const canvas = `
      <div class="single-artboard repair-board">
        <div class="slots" role="list" aria-label="可拖曳排序的六個圓點">
          ${stageState.order.map((size, index) => `
            <button
              class="drag-dot"
              draggable="true"
              data-position="${index}"
              role="listitem"
              aria-label="直徑 ${size} 的圓點，目前第 ${index + 1} 位。使用左右方向鍵移動。"
            >
              <span style="--size:${size}px;--dot-color:${dotColors[stage.initialState.order.indexOf(size)]}"></span>
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
        ? button('完成實驗', 'primary-button compact', 'next')
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
      markPrincipleComplete(state, stage.principleId);
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
    const finalOrder = completedStage
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
        <div class="complete-art" aria-label="六個圓點由小到大排列">
          ${finalOrder.map((size, index) => dot(size, index)).join('')}
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
