import { getShapeDimensions } from './geometry/bounds.js';
import { getDisplayColor } from './geometry/palette.js';
import {
  applyRecognizeValidation,
  areRecognizeQuestionsComplete,
  completeRecognizeCourse,
  firstIncompleteQuestion,
  getRecognizeSessionQuestion,
  getRecognizeSessionQuestions,
  resetRecognizeCourse,
  selectRecognizeAnswer
} from './recognize-course-state.js?v=final-qa-question-order';
import { recognizeQuestions } from './recognize-questions.js';
import { getRecognizeVariant } from './recognize-template-pool.js';
import { recognizeQuestionHash } from './router.js';
import { validateStage } from './validators.js';
import { syncCourseCompletion } from './state.js';
import {
  advanceRecognizeMasteryRound,
  applyRecognizeMasteryResult,
  beginRecognizeMasteryRound,
  getCurrentRecognizeMasteryItem,
  prepareRecognizeMasteryRound,
  selectRecognizeMasteryAnswer
} from './mastery-practice.js';

export function recognizeCompletionMarkup() {
  return `
      <section class="recognize-complete page-shell">
        <div>
          <p class="section-label">觀察完成</p>
          <h1>第一關完成</h1>
          <p class="recognize-complete-lead">你已經開始看得出畫面中的規律了。</p>
          <p>接下來，不只要看出來，還要找出——<br><strong>畫面到底是哪裡變了？</strong></p>
          <button type="button" class="primary-button" id="recognize-wall-return">返回實驗室</button>
        </div>
        <div class="recognize-complete-pattern" aria-hidden="true">${Array.from({ length: 8 }, (_, index) => `<i style="--index:${index}"></i>`).join('')}</div>
      </section>`;
}

function guideStyle(guide) {
  return [
    Number.isFinite(guide.x) ? `--guide-x:${guide.x / 10}%` : '',
    Number.isFinite(guide.y) ? `--guide-y:${guide.y / 6}%` : ''
  ].filter(Boolean).join(';');
}

export function recognizeCompositionMarkup(question, ariaLabel = '形式原理幾何構圖') {
  return `
    <div class="recognize-composition" role="img" aria-label="${ariaLabel}">
      ${(question.guides ?? []).map((guide) => `
        <i class="composition-guide ${guide.type}" style="${guideStyle(guide)}" aria-hidden="true"></i>`).join('')}
      ${question.elements.map((element) => {
        const dimensions = getShapeDimensions(element);
        return `
          <i
            class="composition-element shape-${element.shape}"
            style="--x:${element.x / 10}%;--y:${element.y / 6}%;--w:${dimensions.width / 10}%;--h:${dimensions.height / 6}%;--rotation:${element.rotation}deg;--geometry-color:${element.displayColor ?? getDisplayColor(element.hue, element.lightness)}"
            aria-hidden="true"
          ><span class="geometry-shape"></span></i>`;
      }).join('')}
    </div>`;
}

