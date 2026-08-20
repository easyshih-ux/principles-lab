import { getShapeDimensions } from './geometry/bounds.js';
import { getDisplayColor } from './geometry/palette.js';
import {
  applyRecognizeValidation,
  completeRecognizeCourse,
  firstIncompleteQuestion,
  resetRecognizeCourse,
  selectRecognizeAnswer
} from './recognize-course-state.js';
import { recognizeQuestions } from './recognize-questions.js';
import { recognizeQuestionHash } from './router.js';
import { validateStage } from './validators.js';

function compositionMarkup(question) {
  return `
    <div class="recognize-composition" role="img" aria-label="第 ${recognizeQuestions.indexOf(question) + 1} 題幾何構圖">
      ${(question.guides ?? []).map((guide) => `
        <i class="composition-guide ${guide.type}" style="--guide-x:${guide.x / 10}%" aria-hidden="true"></i>`).join('')}
      ${question.elements.map((element) => {
        const dimensions = getShapeDimensions(element);
        return `
          <i
            class="composition-element shape-${element.shape}"
            style="--x:${element.x / 10}%;--y:${element.y / 6}%;--w:${dimensions.width / 10}%;--h:${dimensions.height / 6}%;--rotation:${element.rotation}deg;--geometry-color:${getDisplayColor(element.hue, element.lightness)}"
            aria-hidden="true"
          ><span class="geometry-shape"></span></i>`;
      }).join('')}
    </div>`;
}

export function createRecognizeCourseRenderers({ app, state, navigate }) {
  const courseState = state.recognizeCourse;

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
      resetRecognizeCourse(courseState, recognizeQuestions);
      navigate(recognizeQuestionHash(recognizeQuestions[0].id));
    });
  }

  function renderQuestion(question) {
    if (!courseState.started) resetRecognizeCourse(courseState, recognizeQuestions);
    const firstIncomplete = firstIncompleteQuestion(courseState, recognizeQuestions);
    const requestedIndex = recognizeQuestions.indexOf(question);
    const availableIndex = firstIncomplete ? recognizeQuestions.indexOf(firstIncomplete) : recognizeQuestions.length;
    if (requestedIndex > availableIndex) {
      navigate(recognizeQuestionHash(firstIncomplete.id));
      return;
    }

    const questionState = courseState.questions[question.id];
    const progress = `${requestedIndex + 1} / ${recognizeQuestions.length}`;
    app.innerHTML = `
      <section class="recognize-question-page page-shell">
        <header class="recognize-question-header">
          <button type="button" class="back-link" id="recognize-exit">← 返回形式原理選擇頁</button>
          <h1>第一關｜你看得出來嗎？</h1>
          <strong>${progress}</strong>
        </header>
        <div class="recognize-artboard">${compositionMarkup(question)}</div>
        <div class="recognize-question-copy">
          <h2>${question.prompt}</h2>
          <div class="recognize-options" role="group" aria-label="答案選項">
            ${question.options.map((option) => `
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
              ? `<button type="button" class="primary-button compact" id="recognize-next">${requestedIndex === recognizeQuestions.length - 1 ? '完成第一關' : '下一題'}</button>`
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
      applyRecognizeValidation(courseState, question, validation);
      renderQuestion(question);
    });
    document.querySelector('#recognize-next')?.addEventListener('click', () => {
      const nextQuestion = recognizeQuestions[requestedIndex + 1];
      if (nextQuestion) {
        navigate(recognizeQuestionHash(nextQuestion.id));
        return;
      }
      if (completeRecognizeCourse(courseState, recognizeQuestions)) {
        navigate('#level/recognize/complete');
      }
    });
  }

  function renderComplete() {
    if (!completeRecognizeCourse(courseState, recognizeQuestions)) {
      const incomplete = firstIncompleteQuestion(courseState, recognizeQuestions);
      navigate(incomplete ? recognizeQuestionHash(incomplete.id) : '#level/recognize/start');
      return;
    }
    app.innerHTML = `
      <section class="recognize-complete page-shell">
        <div>
          <p class="section-label">觀察完成</p>
          <h1>第一關完成</h1>
          <p class="recognize-complete-lead">你已經開始看得出畫面中的規律了。</p>
          <p>接下來，不只要看出來，還要找出——<br><strong>畫面到底是哪裡變了？</strong></p>
          <button type="button" class="primary-button" disabled>第二關施工中</button>
          <button type="button" class="back-link recognize-wall-return" id="recognize-wall-return">回到形式原理選擇頁</button>
        </div>
        <div class="recognize-complete-pattern" aria-hidden="true">${Array.from({ length: 8 }, (_, index) => `<i style="--index:${index}"></i>`).join('')}</div>
      </section>`;
    document.querySelector('#recognize-wall-return').addEventListener('click', () => navigate('#principles'));
  }

  return { start: renderStart, question: renderQuestion, complete: renderComplete };
}
