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
test('symmetry axis and directional mirror are handled',()=>{
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.axis,'vertical').passed,true);
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.pass.directional,'vertical').passed,true);
});
test('symmetry failures report specific diagnostics',()=>{
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.missing,'vertical').primaryDiagnosticCode,'NO_SYMMETRY_PAIR');
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.position,'vertical').primaryDiagnosticCode,'POSITION_MISMATCH');
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.attribute,'vertical').primaryDiagnosticCode,'ATTRIBUTE_MISMATCH');
 assert.equal(validate('symmetry',phase6cFixtures.symmetry.fail.crossIncomplete,'cross').primaryDiagnosticCode,'CROSS_INCOMPLETE');
});
test('contrast size color shape and multiple paths pass',()=>{
 for(const mode of ['size','color','shape','multiple']) assert.equal(validate('contrast',phase6cFixtures.contrast.pass[mode]).passed,true);
 assert.deepEqual(validate('contrast',phase6cFixtures.contrast.pass.multiple).detectedMethods.slice(0,1),['multiple']);
});
test('two elements with a strong size difference form a contrast relationship',()=>{
 const result=validate('contrast',phase6cFixtures.contrast.pass['contrast-two-elements-strong-size']);
 assert.equal(result.passed,true);
 assert.deepEqual(result.detectedMethods,['size']);
});
test('contrast weak and unrelated diversity fail',()=>{
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.twoWeak).primaryDiagnosticCode,'DIFFERENCE_TOO_SMALL');
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.identical).primaryDiagnosticCode,'NO_CLEAR_CONTRAST');
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.weak).primaryDiagnosticCode,'DIFFERENCE_TOO_SMALL');
 assert.equal(validate('contrast',phase6cFixtures.contrast.fail.unrelated).primaryDiagnosticCode,'TOO_MANY_UNRELATED_DIFFERENCES');
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
 assert.equal(nextHash(definition('proportion')),'#level/experiment/complete');
});
