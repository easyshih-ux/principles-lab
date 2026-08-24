import { GeometryEngine } from './engine.js';
import { engineToolsFor, normalizeAllowedTools } from './constrained-tools.js';

export class ConstrainedGeometryEngine extends GeometryEngine {
  constructor({ allowedTools = {}, ...options } = {}) {
    const constrainedAllowedTools = normalizeAllowedTools(allowedTools);
    super({ ...options, allowedTools: engineToolsFor(constrainedAllowedTools) });
    this.constrainedAllowedTools = constrainedAllowedTools;
  }

  setConstrainedAllowedTools(allowedTools) {
    this.constrainedAllowedTools = normalizeAllowedTools(allowedTools);
    return super.setAllowedTools(engineToolsFor(this.constrainedAllowedTools));
  }

  duplicate(id = this.selectedId) {
    const result = super.duplicate(id);
    if (!result.changed) return result;
    const duplicate = this.getSelectedElement();
    duplicate.isCore = false;
    const historyEntry = this.history.at(-1);
    if (historyEntry?.type === 'duplicate') historyEntry.after = this.snapshot();
    return this.changed('duplicate');
  }
}
