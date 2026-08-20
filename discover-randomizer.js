const EASY_START_IDS = Object.freeze(['discover-repetition-single', 'discover-gradation-size', 'discover-symmetry-shape']);

export function createSeededRandom(seed = Date.now()) {
  let value = Number(seed) >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, random) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function isValidDiscoverOrder(order, questions) {
  if (order.length !== questions.length || new Set(order).size !== questions.length) return false;
  const byId = Object.fromEntries(questions.map((question) => [question.id, question]));
  if (!order.every((id) => byId[id])) return false;
  if (!EASY_START_IDS.includes(order[0])) return false;
  for (let index = 1; index < order.length; index += 1) {
    if (byId[order[index]].principleId === byId[order[index - 1]].principleId) return false;
  }
  const synthesis = order.indexOf('discover-harmony-unity');
  if (synthesis < order.indexOf('discover-harmony') || synthesis < order.indexOf('discover-unity')) return false;
  return order.indexOf('discover-simplicity') >= 8;
}

export function createDiscoverOrder(questions, seed = Date.now()) {
  const random = createSeededRandom(seed);
  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const first = EASY_START_IDS[Math.floor(random() * EASY_START_IDS.length)];
    const candidate = [first, ...shuffled(questions.map(({ id }) => id).filter((id) => id !== first), random)];
    if (isValidDiscoverOrder(candidate, questions)) return candidate;
  }
  throw new Error('Unable to create a valid Phase 5 question order.');
}

export { EASY_START_IDS };
