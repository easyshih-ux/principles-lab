function isEmpty(selection) {
  return selection == null || selection === '' || (Array.isArray(selection) && selection.length === 0);
}

const sameSet = (left, right) => left.length === right.length && left.every((value) => right.includes(value));

export function validateDiscoverQuestion(question, selection) {
  if (isEmpty(selection)) return { isValid: false, code: 'incomplete' };
  if (question.validatorId === 'discover-selection') {
    return { isValid: selection === question.correctAnswer, code: selection === question.correctAnswer ? 'valid' : selection };
  }
  if (question.validatorId === 'discover-multi') {
    const selected = [...selection].sort();
    if (sameSet(selected, question.correctAnswer)) return { isValid: true, code: 'valid' };
    const key = selected.join('-');
    const legacyCode = question.correctAnswer.join('-') === 'b-c'
      ? ({ b:'only-b', c:'only-c', 'a-b':'a-b', 'a-b-c':'all' })[key]
      : null;
    return { isValid: false, code: legacyCode ?? 'incorrect' };
  }
  if (question.validatorId === 'discover-pairing') {
    const isValid = Object.entries(question.correctAnswer).every(([panel, principle]) => selection?.[panel] === principle);
    return { isValid, code: isValid ? 'valid' : 'incorrect' };
  }
  return { isValid: false, code: 'validator-not-found' };
}
