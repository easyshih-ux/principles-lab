import { GeometryEngine } from './engine.js?v=gate4c-pending-1';
import { engineToolsFor, logicalSizeForRatio, normalizeAllowedTools } from './constrained-tools.js?v=gate4c-pending-1';
import { STEP_SIZE_TO_LOGICAL } from './config.js?v=gate4c-pending-1';
import { snapAndClampElementPosition, getRotatedHalfExtents } from './bounds.js?v=gate4c-pending-1';
import { getLogicalSize } from './palette.js?v=gate4c-pending-1';
import { createGeometryElement } from './model.js?v=gate4c-pending-1';

// Gate 4C unit copy (repetition only). A unit is the group of shapes that touch, overlap or
// almost touch — the same rule the repetition checker uses. Copies are placed with a clear
// gap so they never merge with another unit.
const UNIT_LINK_GAP = 20;
const UNIT_COPY_GAP = 60;
const UNIT_STEP = 20;
const linkRadius = (element) => (Number.isFinite(element.logicalSize) ? element.logicalSize : getLogicalSize(element.size)) / 2;
const outerRadius = (element) => { const half = getRotatedHalfExtents(element); return Math.max(half.x, half.y); };

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
    this.groupIds = null;
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

  // ---- Gate 4C unit copy -------------------------------------------------
  unitOf(id) {
    const start = this.elements.find((element) => element.id === id);
    if (!start) return [];
    const members = new Set([start.id]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      for (const other of this.elements) {
        if (members.has(other.id)) continue;
        const gap = Math.hypot(other.x - current.x, other.y - current.y) - linkRadius(current) - linkRadius(other);
        if (gap <= UNIT_LINK_GAP) { members.add(other.id); queue.push(other); }
      }
    }
    return this.elements.filter((element) => members.has(element.id)).map((element) => element.id);
  }

  groupRange(ids) {
    const members = this.elements.filter((element) => ids.includes(element.id));
    const range = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
    for (const element of members) {
      const half = getRotatedHalfExtents(element);
      range.minX = Math.max(range.minX, half.x - element.x);
      range.maxX = Math.min(range.maxX, this.canvas.width - half.x - element.x);
      range.minY = Math.max(range.minY, half.y - element.y);
      range.maxY = Math.min(range.maxY, this.canvas.height - half.y - element.y);
    }
    return range;
  }

  groupDelta(ids, delta) {
    const range = this.groupRange(ids);
    const fit = (value, minimum, maximum) => {
      let snapped = Math.round(value / UNIT_STEP) * UNIT_STEP;
      if (snapped < minimum) snapped = Math.ceil(minimum / UNIT_STEP) * UNIT_STEP;
      if (snapped > maximum) snapped = Math.floor(maximum / UNIT_STEP) * UNIT_STEP;
      return Math.min(Math.max(snapped, minimum), maximum);
    };
    return { x: fit(delta.x, range.minX, range.maxX), y: fit(delta.y, range.minY, range.maxY) };
  }

  duplicateUnit(id = this.selectedId) {
    if (!this.canUse('unitDuplicate')) return this.unauthorized();
    const ids = this.groupIds?.includes(id) ? this.groupIds : this.unitOf(id);
    if (!ids.length) return this.unchanged('not-found');
    const members = this.elements.filter((element) => ids.includes(element.id));
    const others = this.elements;
    const range = this.groupRange(ids);
    let best = null;
    for (let dy = -this.canvas.height; dy <= this.canvas.height; dy += UNIT_STEP) {
      if (dy < range.minY || dy > range.maxY) continue;
      for (let dx = -this.canvas.width; dx <= this.canvas.width; dx += UNIT_STEP) {
        if ((dx === 0 && dy === 0) || dx < range.minX || dx > range.maxX) continue;
        const score = Math.hypot(dx, dy * 1.2) + (dx < 0 ? 1 : 0);
        if (best && score >= best.score) continue;
        const clear = members.every((member) => others.every((other) => Math.hypot(other.x - member.x - dx, other.y - member.y - dy) - outerRadius(member) - outerRadius(other) >= UNIT_COPY_GAP));
        if (clear) best = { dx, dy, score };
      }
    }
    if (!best) return this.unchanged('no-space');
    const before = this.snapshot();
    const copies = members.map((member) => {
      const copy = createGeometryElement({ ...member, id: this.idFactory(), x: member.x + best.dx, y: member.y + best.dy }, this.idFactory);
      copy.isCore = false;
      return copy;
    });
    this.elements.push(...copies);
    this.groupIds = copies.map((copy) => copy.id);
    this.selectedId = this.groupIds[0];
    this.record('duplicate-unit', before);
    return this.changed('duplicate-unit');
  }

  moveGroup(ids, delta) {
    if (!this.canUse('move')) return this.unauthorized();
    const step = this.groupDelta(ids, delta);
    if (!step.x && !step.y) return this.unchanged('same-position');
    const before = this.snapshot();
    this.elements.forEach((element) => {
      if (ids.includes(element.id)) { element.x += step.x; element.y += step.y; }
    });
    this.record('move-unit', before);
    return this.changed('move-unit');
  }

  select(id) {
    if (!this.groupIds?.includes(id)) this.groupIds = null;
    return super.select(id);
  }

  clearSelection() {
    this.groupIds = null;
    return super.clearSelection();
  }

  delete(id = this.selectedId) {
    this.groupIds = null;
    return super.delete(id);
  }

  restoreSelection(selectedId, groupIds) {
    const exists = (value) => this.elements.some((element) => element.id === value);
    this.selectedId = exists(selectedId) ? selectedId : null;
    this.groupIds = this.canUse('unitDuplicate') && groupIds?.length && groupIds.every(exists) && groupIds.includes(this.selectedId) ? [...groupIds] : null;
  }

  duplicate(id = this.selectedId) {
    this.groupIds = null;
    const result = super.duplicate(id);
    if (!result.changed) return result;
    const duplicate = this.getSelectedElement();
    duplicate.isCore = false;
    const historyEntry = this.history.at(-1);
    if (historyEntry?.type === 'duplicate') historyEntry.after = this.snapshot();
    return this.changed('duplicate');
  }
}
