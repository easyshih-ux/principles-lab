import test from 'node:test';
import assert from 'node:assert/strict';
import { phase6cDefinitionsById } from '../phase6c-definitions.js';
import { phase6cFixtures } from '../phase6c-fixtures.js';
import { validatePhase6cExperiment } from '../phase6c-validators.js';
import { createPhase6cCourseState, submitPhase6cExperiment } from '../phase6c-course-state.js';
import { getExperimentState } from '../experiment-session.js';
import { nextHash } from '../experiment-course.js';

const definition=(id)=>phase6cDefinitionsById['experiment-'+id];
const validate=(id,elements,mode)=>validatePhase6cExperiment(definition(id),{workingElements:elements,selectedExperimentOption:mode});

test('symmetry vertical horizontal and cross fixtures pass',()=>{
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.vertical,'vertical').passed,true);
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.horizontal,'horizontal').passed,true);
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.cross,'cross').passed,true);
});
test('symmetry axis elements do not count and directional mirrors are handled',()=>{
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.axis,'vertical').passed,false);
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.directional,'vertical').passed,true);
});
test('symmetry requires four pairs or two complete four-way orbits',()=>{
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.vertical.slice(0,6),'vertical').primaryDiagnosticCode,'NOT_ENOUGH_SYMMETRY');
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.horizontal.slice(0,6),'horizontal').primaryDiagnosticCode,'NOT_ENOUGH_SYMMETRY');
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.cross.slice(0,4),'cross').primaryDiagnosticCode,'NOT_ENOUGH_SYMMETRY');
 const withAxis=[...phase6cFixtures.symmetry.pass.vertical.slice(0,6),...phase6cFixtures.symmetry.fail.axis];
 assert.equal(validate('symmetry',withAxis,'vertical').passed,false);
});
test('symmetry failures report specific diagnostics',()=>{
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.missing,'vertical').primaryDiagnosticCode,'NO_SYMMETRY_PAIR');
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.position,'vertical').primaryDiagnosticCode,'POSITION_MISMATCH');
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.attribute,'vertical').primaryDiagnosticCode,'ATTRIBUTE_MISMATCH');
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.crossIncomplete,'cross').primaryDiagnosticCode,'CROSS_INCOMPLETE');
});
test('contrast requires coherent size and hue groups while retaining optional shape contrast',()=>{
 for(const mode of ['dual','multiple']) assert.equal(validate('contrast',phase6cFixtures.contrast.pass[mode]).passed,true);
 assert.deepEqual(validate('contrast',phase6cFixtures.contrast.pass.multiple).detectedMethods.slice(0,1),['multiple']);
});
test('contrast (Gate 4C places) rejects too few places, lonely shapes, look-alike neighbours and shape-only differences',()=>{
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.twoPlaces).primaryDiagnosticCode,'NOT_ENOUGH_CONTRASTS');
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.oneCentre).primaryDiagnosticCode,'NOT_ENOUGH_CONTRASTS');
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.lonely).primaryDiagnosticCode,'NO_CONTRAST_NEIGHBOR');
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.sameNeighbours).primaryDiagnosticCode,'CONTRAST_TOO_WEAK');
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.shapeOnly).primaryDiagnosticCode,'CONTRAST_TOO_WEAK');
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.apart).primaryDiagnosticCode,'NO_CONTRAST_NEIGHBOR');
});
test('contrast (Gate 4C places) accepts size only, colour only, or both',()=>{
 assert.deepEqual(validate('contrast',phase6cFixtures.contrast.pass.sizeOnly).detectedMethods,['size']);
 assert.deepEqual(validate('contrast',phase6cFixtures.contrast.pass.colorOnly).detectedMethods,['color']);
 assert.equal(validate('contrast',phase6cFixtures.contrast.pass.teacherFivePairs).passed,true);
});
test('proportion passes ordered unordered and mixed shapes without gradation rules',()=>{
 for(const mode of ['ordered','unordered','mixedShapes']) assert.equal(validate('proportion',phase6cFixtures.proportion.pass[mode]).passed,true);
});
test('proportion incomplete and too few fail specifically',()=>{
 assert.equal(validate('proportion',phase6cFixtures.proportion.fail.incomplete).primaryDiagnosticCode,'RATIO_LEVELS_INCOMPLETE');
 assert.equal(validate('proportion',phase6cFixtures.proportion.fail.tooFew).primaryDiagnosticCode,'TOO_FEW_ELEMENTS');
});
test('new experiments retain explicit review and progression',()=>{
 const course=createPhase6cCourseState(Object.values(phase6cDefinitionsById));
 for(const id of ['symmetry','contrast','proportion']){
  const def=definition(id); const state=getExperimentState(course,def.id);
  state.workingElements=structuredClone(phase6cFixtures[id].pass[Object.keys(phase6cFixtures[id].pass)[0]]);
  if(id==='symmetry') state.selectedExperimentOption='vertical';
  assert.equal(state.completed,false); assert.equal(submitPhase6cExperiment(course,def).result.passed,true);
 }
 assert.equal(nextHash(definition('rhythm')),'#level/experiment/symmetry');
 assert.equal(nextHash(definition('symmetry')),'#level/experiment/contrast');
 assert.equal(nextHash(definition('contrast')),'#level/experiment/proportion');
 assert.equal(nextHash(definition('proportion')),'#level/experiment/unity');
});
