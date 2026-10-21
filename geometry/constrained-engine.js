import { GeometryEngine } from './engine.js?v=gate4-canvas-fit-1';
import { engineToolsFor, logicalSizeForRatio, normalizeAllowedTools } from './constrained-tools.js?v=gate4-canvas-fit-1';
import { STEP_SIZE_TO_LOGICAL } from './config.js?v=gate4-canvas-fit-1';
import { snapAndClampElementPosition } from './bounds.js?v=gate4-canvas-fit-1';

export class ConstrainedGeometryEngine extends GeometryEngine {
  constructor({ allowedTools = {}, ...options } = {}) {
    const constrainedAllowedTools = normalizeAllowedTools(allowedTools);
    const elements = constrainedAllowedTools.ratioSize
      ? (options.elements ?? []).map((element) => {
          const ratioLevel = element.ratioLevel ?? element.proportion ?? 1;
          return { ...element, ratioLevel, proportion: ratioLevel, logicalSize: logicalSizeForRatio(ratioLevel) };
        })
      : options.elements;
    const engineTools = engineToolsFor(constrainedAllowedTools);
    if (constrainedAllowedTools.ratioSize && constrainedAllowedTools.delete) engineTools.push('undo');
    super({ ...options, elements, allowedTools: engineTools });
    this.constrainedAllowedTools = constrainedAllowedTools;
  }

  setConstrainedAllowedTools(allowedTools) {
    this.constrainedAllowedTools = normalizeAllowedTools(allowedTools);
    return super.setAllowedTools(engineToolsFor(this.constrainedAllowedTools));
  }

  add(shape, values = {}) {
    const ratioLevel = values.ratioLevel ?? values.proportion ?? 1;
    const stepValues = {};
    if (this.constrainedAllowedTools.stepSize) {
      stepValues.stepSize = values.stepSize ?? 4;
      stepValues.logicalSize = STEP_SIZE_TO_LOGICAL[stepValues.stepSize];
    }
    if (this.constrainedAllowedTools.stepLightness) stepValues.stepLightness = values.stepLightness ?? 4;
    const result = super.add(shape, this.constrainedAllowedTools.ratioSize
      ? { ...values, ratioLevel, proportion: ratioLevel, logicalSize: logicalSizeForRatio(ratioLevel) }
      : { ...values, ...stepValues });
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
    if (property === 'stepSize' && this.constrainedAllowedTools.stepSize) {
      element.logicalSize = STEP_SIZE_TO_LOGICAL[value];
      Object.assign(element, snapAndClampElementPosition(element, element, this.canvas, this.grid.step));
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
