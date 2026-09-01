import test from 'node:test';
import assert from 'node:assert/strict';

import { createDiscoverCourseRenderers } from '../discover-course.js';
import { discoverQuestions } from '../discover-questions.js';
import { setDiscoverSelection, startDiscoverCourse } from '../discover-course-state.js';
import { GEOMETRY_SHAPES, HUE_IDS, LIGHTNESS_LEVELS, SIZE_LEVELS } from '../geometry/config.js';
import { createAppState } from '../state.js';

class FakeNode {
  constructor(attributes = {}) {
    this.id = attributes.id ?? '';
    this.dataset = attributes.dataset ?? {};
    this.disabled = false;
    this.listeners = new Map();
    this.focusCount = 0;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click({ force = false } = {}) {
    if (this.disabled && !force) return;
    for (const listener of this.listeners.get('click') ?? []) {
      listener({ currentTarget: this, target: this });
    }
  }

  focus() {
    this.focusCount += 1;
  }
}

class FakeDocument {
  constructor() {
    this.nodes = [];
    this.renderCount = 0;
  }

  set innerHTML(markup) {
    this.markup = markup;
    this.renderCount += 1;
    this.nodes = [...markup.matchAll(/<(?:button|div)[^>]*>/g)].map(([tag]) => {
      const id = tag.match(/\bid="([^"]+)"/)?.[1] ?? '';
      const selectionId = tag.match(/\bdata-selection-id="([^"]+)"/)?.[1];
      const pairPanel = tag.match(/\bdata-pair-panel="([^"]+)"/)?.[1];
      const pairValue = tag.match(/\bdata-pair-value="([^"]+)"/)?.[1];
      return new FakeNode({
        id,
        dataset: {
          ...(selectionId ? { selectionId } : {}),
          ...(pairPanel ? { pairPanel } : {}),
          ...(pairValue ? { pairValue } : {})
        }
      });
    });
  }

  get innerHTML() {
    return this.markup ?? '';
  }

  querySelector(selector) {
    if (selector.startsWith('#')) return this.nodes.find((node) => node.id === selector.slice(1)) ?? null;
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    if (selector === '[data-selection-id]') return this.nodes.filter((node) => node.dataset.selectionId);
    if (selector === '[data-pair-panel]') return this.nodes.filter((node) => node.dataset.pairPanel);
    return [];
  }
}

function wrongSelection(question) {
  if (question.interactionType === 'pairing') {
    return { a: question.correctAnswer.b, b: question.correctAnswer.a };
  }
  if (Array.isArray(question.correctAnswer)) {
    return question.options.map(({ id }) => id).filter((id) => !question.correctAnswer.includes(id)).slice(0, 1);
  }
  const candidates = [
    ...(question.selectableElementIds ?? []),
    ...(question.selectableGapIds ?? []),
    ...(question.options ?? []).map(({ id }) => id),
    ...(question.comparisonPanels ?? []).map(({ id }) => id)
  ];
  return candidates.find((id) => id !== question.correctAnswer) ?? '__wrong__';
}

test('discover renderer advances every question across repeated stressful classroom-style runs', () => {
  const originalDocument = globalThis.document;
  try {
    for (let round = 0; round < 8; round += 1) {
      const document = new FakeDocument();
      globalThis.document = document;
      const state = createAppState([], [], discoverQuestions);
      const navigations = [];
      const renderers = createDiscoverCourseRenderers({
        app: document,
        state,
        navigate: (hash) => navigations.push(hash)
      });
      startDiscoverCourse(state.discoverCourse, discoverQuestions, 1000 + round, state.masteryPractice.discover);

      const visited = [];
      while (state.discoverCourse.currentIndex < state.discoverCourse.questionOrder.length) {
        renderers.question();
        const index = state.discoverCourse.currentIndex;
        const id = state.discoverCourse.questionOrder[index];
        const question = state.discoverCourse.generatedQuestions[id]
          ?? discoverQuestions.find((candidate) => candidate.id === id);
        const questionState = state.discoverCourse.questions[id];
        visited.push(id);

        const wrongAttempts = [0, 1, 2, 4][(index + round) % 4];
        for (let attempt = 0; attempt < wrongAttempts; attempt += 1) {
          setDiscoverSelection(state.discoverCourse, id, wrongSelection(question));
          document.querySelector('#discover-check').click();
          assert.equal(questionState.completed, false, `${round}:${id}: wrong attempt ${attempt}`);
          assert.ok(document.querySelector('#discover-check'), `${round}:${id}: check restored after wrong answer`);
        }

        setDiscoverSelection(state.discoverCourse, id, question.correctAnswer);
        document.querySelector('#discover-check').click();
        assert.equal(questionState.completed, true, `${round}:${id}: correct answer completes`);
        const next = document.querySelector('#discover-next');
        assert.ok(next, `${round}:${id}: next is rendered`);
        const priorIndex = state.discoverCourse.currentIndex;
        next.click();
        next.click({ force: true });

        if (priorIndex < state.discoverCourse.questionOrder.length - 1) {
          assert.equal(state.discoverCourse.currentIndex, priorIndex + 1, `${round}:${id}: advances exactly once`);
          assert.ok(document.querySelector('#discover-check'), `${round}:${id}: next question rerendered`);
        } else {
          assert.equal(navigations.at(-1), '#level/discover/complete', `${round}:${id}: final route reached`);
          break;
        }
      }

      assert.equal(visited.length, discoverQuestions.length);
      assert.ok(visited.includes('discover-repetition-single'));
      assert.ok(visited.includes('discover-repetition-group'));
      assert.equal(new Set(visited).size, discoverQuestions.length);
    }
  } finally {
    globalThis.document = originalDocument;
  }
});

