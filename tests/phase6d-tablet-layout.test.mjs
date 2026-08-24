import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { phase6cDefinitionsById } from '../phase6c-definitions.js';
import { experimentActionsMarkup } from '../experiment-course.js';
import { createPhase6cCourseState } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';

const css=fs.readFileSync(new URL('../phase6c.css',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../experiment-course.js',import.meta.url),'utf8');
test('proportion formally exposes delete with shape ratio position and duplicate',()=>{
 const tools=phase6cDefinitionsById['experiment-proportion'].allowedTools;
 assert.deepEqual(Object.entries(tools).filter(([,on])=>on).map(([key])=>key).sort(),['delete','duplicate','position','ratioSize','shape']);
});
test('tablet-first layout uses a viewport workspace with a persistent control dock',()=>{
 assert.match(css,/experiment-page\{height:100svh;min-height:0;overflow:hidden/);
 assert.match(css,/experiment-control-dock\{[^}]*height:100%[^}]*overflow:hidden/);
 assert.match(css,/experiment-dock-tools\{[^}]*flex-wrap:wrap[^}]*overflow-x:hidden;overflow-y:hidden/);
 assert.match(css,/@media\(orientation:landscape\) and \(max-height:900px\)/);
 assert.match(css,/@media\(orientation:portrait\)/);
 const canvas=source.indexOf('experiment-canvas-wrap'); const dock=source.indexOf('experiment-control-dock'); const tools=source.indexOf('experiment-dock-tools'); const controls=source.indexOf('experiment-controls'); const footer=source.indexOf('experiment-footer'); assert.ok(canvas>=0 && dock>canvas && tools>dock && controls>tools && footer>controls);
});
test('formal review and success actions remain present in compact layout',()=>{
 const definition=phase6cDefinitionsById['experiment-proportion']; const course=createPhase6cCourseState([definition]);
 assert.match(experimentActionsMarkup(course,definition,null),/id="experiment-check"/);
 getExperimentState(course,definition.id).completed=true;
 assert.match(experimentActionsMarkup(course,definition,{result:{passed:true}}),/id="experiment-next"/);
});
test('tablet controls remain touch-sized and canvas uses unified pointer behavior',()=>{
 assert.match(css,/experiment-shape-bar button{min-height:48px/);
 assert.match(css,/experiment-mode-bar button{min-height:48px/);
 assert.match(css,/control-action{[^}]*min-height:48px/);
 assert.match(css,/geometry-element.selected{outline-width:4px/);
 const shared=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(shared,/.geometry-canvas{[^}]*touch-action:none/);
});


test('all seven formal experiments share one dock renderer instead of per-principle layouts',()=>{
 const formal=['repetition','gradation','balance','rhythm','symmetry','contrast','proportion'];
 assert.deepEqual(formal.map(id=>phase6cDefinitionsById[`experiment-${id}`].principleId),formal);
 assert.equal((source.match(/class="experiment-control-dock"/g)||[]).length,1);
 assert.equal((source.match(/class="experiment-dock-tools"/g)||[]).length,1);
});

test('tablet dock wraps actual allowed tools into two complete rows without a primary scrollbar',()=>{
 assert.match(css,/experiment-page \.geometry-control-panel,.experiment-page \.geometry-controls-body\{display:contents/);
 assert.match(css,/experiment-dock-tools\{[^}]*flex-wrap:wrap[^}]*overflow-x:hidden;overflow-y:hidden/);
 assert.match(css,/experiment-dock-group[^}]*height:50%/);
 assert.match(css,/@media\(max-width:620px\)\{\.experiment-dock-tools\{[^}]*flex-wrap:nowrap;overflow-x:auto/);
});

 test('canvas has an explicit visible work surface adjacent to the dock',()=>{
 assert.match(css,/experiment-canvas-wrap[^}]*border:1px solid var\(--line\)[^}]*background:var\(--surface\)/);
 assert.match(css,/experiment-canvas-wrap>#experiment-canvas\{width:100%;height:100%/);
 assert.match(css,/experiment-page\{grid-template-rows:auto auto minmax\(250px,1fr\) clamp\(184px,27svh,224px\);gap:5px/);
});
