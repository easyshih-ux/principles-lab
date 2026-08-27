import { recognizeTemplatePools } from './recognize-template-pool.js';

export function fisherYates(items, random = Math.random) {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createRecognizeSession(questions, random = Math.random, forcedVariants = {}) {
  const questionOrder = fisherYates(questions.map(({ id }) => id), random);
  const variantSelections = {};
  const optionOrders = {};

  questions.forEach((question) => {
    const variantIds = Object.keys(recognizeTemplatePools[question.principleId] ?? {});
    if (!variantIds.length) throw new Error(`Missing recognize templates: ${question.principleId}`);
    const forcedVariant = forcedVariants[question.id];
    variantSelections[question.id] = variantIds.includes(forcedVariant)
      ? forcedVariant
      : variantIds[Math.floor(random() * variantIds.length)];
    optionOrders[question.id] = fisherYates(question.options.map(({ id }) => id), random);
  });

  return { questionOrder, variantSelections, optionOrders };
}

