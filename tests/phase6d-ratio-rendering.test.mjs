import test from 'node:test';
import assert from 'node:assert/strict';
import { ConstrainedGeometryEngine } from '../geometry/constrained-engine.js';
import { getShapeDimensions } from '../geometry/bounds.js';
const base={id:'ratio',shape:'circle',x:500,y:300,size:3,hue:'blue',lightness:3,rotation:0,proportion:1};
test('ratioSize controls exact logical dimensions without changing general sizeLevel',()=>{
 const engine=new ConstrainedGeometryEngine({elements:[base],allowedTools:{ratioSize:true}});
 engine.select('ratio');
 assert.equal(getShapeDimensions(engine.getSelectedElement()).width,40);
 engine.setProperty('proportion',2);
 assert.equal(getShapeDimensions(engine.getSelectedElement()).width,80);
 engine.setProperty('proportion',3);
 assert.equal(getShapeDimensions(engine.getSelectedElement()).width,120);
 assert.equal(engine.getSelectedElement().size,3);
});
