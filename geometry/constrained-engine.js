import { GeometryEngine } from './engine.js';
import { engineToolsFor, logicalSizeForRatio, normalizeAllowedTools } from './constrained-tools.js';

export class ConstrainedGeometryEngine extends GeometryEngine {
  constructor({ allowedTools = {}, ...options } = {}) {
    const constrainedAllowedTools = normalizeAllowedTools(allowedTools);
    const elements = constrainedAllowedTools.ratioSize
      ? (options.elements ?? []).map((element) => ({ ...element, logicalSize: logicalSizeForRatio(element.proportion ?? 1) }))
      : options.elements;
    super({ ...options, elements, allowedTools: engineToolsFor(constrainedAllowedTools) });
    this.constrainedAllowedTools = constrainedAllowedTools;
  }

  setConstrainedAllowedTools(allowedTools) {
    this.constrainedAllowedTools = normalizeAllowedTools(allowedTools);
    return super.setAllowedTools(engineToolsFor(this.constrainedAllowedTools));
  }

  add(shape, values = {}) {
    const result = super.add(shape, values);
    if (result.changed && this.constrainedAllowedTools.ratioSize) {
      const element = this.getSelectedElement();
      element.logicalSize = logicalSizeForRatio(element.proportion);
    }
    return result;
  }

  applyProperty(element, property, value) {
    super.applyProperty(element, property, value);
    if (property === 'proportion' && this.constrainedAllowedTools.ratioSize) {
      element.logicalSize = logicalSizeForRatio(value);
    }
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