test('all generated questions stay renderer-compatible across 1000 complete seeded runs', () => {
  const originalDocument = globalThis.document;
  let renderedQuestions = 0;
  let simplicityAtQuestion13 = 0;
  const successorsAfterSimplicity13 = new Set();
  try {
    for (let seed = 0; seed < 1000; seed += 1) {
      const document = new FakeDocument();
      globalThis.document = document;
      const state = createAppState([], [], discoverQuestions);
      const navigations = [];
      const renderers = createDiscoverCourseRenderers({
        app: document,
        state,
        navigate: (hash) => navigations.push(hash)
      });
      startDiscoverCourse(state.discoverCourse, discoverQuestions, seed, state.masteryPractice.discover);

      if (state.discoverCourse.questionOrder[12] === 'discover-simplicity') {
        simplicityAtQuestion13 += 1;
        successorsAfterSimplicity13.add(state.discoverCourse.questionOrder[13]);
      }

      while (state.discoverCourse.currentIndex < state.discoverCourse.questionOrder.length) {
        renderers.question();
        const index = state.discoverCourse.currentIndex;
        const id = state.discoverCourse.questionOrder[index];
        const question = state.discoverCourse.generatedQuestions[id]
          ?? discoverQuestions.find((candidate) => candidate.id === id);
        const elements = [
          ...(question.elements ?? []),
          ...(question.beforeState ?? []),
          ...(question.comparisonPanels ?? []).flatMap((panel) => panel.elements)
        ];

        for (const element of elements) {
          assert.ok(GEOMETRY_SHAPES.includes(element.shape), `${seed}:${id}: shape ${element.shape}`);
          assert.ok(HUE_IDS.includes(element.hue), `${seed}:${id}: hue ${element.hue}`);
          assert.ok(SIZE_LEVELS.includes(element.size), `${seed}:${id}: size ${element.size}`);
          assert.ok(LIGHTNESS_LEVELS.includes(element.lightness), `${seed}:${id}: lightness ${element.lightness}`);
          assert.ok(Number.isFinite(element.x) && element.x >= 0 && element.x <= 1000, `${seed}:${id}: x ${element.x}`);
          assert.ok(Number.isFinite(element.y) && element.y >= 0 && element.y <= 600, `${seed}:${id}: y ${element.y}`);
          assert.ok(Number.isFinite(element.rotation), `${seed}:${id}: rotation ${element.rotation}`);
          assert.ok(element.displaySize == null || (Number.isFinite(element.displaySize) && element.displaySize > 0), `${seed}:${id}: displaySize ${element.displaySize}`);
        }

        setDiscoverSelection(state.discoverCourse, id, question.correctAnswer);
        document.querySelector('#discover-check').click();
        const next = document.querySelector('#discover-next');
        assert.ok(next, `${seed}:${id}: next rendered after correct answer`);
        next.click();
        renderedQuestions += 1;

        if (index === state.discoverCourse.questionOrder.length - 1) {
          assert.equal(navigations.at(-1), '#level/discover/complete', `${seed}:${id}: completion route`);
          break;
        }
        assert.equal(state.discoverCourse.currentIndex, index + 1, `${seed}:${id}: index advanced`);
        assert.ok(document.querySelector('#discover-check'), `${seed}:${id}: successor rendered after next`);
      }
    }
  } finally {
    globalThis.document = originalDocument;
  }

  assert.equal(renderedQuestions, 16000);
  assert.ok(simplicityAtQuestion13 > 0, 'the classroom 13/16 simplicity position is covered');
  assert.ok(successorsAfterSimplicity13.size > 1, 'randomized successors after 13/16 simplicity are covered');
});
