import test from 'node:test';
import assert from 'node:assert/strict';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';
import { GeometryControlPanel } from '../geometry/control-panel.js';
import { getShapeDimensions } from '../geometry/bounds.js';
import { createValidatorPayload } from '../geometry/constrained-tools.js';

const element=(id,values={})=>({id,shape:'circle',x:500,y:300,size:3,hue:'blue',lightness:3,rotation:0,proportion:1,...values});
const engineFor=(elements=[element('ratio')])=>new ConstrainedGeometryEngine({elements,allowedTools:{ratioSize:true,duplicate:true}});

test('ratio levels 1 2 3 map selected element to 40 80 120 logical units',()=>{
 const engine=engineFor(); engine.select('ratio');
 for(const [ratioLevel,logicalSize] of [[1,40],[2,80],[3,120]]){
  engine.setProperty('ratioLevel',ratioLevel);
  const selected=engine.getSelectedElement();
  assert.equal(selected.ratioLevel,ratioLevel); assert.equal(selected.proportion,ratioLevel);
  assert.equal(selected.logicalSize,logicalSize); assert.equal(getShapeDimensions(selected).width,logicalSize);
 }
});

test('canvas dimensions visibly change both 1 to 3 and 3 to 1',()=>{
 const engine=engineFor(); engine.select('ratio');
 engine.setProperty('ratioLevel',1); const small=getShapeDimensions(engine.getSelectedElement()).width;
 engine.setProperty('ratioLevel',3); const large=getShapeDimensions(engine.getSelectedElement()).width;
 assert.equal(large/small,3);
 engine.setProperty('ratioLevel',1); assert.equal(getShapeDimensions(engine.getSelectedElement()).width,small);
});

test('ratio control reflects each selected element state instead of the last click',()=>{
 const engine=engineFor([element('a',{ratioLevel:1,proportion:1}),element('b',{ratioLevel:3,proportion:3})]);
 const panelContext={usableValues:()=>[1,2,3]};
 engine.select('a'); let html=GeometryControlPanel.prototype.proportionMarkup.call(panelContext,engine.getSelectedElement());
 assert.match(html,/selected[^>]*data-property="ratioLevel"[^>]*data-value="1"/);
 engine.select('b'); html=GeometryControlPanel.prototype.proportionMarkup.call(panelContext,engine.getSelectedElement());
 assert.match(html,/selected[^>]*data-property="ratioLevel"[^>]*data-value="3"/);
});

test('duplicate retains ratio state and later changes remain isolated',()=>{
 let sequence=0; const engine=new ConstrainedGeometryEngine({elements:[element('source',{ratioLevel:2,proportion:2})],allowedTools:{ratioSize:true,duplicate:true},idFactory:()=> 'copy-'+(++sequence)});
 engine.select('source'); engine.duplicate(); const copy=engine.getSelectedElement();
 assert.equal(copy.ratioLevel,2); assert.equal(copy.logicalSize,80);
 engine.setProperty('ratioLevel',3);
 assert.equal(engine.getSelectedElement().ratioLevel,3);
 assert.equal(engine.getState().elements.find(item=>item.id==='source').ratioLevel,2);
});

test('working elements and validator payload match the visible ratio state',()=>{
 const engine=engineFor(); engine.select('ratio'); engine.setProperty('ratioLevel',3);
 const workingElements=engine.getState().elements;
 const payload=createValidatorPayload(workingElements);
 assert.equal(workingElements[0].ratioLevel,3); assert.equal(workingElements[0].logicalSize,120);
 assert.equal(payload.elements[0].ratioLevel,3); assert.equal(payload.elements[0].logicalSize,120); assert.equal(payload.elements[0].proportion,3);
});

test('undo restores ratioLevel proportion logicalSize and visual dimensions together',()=>{
 const engine=engineFor(); engine.select('ratio'); engine.setProperty('ratioLevel',3);
 engine.setAllowedTools([...engine.allowedTools,'undo']); engine.undo();
 const selected=engine.getSelectedElement();
 assert.equal(selected.ratioLevel,1); assert.equal(selected.proportion,1); assert.equal(selected.logicalSize,40); assert.equal(getShapeDimensions(selected).width,40);
});

test('ordinary sizeLevel rendering remains unchanged outside ratioSize experiments',()=>{
 const engine=new ConstrainedGeometryEngine({elements:[element('ordinary',{size:5})],allowedTools:{size:true}});
 engine.select('ordinary'); const before=getShapeDimensions(engine.getSelectedElement()).width;
 engine.setProperty('size',1); const after=getShapeDimensions(engine.getSelectedElement()).width;
 assert.equal(before,140); assert.equal(after,36); assert.equal(engine.getSelectedElement().ratioLevel,undefined);
});

test('rectangle preserves shape proportions while using linear ratio size',()=>{
 const engine=engineFor([element('rect',{shape:'rectangle',ratioLevel:2,proportion:2})]); engine.select('rect');
 assert.deepEqual(getShapeDimensions(engine.getSelectedElement()),{width:120,height:80});
});

test('circle square and triangle each retain shape across all ratio levels',()=>{
 for(const shape of ['circle','square','triangle']){
  const engine=engineFor([element(shape,{shape})]); engine.select(shape);
  for(const ratioLevel of [1,2,3]){
   engine.setProperty('ratioLevel',ratioLevel);
   assert.equal(engine.getSelectedElement().shape,shape);
   assert.equal(engine.getSelectedElement().logicalSize,ratioLevel*40);
  }
 }
});

test('mixed shapes and ratio levels coexist independently in either combination',()=>{
 const cases=[[['circle',1],['square',2],['triangle',3]],[['circle',3],['square',1],['triangle',2]]];
 for(const combinations of cases){
  const engine=engineFor(combinations.map(([shape,ratioLevel])=>element(shape,{shape,ratioLevel,proportion:ratioLevel})));
  for(const [shape,ratioLevel] of combinations){
   const item=engine.getState().elements.find(candidate=>candidate.id===shape);
   assert.equal(item.shape,shape); assert.equal(item.ratioLevel,ratioLevel); assert.equal(item.logicalSize,ratioLevel*40);
  }
 }
});

test('proportion delete updates working elements and undo restores the element',()=>{
 const engine=new ConstrainedGeometryEngine({elements:[element('keep',{ratioLevel:1,proportion:1}),element('remove',{ratioLevel:3,proportion:3})],allowedTools:{ratioSize:true,duplicate:true,delete:true}});
 assert.equal(engine.canUse('delete'),true); assert.equal(engine.canUse('undo'),true);
 engine.select('remove'); engine.delete();
 let workingElements=engine.getState().elements; assert.deepEqual(workingElements.map(item=>item.id),['keep']);
 engine.undo(); workingElements=engine.getState().elements;
 assert.deepEqual(workingElements.map(item=>item.id),['keep','remove']); assert.equal(workingElements[1].ratioLevel,3);
});
