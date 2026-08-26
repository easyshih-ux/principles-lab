import { recognizeQuestions } from './recognize-questions.js';

function element(id, shape, x, y, size, hue, lightness = 3, rotation = 0) {
  return { id, shape, x, y, size, hue, lightness, rotation, proportion: 1 };
}

function fixedVariant(variantId, variantLabel, elements, guides = []) {
  return Object.freeze({ variantId, variantLabel, elements: Object.freeze(elements), guides: Object.freeze(guides) });
}

const additionalVariants = Object.freeze({
  repetition: Object.freeze({
    B: fixedVariant('B', '垂直反覆', [100, 200, 300, 400, 500].map((y, index) => element(`repeat-b-${index}`, 'circle', 500, y, 2, 'blue'))),
    C: fixedVariant('C', '自由反覆', [
      element('repeat-c-0', 'square', 150, 150, 2, 'yellow'),
      element('repeat-c-1', 'square', 390, 105, 2, 'yellow'),
      element('repeat-c-2', 'square', 735, 165, 2, 'yellow'),
      element('repeat-c-3', 'square', 250, 410, 2, 'yellow'),
      element('repeat-c-4', 'square', 555, 345, 2, 'yellow'),
      element('repeat-c-5', 'square', 850, 455, 2, 'yellow')
    ])
  }),
  gradation: Object.freeze({
    B: fixedVariant('B', '明度漸層', [1, 2, 3, 4, 5].map((lightness, index) => element(`gradation-b-${index}`, 'circle', 180 + index * 160, 300, 3, 'blue', lightness))),
    C: fixedVariant('C', '色相漸變', ['red', 'red-orange', 'orange', 'yellow-orange', 'yellow'].map((hue, index) => element(`gradation-c-${index}`, 'square', 180 + index * 160, 300, 3, hue, 3)))
  }),
  symmetry: Object.freeze({
    B: fixedVariant('B', '上下鏡像', [
      element('sym-b-circle-top', 'circle', 220, 150, 2, 'blue'), element('sym-b-circle-bottom', 'circle', 220, 450, 2, 'blue'),
      element('sym-b-triangle-top', 'triangle', 500, 145, 3, 'red', 3, 0), element('sym-b-triangle-bottom', 'triangle', 500, 455, 3, 'red', 3, 180),
      element('sym-b-rectangle-top', 'rectangle', 780, 180, 2, 'yellow'), element('sym-b-rectangle-bottom', 'rectangle', 780, 420, 2, 'yellow')
    ], [{ type: 'horizontal-axis', y: 300 }]),
    C: fixedVariant('C', '位置對稱', [
      element('sym-c-left-top', 'circle', 280, 165, 3, 'blue'), element('sym-c-right-top', 'square', 720, 165, 3, 'red'),
      element('sym-c-left-bottom', 'triangle', 230, 420, 2, 'yellow'), element('sym-c-right-bottom', 'rectangle', 770, 420, 2, 'green')
    ], [{ type: 'vertical-axis', x: 500 }])
  }),
  balance: Object.freeze({
    B: fixedVariant('B', '大小與距離', [
      element('balance-b-large', 'circle', 390, 310, 4, 'green', 2),
      element('balance-b-small-1', 'square', 720, 215, 2, 'green', 2),
      element('balance-b-small-2', 'square', 820, 395, 2, 'green', 2)
    ]),
    C: fixedVariant('C', '錯位整體均衡', [
      element('balance-c-left-1', 'triangle', 255, 175, 3, 'blue', 2),
      element('balance-c-left-2', 'circle', 380, 445, 2, 'blue', 2),
      element('balance-c-right-1', 'rectangle', 700, 365, 3, 'blue', 2),
      element('balance-c-right-2', 'square', 850, 145, 1, 'blue', 2)
    ])
  }),
  rhythm: Object.freeze({
    B: fixedVariant('B', '方向律動', [
      element('rhythm-b-0', 'triangle', 120, 160, 2, 'blue', 3, 120),
      element('rhythm-b-1', 'triangle', 245, 235, 2, 'blue', 3, 125),
      element('rhythm-b-2', 'triangle', 370, 350, 2, 'blue', 3, 135),
      element('rhythm-b-3', 'triangle', 505, 430, 2, 'blue', 3, 90),
      element('rhythm-b-4', 'triangle', 650, 345, 2, 'blue', 3, 45),
      element('rhythm-b-5', 'triangle', 785, 230, 2, 'blue', 3, 55),
      element('rhythm-b-6', 'triangle', 900, 145, 2, 'blue', 3, 60)
    ]),
    C: fixedVariant('C', '自由動勢', [
      element('rhythm-c-0', 'triangle', 105, 410, 2, 'red', 3, 315),
      element('rhythm-c-1', 'triangle', 225, 325, 2, 'red', 3, 330),
      element('rhythm-c-2', 'triangle', 365, 180, 2, 'red', 3, 15),
      element('rhythm-c-3', 'triangle', 505, 245, 2, 'red', 3, 55),
      element('rhythm-c-4', 'triangle', 660, 390, 2, 'red', 3, 100),
      element('rhythm-c-5', 'triangle', 790, 285, 2, 'red', 3, 45),
      element('rhythm-c-6', 'triangle', 900, 150, 2, 'red', 3, 10)
    ])
  }),
  contrast: Object.freeze({
    B: fixedVariant('B', '大小對比', [
      element('contrast-b-0', 'circle', 130, 300, 2, 'green'),
      element('contrast-b-1', 'circle', 275, 300, 2, 'green'),
      element('contrast-b-2', 'circle', 420, 300, 2, 'green'),
      element('contrast-b-large', 'circle', 650, 300, 5, 'green'),
      element('contrast-b-4', 'circle', 855, 300, 2, 'green')
    ]),
    C: fixedVariant('C', '群組色彩對比', [
      element('contrast-c-red-0', 'circle', 250, 220, 2, 'red'),
      element('contrast-c-red-1', 'circle', 350, 300, 2, 'red'),
      element('contrast-c-red-2', 'circle', 250, 380, 2, 'red'),
      element('contrast-c-blue-0', 'circle', 750, 220, 2, 'blue'),
      element('contrast-c-blue-1', 'circle', 650, 300, 2, 'blue'),
      element('contrast-c-blue-2', 'circle', 750, 380, 2, 'blue')
    ])
  }),
  harmony: Object.freeze({
    B: fixedVariant('B', '暖色相近色調和', [
      element('harmony-b-circle', 'circle', 210, 200, 3, 'red'),
      element('harmony-b-triangle', 'triangle', 760, 175, 3, 'orange'),
      element('harmony-b-square', 'square', 455, 420, 3, 'red-orange'),
      element('harmony-b-rectangle', 'rectangle', 815, 430, 3, 'red')
    ]),
    C: fixedVariant('C', '同色系明度調和', [
      element('harmony-c-circle', 'circle', 225, 210, 3, 'blue', 1),
      element('harmony-c-triangle', 'triangle', 750, 175, 3, 'blue', 5),
      element('harmony-c-square', 'square', 465, 420, 3, 'blue', 3),
      element('harmony-c-rectangle', 'rectangle', 815, 420, 3, 'blue', 2)
    ])
  }),
  unity: Object.freeze({
    B: fixedVariant('B', '共同形狀統一', [
      element('unity-b-circle-1', 'circle', 170, 300, 3, 'blue'),
      element('unity-b-circle-2', 'circle', 335, 270, 3, 'green'),
      element('unity-b-circle-3', 'circle', 500, 320, 3, 'red'),
      element('unity-b-circle-4', 'circle', 665, 285, 3, 'yellow'),
      element('unity-b-circle-5', 'circle', 830, 310, 3, 'violet')
    ]),
    C: fixedVariant('C', '箭頭方向統一', [
      element('unity-c-arrow-1', 'arrow', 170, 300, 2, 'red', 3, 45),
      element('unity-c-arrow-2', 'arrow', 335, 270, 3, 'blue', 3, 45),
      element('unity-c-arrow-3', 'arrow', 500, 320, 2, 'green', 3, 45),
      element('unity-c-arrow-4', 'arrow', 665, 285, 3, 'yellow', 3, 45),
      element('unity-c-arrow-5', 'arrow', 830, 310, 2, 'violet', 3, 45)
    ])
  })
});

export const recognizeTemplatePools = Object.freeze(Object.fromEntries(recognizeQuestions.map((question) => {
  const variantA = fixedVariant('A', {
    repetition: '規律水平反覆', gradation: '大小漸層', symmetry: '左右鏡像', balance: '大小與數量',
    rhythm: '起伏律動', contrast: '造形與色彩對比', harmony: '藍綠相近色調和', unity: '色彩統一'
  }[question.principleId], question.elements, question.guides ?? []);
  return [question.principleId, Object.freeze({ A: variantA, ...additionalVariants[question.principleId] })];
})));

export const recognizeTemplateCount = Object.values(recognizeTemplatePools)
  .reduce((count, variants) => count + Object.keys(variants).length, 0);

export function getRecognizeVariant(question, variantId = 'A') {
  return recognizeTemplatePools[question.principleId]?.[variantId] ?? null;
}