export function createRecognizeCourseRenderers({ app, state, navigate, onCheckpoint = () => {} }) {
  const courseState = state.recognizeCourse;
  const masteryState = state.masteryPractice.recognize;
  const devSelection = { questionId: recognizeQuestions[0].id, variantId: 'A' };

  function renderStart() {
    app.innerHTML = `
      <section class="recognize-intro page-shell">
        <div>
          <p class="section-label">觀察・辨認</p>
          <h1><span>第一關｜</span><span>你看得出來嗎？</span></h1>
          <p class="recognize-intro-lead">觀察畫面，找出最明顯的形式原理。</p>
          <p>有些畫面可能同時具有不只一種原理，請找出最主要的視覺特徵。</p>
          <button type="button" class="primary-button" id="begin-recognize">開始觀察</button>
        </div>
        <div class="recognize-intro-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      </section>`;
    document.querySelector('#begin-recognize').addEventListener('click', () => {
      resetRecognizeCourse(courseState, recognizeQuestions, undefined, {}, state.masteryPractice.recognize);
      const [firstQuestion] = getRecognizeSessionQuestions(courseState, recognizeQuestions);
      navigate(recognizeQuestionHash(firstQuestion.id));
    });
  }

  function renderQuestion(question) {
    if (!courseState.started) resetRecognizeCourse(courseState, recognizeQuestions, undefined, {}, state.masteryPractice.recognize);
    const orderedQuestions = getRecognizeSessionQuestions(courseState, recognizeQuestions);
    const firstIncomplete = firstIncompleteQuestion(courseState, recognizeQuestions);
    const requestedIndex = orderedQuestions.indexOf(question);
    const availableIndex = firstIncomplete ? orderedQuestions.indexOf(firstIncomplete) : orderedQuestions.length;
    if (requestedIndex > availableIndex) {
      navigate(recognizeQuestionHash(firstIncomplete.id));
      return;
    }

    const sessionQuestion = getRecognizeSessionQuestion(courseState, question);
    const questionState = courseState.questions[question.id];
    const progress = `${requestedIndex + 1} / ${orderedQuestions.length}`;
    app.innerHTML = `
      <section class="recognize-question-page page-shell">
        <header class="recognize-question-header">
          <button type="button" class="back-link" id="recognize-exit">← 返回形式原理選擇頁</button>
          <h1>第一關｜你看得出來嗎？</h1>
          <strong>${progress}</strong>
        </header>
        <div class="recognize-artboard">${recognizeCompositionMarkup(sessionQuestion, `第 ${requestedIndex + 1} 題幾何構圖`)}</div>
        <div class="recognize-question-copy">
          <h2>${question.prompt}</h2>
          <div class="recognize-options" role="group" aria-label="答案選項">
            ${sessionQuestion.options.map((option) => `
              <button
                type="button"
                class="recognize-option ${questionState.selectedAnswer === option.id ? 'selected' : ''}"
                data-answer-id="${option.id}"
                aria-pressed="${questionState.selectedAnswer === option.id}"
                ${questionState.isCorrect ? 'disabled' : ''}
              >${option.label}</button>`).join('')}
          </div>
        </div>
        <footer class="recognize-feedback-row">
          <div class="recognize-feedback ${questionState.isCorrect ? 'success' : ''}" role="status" aria-live="polite" aria-atomic="true">
            ${questionState.feedback
              ? `<strong>${questionState.isCorrect ? '✓ 看出來了！' : '再觀察一下'}</strong><span>${questionState.feedback}${questionState.isCorrect ? ` <em>${question.shortHint}</em>` : ''}</span>`
              : '<span>選擇你觀察到的主要原理。</span>'}
          </div>
          <div class="recognize-actions">
            ${questionState.isCorrect
              ? `<button type="button" class="primary-button compact" id="recognize-next">${requestedIndex === orderedQuestions.length - 1 ? '完成第一關' : '下一題'}</button>`
              : '<button type="button" class="primary-button compact" id="recognize-check">確認答案</button>'}
          </div>
        </footer>
      </section>`;

    document.querySelector('#recognize-exit').addEventListener('click', () => navigate('#principles'));
    document.querySelectorAll('[data-answer-id]').forEach((button) => {
      button.addEventListener('click', () => {
        selectRecognizeAnswer(courseState, question.id, button.dataset.answerId);
        renderQuestion(question);
      });
    });
    document.querySelector('#recognize-check')?.addEventListener('click', () => {
      const validation = validateStage({
        validatorId: 'selected-option-equals',
        validation: { correctOptionId: question.correctAnswer }
      }, { selectedOptionId: questionState.selectedAnswer });
      applyRecognizeValidation(courseState, question, validation, state.masteryPractice.recognize);
      renderQuestion(question);
    });
    document.querySelector('#recognize-next')?.addEventListener('click', () => {
      const nextQuestion = orderedQuestions[requestedIndex + 1];
      if (nextQuestion) {
        navigate(recognizeQuestionHash(nextQuestion.id));
        return;
      }
      if (areRecognizeQuestionsComplete(courseState, recognizeQuestions)) navigate('#level/recognize/complete');
    });
    if (questionState.isCorrect) document.querySelector('#recognize-next')?.focus();
  }

  function renderMasteryTransition(summary) {
    const targeted = summary.masteryBand === 'targeted';
    app.innerHTML = `
      <section class="recognize-intro page-shell mastery-transition">
        <div>
          <p class="section-label">觀察補強</p>
          <h1>${targeted ? '再確認一下' : '再練一小組'}</h1>
          <p class="recognize-intro-lead">${targeted
            ? '有幾個形式原理還不太確定，再試幾題，把它們看得更清楚。'
            : '再做幾題，確認你真的看懂這些形式原理。'}</p>
          <button type="button" class="primary-button" id="mastery-begin">開始補強</button>
        </div>
        <div class="recognize-intro-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      </section>`;
    document.querySelector('#mastery-begin').addEventListener('click', () => {
      beginRecognizeMasteryRound(masteryState);
      renderComplete();
    });
  }

  function getMasterySessionQuestion(item) {
    const question = recognizeQuestions.find(({ id }) => id === item.sourceQuestionId);
    const variant = getRecognizeVariant(question, item.variantId);
    const sessionQuestion = getRecognizeSessionQuestion(courseState, question);
    return { question, sessionQuestion: { ...sessionQuestion, ...variant, variantId: item.variantId } };
  }

  function renderMasteryQuestion() {
    const activeRound = masteryState.activeRound;
    const current = getCurrentRecognizeMasteryItem(masteryState);
    if (!activeRound || !current) {
      renderComplete();
      return;
    }
    const { question, sessionQuestion } = getMasterySessionQuestion(current.item);
    const response = current.response;
    app.innerHTML = `
      <section class="recognize-question-page page-shell mastery-question-page">
        <header class="recognize-question-header">
          <button type="button" class="back-link" id="mastery-exit">← 返回實驗室</button>
          <h1>第一關｜再確認一下</h1>
          <strong>${activeRound.currentIndex + 1} / ${activeRound.queue.length}</strong>
        </header>
        <div class="recognize-artboard">${recognizeCompositionMarkup(sessionQuestion, '形式原理補強構圖')}</div>
        <div class="recognize-question-copy">
          <h2>${question.prompt}</h2>
          <div class="recognize-options" role="group" aria-label="答案選項">
            ${sessionQuestion.options.map((option) => `
              <button type="button" class="recognize-option ${response.selectedAnswer === option.id ? 'selected' : ''}"
                data-mastery-answer-id="${option.id}" aria-pressed="${response.selectedAnswer === option.id}"
                ${response.completed ? 'disabled' : ''}>${option.label}</button>`).join('')}
          </div>
        </div>
        <footer class="recognize-feedback-row">
          <div class="recognize-feedback ${response.completed ? 'success' : ''}" role="status" aria-live="polite" aria-atomic="true">
            ${response.feedback
              ? `<strong>${response.completed ? '✓ 看出來了！' : '再觀察一下'}</strong><span>${response.feedback}${response.completed ? ` <em>${question.shortHint}</em>` : ''}</span>`
              : '<span>選擇你觀察到的主要原理。</span>'}
          </div>
          <div class="recognize-actions">
            ${response.completed
              ? '<button type="button" class="primary-button compact" id="mastery-next">下一題</button>'
              : '<button type="button" class="primary-button compact" id="mastery-check">確認答案</button>'}
          </div>
        </footer>
      </section>`;
    document.querySelector('#mastery-exit').addEventListener('click', () => navigate('#principles'));
    document.querySelectorAll('[data-mastery-answer-id]').forEach((button) => button.addEventListener('click', () => {
      selectRecognizeMasteryAnswer(masteryState, button.dataset.masteryAnswerId);
      renderMasteryQuestion();
    }));
    document.querySelector('#mastery-check')?.addEventListener('click', () => {
      const validation = validateStage({
        validatorId: 'selected-option-equals',
        validation: { correctOptionId: question.correctAnswer }
      }, { selectedOptionId: response.selectedAnswer });
      applyRecognizeMasteryResult(masteryState, question, validation.isValid);
      renderMasteryQuestion();
    });
    document.querySelector('#mastery-next')?.addEventListener('click', () => {
      advanceRecognizeMasteryRound(masteryState);
      renderComplete();
    });
    if (response.completed) document.querySelector('#mastery-next')?.focus();
  }

  function renderMasteryComplete() {
    completeRecognizeCourse(courseState, recognizeQuestions);
    syncCourseCompletion(state);
    onCheckpoint('level1Complete');
    app.innerHTML = `
      <section class="recognize-complete page-shell mastery-complete">
        <div>
          <p class="section-label">觀察補強完成</p>
          <h1>補強完成！</h1>
          <p class="recognize-complete-lead">這次看得更清楚了，可以繼續下一步。</p>
          <button type="button" class="primary-button" id="mastery-wall-return">回到實驗室</button>
        </div>
        <div class="recognize-complete-pattern" aria-hidden="true">${Array.from({ length: 8 }, (_, index) => `<i style="--index:${index}"></i>`).join('')}</div>
      </section>`;
    document.querySelector('#mastery-wall-return').addEventListener('click', () => navigate('#principles'));
  }

  function renderComplete() {
    if (!areRecognizeQuestionsComplete(courseState, recognizeQuestions)) {
      const incomplete = firstIncompleteQuestion(courseState, recognizeQuestions);
      navigate(incomplete ? recognizeQuestionHash(incomplete.id) : '#level/recognize/start');
      return;
    }
    const { summary, activeRound } = prepareRecognizeMasteryRound(masteryState, recognizeQuestions, { seed: 1 });
    if (summary.masteryBand === 'mastered') {
      completeRecognizeCourse(courseState, recognizeQuestions);
      syncCourseCompletion(state);
      onCheckpoint('level1Complete');
      app.innerHTML = recognizeCompletionMarkup();
      document.querySelector('#recognize-wall-return').addEventListener('click', () => navigate('#principles'));
      return;
    }
    if (!activeRound.started) {
      renderMasteryTransition(summary);
      return;
    }
    if (activeRound.completed) {
      renderMasteryComplete();
      return;
    }
    renderMasteryQuestion();
  }
  function renderDev() {
    const question = recognizeQuestions.find(({ id }) => id === devSelection.questionId) ?? recognizeQuestions[0];
    const variant = getRecognizeVariant(question, devSelection.variantId) ?? getRecognizeVariant(question, 'A');
    const previewQuestion = { ...question, ...variant };
    app.innerHTML = `
      <section class="recognize-template-dev page-shell">
        <header class="dev-preview-header">
          <div><p class="section-label">Development only</p><h1>第一關｜24模板驗收</h1></div>
          <button type="button" class="back-link" id="template-dev-back">返回首頁</button>
        </header>
        <div class="dev-preview-controls">
          <label>原理
            <select id="template-principle">${recognizeQuestions.map((item) => `<option value="${item.id}" ${item.id === question.id ? 'selected' : ''}>${item.title}</option>`).join('')}</select>
          </label>
          <div role="group" aria-label="模板版本">${['A', 'B', 'C'].map((id) => `<button type="button" class="geometry-tool ${id === variant.variantId ? 'active' : ''}" data-template-variant="${id}" aria-pressed="${id === variant.variantId}">Variant ${id}</button>`).join('')}</div>
        </div>
        <div class="dev-preview-meta"><strong>${question.title}｜Variant ${variant.variantId}</strong><span>${variant.variantLabel}</span></div>
        <div class="recognize-artboard">${recognizeCompositionMarkup(previewQuestion, `${question.title} Variant ${variant.variantId} 預覽`)}</div>
      </section>`;
    document.querySelector('#template-dev-back').addEventListener('click', () => navigate('#home'));
    document.querySelector('#template-principle').addEventListener('change', (event) => {
      devSelection.questionId = event.target.value;
      renderDev();
    });
    document.querySelectorAll('[data-template-variant]').forEach((button) => button.addEventListener('click', () => {
      devSelection.variantId = button.dataset.templateVariant;
      renderDev();
    }));
  }

  return { start: renderStart, question: renderQuestion, complete: renderComplete, dev: renderDev };
}
