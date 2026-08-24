import { GeometryEngine } from './engine.js';
import { engineToolsFor, logicalSizeForRatio, normalizeAllowedTools } from './constrained-tools.js';

export class ConstrainedGeometryEngine extends GeometryEngine {
  constructor({ allowedTools = {}, ...options } = {}) {
    const constrainedAllowedTools = normalizeAllowedTools(allowedTools);
    const elements = constrainedAllowedTools.ratioSize
      ? (options.elements ?? []).map((element) => {
          const ratioLevel = element.ratioLevel ?? element.proportion ?? 1;
          return { ...element, ratioLevel, proportion: ratioLevel, logicalSize: logicalSizeForRatio(ratioLevel) };
        })
      : options.elements;
    super({ ...options, elements, allowedTools: engineToolsFor(constrainedAllowedTools) });
    this.constrainedAllowedTools = constrainedAllowedTools;
  }

  setConstrainedAllowedTools(allowedTools) {
    this.constrainedAllowedTools = normalizeAllowedTools(allowedTools);
    return super.setAllowedTools(engineToolsFor(this.constrainedAllowedTools));
  }

  add(shape, values = {}) {
    const ratioLevel = values.ratioLevel ?? values.proportion ?? 1;
    const result = super.add(shape, this.constrainedAllowedTools.ratioSize
      ? { ...values, ratioLevel, proportion: ratioLevel, logicalSize: logicalSizeForRatio(ratioLevel) }
      : values);
    return result;
  }

  setProperty(property, value, id = this.selectedId) {
    if (property === 'ratioLevel') {
      if (!this.constrainedAllowedTools.ratioSize) return this.unauthorized();
      return super.setProperty('proportion', value, id);
    }
    return super.setProperty(property, value, id);
  }

  applyProperty(element, property, value) {
    super.applyProperty(element, property, value);
    if (property === 'proportion' && this.constrainedAllowedTools.ratioSize) {
      element.ratioLevel = value;
      element.proportion = value;
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
