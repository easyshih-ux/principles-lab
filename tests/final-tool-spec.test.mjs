import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { phase6cDefinitions, phase6cDefinitionsById } from '../phase6c-definitions.js';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';
import { createPhase6cCourseState, resetPhase6cExperiment } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';
import { addShapeControlsMarkup } from '../experiment-course.js';

const enabled = (id) => Object.entries(phase6cDefinitionsById[`experiment-${id}`].allowedTools).filter(([,on])=>on).map(([tool])=>tool).sort();
const expected = {
 repetition:['addShape','color','delete','duplicate','position','rotation','size'],
 gradation:['addShape','color','delete','duplicate','lightness','position','size'],
 balance:['addShape','delete','duplicate','position','size'],
 rhythm:['addShape','delete','duplicate','position','rotation','size'],
 symmetry:['addShape','delete','duplicate','grid','position','rotation','size'],
 contrast:['addShape','color','delete','duplicate','position','size'],
 proportion:['addShape','delete','duplicate','position','ratioSize'],
 unity:['addShape','color','delete','duplicate','position','rotation'],
 harmony:['addShape','color','delete','duplicate','lightness','position','size'],
 simplicity:['color','delete','position','size']
};

test('all ten experiments exactly match the Final Tool Table',()=>{
 for(const [id,tools] of Object.entries(expected)) assert.deepEqual(enabled(id),[...tools].sort(),id);
});

test('addShape is independent from shape mutation and color is independent from lightness',()=>{
 const grad=phase6cDefinitionsById['experiment-gradation'].allowedTools;
 assert.equal(grad.addShape,true); assert.equal(grad.shape,false); assert.equal(grad.color,true); assert.equal(grad.lightness,true);
 const repetition=phase6cDefinitionsById['experiment-repetition'].allowedTools;
 assert.equal(repetition.color,true); assert.equal(repetition.lightness,false);
});

test('gradation starts blank and can add duplicate resize recolor relight and move',()=>{
 const def=phase6cDefinitionsById['experiment-gradation']; assert.deepEqual(def.initialState.elements,[]);
 const engine=new ConstrainedGeometryEngine({allowedTools:def.allowedTools,elements:[]});
 assert.equal(engine.add('circle',{x:300,y:300}).changed,true);
 assert.equal(engine.duplicate().changed,true);
 assert.equal(engine.setProperty('size',5).changed,true);
 assert.equal(engine.setProperty('hue','green').changed,true);
 assert.equal(engine.setProperty('lightness',5).changed,true);
 assert.equal(engine.move(engine.selectedId,{x:500,y:300}).changed,true);
});

test('limited-tool exclusions remain intentional',()=>{
 for(const id of ['balance','rhythm','symmetry','proportion']) assert.equal(phase6cDefinitionsById[`experiment-${id}`].allowedTools.color,false,id);
 assert.equal(phase6cDefinitionsById['experiment-proportion'].allowedTools.ratioSize,true);
 assert.equal(phase6cDefinitionsById['experiment-proportion'].allowedTools.size,false);
});

test('simplicity cannot add or duplicate and protected core still cannot be deleted',()=>{
 const def=phase6cDefinitionsById['experiment-simplicity'];
 assert.equal(def.allowedTools.addShape,false); assert.equal(def.allowedTools.duplicate,false);
 const engine=new ConstrainedGeometryEngine({allowedTools:def.allowedTools,elements:def.initialState.elements,nonDeletableElementIds:def.initialState.coreElementIds});
 assert.equal(engine.add('circle').changed,false); assert.equal(engine.duplicate(def.initialState.elements[0].id).changed,false);
 assert.equal(engine.delete(def.initialState.coreElementIds[0]).reason,'protected-element');
});

test('first nine reset to empty while simplicity resets to an independent official clone',()=>{
 const course=createPhase6cCourseState(phase6cDefinitions);
 for(const def of phase6cDefinitions){ const state=getExperimentState(course,def.id); state.workingElements=[{id:'temp'}]; resetPhase6cExperiment(course,def); const resetState=getExperimentState(course,def.id); if(def.principleId==='simplicity'){assert.deepEqual(resetState.workingElements,def.initialState.elements);assert.notEqual(resetState.workingElements,def.initialState.elements);}else assert.deepEqual(resetState.workingElements,[]); }
});

test('fixtures are not used as formal initial artwork',()=>{
 for(const def of phase6cDefinitions.filter(d=>d.principleId!=='simplicity')) assert.deepEqual(def.initialState.elements,[]);
 assert.ok(phase6cDefinitionsById['experiment-simplicity'].initialState.elements.length>0);
});

test('student renderer exposes add buttons from addShape and simplicity displays three optional methods',()=>{
 const source=fs.readFileSync(new URL('../experiment-course.js',import.meta.url),'utf8');
 assert.match(source,/addShapeControlsMarkup\(definition\.allowedTools\)/); assert.match(source,/data-add-shape/);
 assert.match(source,/不一定每一種都要使用/); assert.match(source,/核心元素要保留下來/);
});

test('addShape alone controls the formal student add-shape row',()=>{
 const controls=addShapeControlsMarkup({addShape:true,shape:false});
 assert.match(controls,/新增造形/);
 for(const shape of ['circle','square','triangle','rectangle','semicircle']) assert.match(controls,new RegExp(`data-add-shape="${shape}"`));
 assert.equal(addShapeControlsMarkup({addShape:false,shape:true}),'');
 assert.equal(addShapeControlsMarkup({shape:true}),'');
});

test('the first nine formal experiments can add their first element',()=>{
 for(const def of phase6cDefinitions.filter((item)=>item.principleId!=='simplicity')){
  assert.equal(def.allowedTools.addShape,true,def.principleId);
  const engine=new ConstrainedGeometryEngine({allowedTools:def.allowedTools,elements:[]});
  const result=engine.add('circle',{x:500,y:300});
  assert.equal(result.changed,true,def.principleId);
  assert.equal(engine.getState().elements.length,1,def.principleId);
  assert.equal(engine.getState().elements[0].shape,'circle',def.principleId);
  assert.equal(engine.getState().selectedId,engine.getState().elements[0].id,def.principleId);
 }
 const simplicity=phase6cDefinitionsById['experiment-simplicity'];
 assert.equal(addShapeControlsMarkup(simplicity.allowedTools),'');
 const engine=new ConstrainedGeometryEngine({allowedTools:simplicity.allowedTools,elements:simplicity.initialState.elements});
 assert.equal(engine.add('circle').changed,false);
});

test('landscape task row grows with content instead of clipping rhythm copy',()=>{
 const css=fs.readFileSync(new URL('../phase6c.css',import.meta.url),'utf8');
 assert.match(css,/grid-template-rows:54px minmax\(44px,auto\) minmax\(0,1fr\)/);
 assert.match(css,/\.experiment-task\{min-height:0;overflow:visible\}/);
 assert.match(phase6cDefinitionsById['experiment-rhythm'].task,/位置、方向、大小或間距變化/);
});

test('tablet touch and bounded workspace contracts remain present',()=>{
 const css=fs.readFileSync(new URL('../phase6c.css',import.meta.url),'utf8');
 assert.match(css,/experiment-workspace,.experiment-workspace.no-right-tools\{height:100%;min-height:0;max-height:100%;overflow:hidden/);
 assert.match(css,/experiment-tool-panel\{height:100%;min-height:0;max-height:100%[^}]*overflow-y:auto/);
 assert.match(css,/experiment-side-group button\{min-width:48px;min-height:48px/);
});