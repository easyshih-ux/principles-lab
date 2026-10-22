import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCheckpointData, FREE_REVIEW_PRINCIPLE_CHECKPOINTS, FREE_REVIEW_PRINCIPLE_IDS, STUDENT_PROGRESS_CHECKPOINTS, writeStudentProgressCheckpoint } from '../student-progress-cloud.js';
import { FREE_REVIEW_SEGMENTS, summarizeTeacherProgress, activeTeacherClassrooms } from '../teacher-progress-dashboard.js';
import { teacherPageMarkup } from '../teacher-page.js';
import { principles } from '../data.js';

// 10/22: one cloud mark per free-practice principle, and the teacher sees 01–03 / 04–06 / 07–10.
const classroom = { id: '701', validSeatNumbers: [1, 2, 3, 4] };
const record = (seatNo, fields) => ({ academicYear: '115', classId: '701', seatNo, studentKey: `115-701-${seatNo}`, ...fields });
const marks = (ids) => Object.fromEntries(ids.map((id) => [`freeReview_${id}`, true]));

test('principle marks follow the free-practice order 01–10; the four old marks are unchanged', () => {
  assert.deepEqual(FREE_REVIEW_PRINCIPLE_IDS, principles.map(({ id }) => id));
  assert.deepEqual(STUDENT_PROGRESS_CHECKPOINTS, ['freeReviewComplete', 'level1Complete', 'level2Complete', 'level3Complete']);
  assert.deepEqual(FREE_REVIEW_SEGMENTS.map(({ label, checkpoints }) => [label, checkpoints.length]), [['01–03', 3], ['04–06', 3], ['07–10', 4]]);
});

test('a principle mark writes only that one field as true, nothing about the artwork', async () => {
  const data = buildCheckpointData({ classId: '701', seatNo: 12, academicYear: '115' }, 'freeReview_gradation', 'T');
  assert.deepEqual(Object.keys(data).sort(), ['academicYear', 'classId', 'freeReview_gradation', 'seatNo', 'studentKey', 'updatedAt']);
  assert.equal(data.freeReview_gradation, true);
  const writes = [];
  const client = { auth: { currentUser: { uid: 'u' } }, db: {}, doc: (_db, c, id) => `${c}/${id}`, setDoc: async (ref, d, o) => { writes.push({ ref, d, o }); }, serverTimestamp: () => 'T' };
  const result = await writeStudentProgressCheckpoint({ classId: '701', seatNo: 12, academicYear: '115' }, 'freeReview_symmetry', { client });
  assert.equal(result.ok, true);
  assert.deepEqual(writes[0].o, { merge: true });
  assert.throws(() => buildCheckpointData({ classId: '701', seatNo: 12 }, 'freeReview_painting', 'T'));
});

test('the site writes the principle mark right when a principle is finished', () => {
  const source = readFileSync(new URL('../renderers.js', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('function completeFreeReviewPrinciple'), source.indexOf('function bindClassroomControls'));
  assert.ok(block.indexOf('markFreeReviewPrincipleComplete') < block.indexOf('onCheckpoint(`freeReview_${principleId}`)'));
  assert.ok(block.indexOf('onCheckpoint(`freeReview_${principleId}`)') < block.indexOf("onCheckpoint('freeReviewComplete')"));
});

test('segments count students per part; the old free-practice mark counts for every part', () => {
  const summary = summarizeTeacherProgress(classroom, [
    record(1, marks(['repetition', 'gradation', 'symmetry'])),
    record(2, marks(['repetition', 'gradation'])),
    record(3, { freeReviewComplete: true }),
    record(4, marks(FREE_REVIEW_PRINCIPLE_IDS))
  ], '115');
  const [first, second, third] = summary.segments;
  assert.deepEqual(first.completedSeats, [1, 3, 4]);
  assert.deepEqual(first.pendingSeats, [2]);
  assert.deepEqual(second.completedSeats, [3, 4]);
  assert.deepEqual(third.completedSeats, [3, 4]);
  // All ten principle marks count as finishing free practice, even without the old mark.
  assert.deepEqual(summary.completedSeats.freeReviewComplete, [3, 4]);
  assert.deepEqual(summary.pendingSeats.freeReviewComplete, [1, 2]);
});

test('the free-practice card shows the three parts, each opening to unfinished then finished seats', () => {
  const summary = summarizeTeacherProgress(classroom, [record(1, marks(['repetition', 'gradation', 'symmetry']))], '115');
  const dashboard = { academicYear: '115', classrooms: activeTeacherClassrooms([classroom]), selectedClassId: '701', status: 'success', summary, error: '' };
  const closed = teacherPageMarkup({ user: { uid: 't' }, authorization: 'authorized', dashboard, expandedCheckpoints: new Set(['freeReviewComplete']) });
  assert.match(closed, /分段進度/);
  assert.match(closed, /01–03<\/strong> 反覆・漸層・對稱　<b>1<\/b> 人完成 （未完成 3 人）▾/);
  assert.match(closed, /04–06<\/strong> 均衡・對比・律動　<b>0<\/b> 人完成/);
  assert.match(closed, /07–10<\/strong> 比例・統一・調和・單純/);
  const open = teacherPageMarkup({ user: { uid: 't' }, authorization: 'authorized', dashboard, expandedCheckpoints: new Set(['freeReviewComplete', 'freeReviewSegment1']) });
  const part = open.slice(open.indexOf('01–03'), open.indexOf('04–06'));
  assert.ok(part.indexOf('未完成') < part.indexOf('已完成'));
  assert.match(part, /teacher-seat-chips-pending[\s\S]*>02<[\s\S]*>03<[\s\S]*>04</);
  // Other cards do not show the parts.
  const level1 = teacherPageMarkup({ user: { uid: 't' }, authorization: 'authorized', dashboard, expandedCheckpoints: new Set(['level1Complete']) });
  assert.doesNotMatch(level1, /分段進度/);
});
