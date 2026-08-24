function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function createExperimentItemState(definition) {
  const elements = clone(definition.initialState.elements ?? []);
  return {
    experimentId: definition.id,
    workingElements: elements,
    attemptCount: 0,
    lastDiagnosticCode: null,
    hintLevel: 'observe',
    completed: false,
    detectedMethods: [],
    selectedExperimentOption: definition.initialState.selectedSymmetryMode ?? null,
    initialSnapshot: clone(elements),
    beforeState: clone(definition.initialState.beforeState),
    coreElementIds: [...(definition.initialState.coreElementIds ?? [])],
    historyRef: null
  };
}

export function createExperimentSessionState(definitions) {
  return {
    currentExperimentId: null,
    experiments: Object.fromEntries(definitions.map((definition) => [
      definition.id,
      createExperimentItemState(definition)
    ]))
  };
}

export function getExperimentState(session, experimentId) {
  const state = session.experiments[experimentId];
  if (!state) throw new Error(`Unknown experiment state: ${experimentId}`);
  return state;
}

export function updateExperimentState(session, experimentId, changes) {
  Object.assign(getExperimentState(session, experimentId), clone(changes));
  return getExperimentState(session, experimentId);
}

export function resetExperimentState(session, definition) {
  session.experiments[definition.id] = createExperimentItemState(definition);
  return session.experiments[definition.id];
}
