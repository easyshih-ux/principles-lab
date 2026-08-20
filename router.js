const legacyStageAliases = Object.freeze({
  '#task-observe': 'gradation-observe',
  '#task-diagnose': 'gradation-discover',
  '#task-repair': 'gradation-experiment'
});

export function stageHash(stage) {
  return `#stage/${stage.stageType}/${stage.id}`;
}

export function completeHash(principleId) {
  return `#complete/${principleId}`;
}

export function recognizeQuestionHash(questionId) {
  return `#level/recognize/${questionId}`;
}

export function resolveRoute(hash, stages, principles, recognizeQuestions = []) {
  const normalizedHash = hash || '#home';

  if (normalizedHash === '#home') {
    return { name: 'home', hash: '#home' };
  }

  if (normalizedHash === '#principles') {
    return { name: 'principles', hash: '#principles' };
  }

  if (normalizedHash === '#dev/geometry') {
    return { name: 'geometryPlayground', hash: '#dev/geometry' };
  }

  if (normalizedHash === '#dev/validators') {
    return { name: 'validatorLab', hash: '#dev/validators' };
  }

  if (normalizedHash === '#level/recognize/start') {
    return { name: 'recognizeStart', hash: normalizedHash };
  }

  if (normalizedHash === '#level/recognize/complete') {
    return { name: 'recognizeComplete', hash: normalizedHash };
  }

  const recognizeMatch = normalizedHash.match(/^#level\/recognize\/([^/]+)$/);
  if (recognizeMatch) {
    const question = recognizeQuestions.find((item) => item.id === recognizeMatch[1]);
    return question
      ? { name: 'recognizeQuestion', hash: normalizedHash, question }
      : fallbackRoute(normalizedHash);
  }

  const aliasedStageId = legacyStageAliases[normalizedHash];
  if (aliasedStageId) {
    const stage = stages.find((item) => item.id === aliasedStageId);
    return stage
      ? { name: 'stage', hash: stageHash(stage), stage, isLegacyAlias: true }
      : fallbackRoute(normalizedHash);
  }

  const stageMatch = normalizedHash.match(/^#stage\/([^/]+)\/([^/]+)$/);
  if (stageMatch) {
    const [, stageType, stageId] = stageMatch;
    const stage = stages.find(
      (item) => item.id === stageId && item.stageType === stageType
    );
    return stage
      ? { name: 'stage', hash: normalizedHash, stage }
      : fallbackRoute(normalizedHash);
  }

  const completeMatch = normalizedHash.match(/^#complete\/([^/]+)$/);
  if (completeMatch) {
    const principle = principles.find((item) => item.id === completeMatch[1]);
    return principle
      ? { name: 'complete', hash: normalizedHash, principle }
      : fallbackRoute(normalizedHash);
  }

  if (normalizedHash === '#complete') {
    const principle = principles.find((item) => item.id === 'gradation');
    return principle
      ? {
          name: 'complete',
          hash: completeHash(principle.id),
          principle,
          isLegacyAlias: true
        }
      : fallbackRoute(normalizedHash);
  }

  return fallbackRoute(normalizedHash);
}

export function nextHashForStage(stage, stages) {
  if (!stage.nextStep) {
    return '#principles';
  }

  if (stage.nextStep.type === 'complete') {
    return completeHash(stage.nextStep.principleId);
  }

  const nextStage = stages.find((item) => item.id === stage.nextStep.stageId);
  return nextStage ? stageHash(nextStage) : '#principles';
}

function fallbackRoute(requestedHash) {
  return {
    name: 'home',
    hash: '#home',
    requestedHash,
    isFallback: true
  };
}
