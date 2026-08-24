import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { phase6cDefinitionsById } from '../phase6c-definitions.js';
import { experimentActionsMarkup } from '../experiment-course.js';
import { createPhase6cCourseState } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';

const css=fs.readFileSync(new URL('../phase6c.css',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../experiment-course.js',import.meta.url),'utf8');
const panelSource=fs.readFileSync(new URL('../geometry/control-panel.js',import.meta.url),'utf8');

test('proportion formally exposes delete with shape ratio position and duplicate',()=>{
 const tools=phase6cDefinitionsById['experiment-proportion'].allowedTools;
 assert.deepEqual(Object.entries(tools).filter(([,on])=>on).map(([key])=>key).sort(),['delete','duplicate','position','ratioSize','shape']);
});

test('tablet-first layout uses one shared three-column workspace',()=>{
 assert.match(css,/experiment-page\{height:100svh;min-height:0;overflow:hidden/);
 assert.match(css,/experiment-workspace\{[^}]*display:grid[^}]*grid-template-columns:minmax\(170px,220px\) minmax\(0,1fr\) minmax\(160px,210px\)/);
 assert.match(css,/experiment-center-workspace\{[^}]*grid-template-rows:auto auto/);
 assert.match(css,/@media\(orientation:landscape\) and \(max-height:900px\)/);
 assert.match(css,/@media\(orientation:portrait\)/);
 assert.equal((source.match(/class="experiment-workspace/g)||[]).length,1);
 assert.equal((source.match(/experiment-tool-panel-left/g)||[]).length,1);
 assert.equal((source.match(/experiment-tool-panel-right/g)||[]).length,1);
});

test('allowed tools are split by one reusable primary secondary panel renderer',()=>{
 assert.match(panelSource,/region = 'all'/);
 assert.match(panelSource,/showPrimary = this.region !== 'secondary'/);
 assert.match(panelSource,/showSecondary = this.region !== 'primary'/);
 assert.match(source,/region: 'primary'/);
 assert.match(source,/region: 'secondary'/);
 assert.match(source,/hasRightTools = definition.allowedTools.rotation || definition.allowedTools.duplicate/);
 assert.match(css,/experiment-workspace.no-right-tools/);
});

test('formal review and success actions remain directly below the canvas',()=>{
 const definition=phase6cDefinitionsById['experiment-proportion']; const course=createPhase6cCourseState([definition]);
 assert.match(experimentActionsMarkup(course,definition,null),/id="experiment-check"/);
 getExperimentState(course,definition.id).completed=true;
 assert.match(experimentActionsMarkup(course,definition,{result:{passed:true}}),/id="experiment-next"/);
 const canvas=source.indexOf('experiment-canvas-wrap'); const footer=source.indexOf('experiment-footer'); const right=source.indexOf('experiment-tool-panel-right');
 assert.ok(canvas>=0 && footer>canvas && right>footer);
});

test('canvas remains the largest column and keeps its original visible surface',()=>{
 assert.ok(css.includes('aspect-ratio:5/3'));
 assert.match(css,/experiment-canvas-wrap \.geometry-canvas\{[^}]*border:1px solid var\(--line\)[^}]*background:var\(--surface\)/);
 assert.match(css,/experiment-canvas-wrap>#experiment-canvas\{width:100%;height:auto/);
 assert.match(css,/experiment-footer\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
});

test('tablet controls remain touch-sized and canvas uses unified pointer behavior',()=>{
 assert.match(css,/experiment-side-group button\{min-width:48px;min-height:48px/);
 assert.match(css,/geometry-color-option[^}]*min-width:48px;min-height:48px/);
 assert.match(css,/geometry-element.selected\{outline-width:4px/);
 const shared=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(shared,/.geometry-canvas\{[^}]*touch-action:none/);
});

test('all seven formal experiments share the same three-column renderer',()=>{
 const formal=['repetition','gradation','balance','rhythm','symmetry','contrast','proportion'];
 assert.deepEqual(formal.map(id=>phase6cDefinitionsById[`experiment-${id}`].principleId),formal);
 assert.equal((source.match(/experiment-controls-primary/g)||[]).length,2);
 assert.equal((source.match(/experiment-controls-secondary/g)||[]).length,2);
});

test('portrait tablet stacks canvas and tool panels with natural page scrolling',()=>{
 assert.match(css,/@media\(orientation:portrait\)\{\.experiment-page\{height:auto;min-height:100svh;overflow:visible/);
 assert.match(css,/experiment-center-workspace\{order:1/);
 assert.match(css,/experiment-tool-panel-left\{order:2/);
 assert.match(css,/experiment-tool-panel-right\{order:3/);
});
