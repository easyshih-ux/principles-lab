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
test('tablet-first layout keeps canvas responsive and controls with review actions',()=>{
 assert.ok(css.includes('height:clamp(250px,calc(100svh - 390px),440px)'));
 assert.ok(css.includes('@media(max-width:900px)'));
 assert.match(css,/experiment-lower-workspace{[^}]*grid-template-columns/);
 const canvas=source.indexOf('experiment-canvas-wrap'); const lower=source.indexOf('experiment-lower-workspace'); const controls=source.indexOf('experiment-controls'); const footer=source.indexOf('experiment-footer'); assert.ok(canvas>=0 && lower>canvas && controls>lower && footer>controls);
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
