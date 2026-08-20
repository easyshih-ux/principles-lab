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

export function createRenderers({ app, state, navigate }) {
  function renderHome() {
    app.innerHTML = `
      <section class="home" aria-labelledby="home-title">
        <div class="home-copy">
          <p class="home-kicker">視覺藝術・形式原理</p>
          <h1 class="home-title" id="home-title">
            <span>形式原理</span><span>視覺實驗室</span>
          </h1>
          <p class="home-subtitle">觀察・比較・調整<br>找出畫面中的秩序</p>
          ${button('進入實驗室', 'primary-button', 'enter-lab')}
        </div>
        <div class="hero-art" aria-label="以圓點呈現反覆、漸層、對比與均衡的抽象構圖">
          <i class="hero-axis" aria-hidden="true"></i>
          ${Array.from(
            { length: 14 },
            (_, index) => `<i class="hero-dot d${index + 1}" aria-hidden="true"></i>`
          ).join('')}
        </div>
      </section>`;

    document.querySelector('#enter-lab').addEventListener('click', () => {
      navigate('#principles');
    });
  }

  function renderPrinciples() {
    app.innerHTML = `
      <section class="wall page-shell">
        <header class="wall-header">
          <button class="back-link" id="home-back">← 回到入口</button>
          <div>
            <p class="section-label">實驗樣本牆</p>
            <h1>選擇形式原理</h1>
          </div>
          <p>先從「漸層」開始，觀察變化如何形成秩序。</p>
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
                    ? `<button class="sample-enter" data-principle-id="${principle.id}">開始實驗 →</button>`
                    : '<span class="sample-status">即將開放</span>'}
                </div>
              </article>`;
          }).join('')}
        </div>
      </section>`;

    document.querySelector('#home-back').addEventListener('click', () => navigate('#home'));
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
