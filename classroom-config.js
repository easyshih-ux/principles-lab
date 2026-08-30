const seatRange = (lastSeatNumber) => Object.freeze(
  Array.from({ length: lastSeatNumber }, (_, index) => index + 1)
);

const CURRENT_VALID_SEAT_NUMBERS = seatRange(30);
const classroom = (id, validSeatNumbers = CURRENT_VALID_SEAT_NUMBERS) => Object.freeze({
  id,
  validSeatNumbers: Object.freeze([...validSeatNumbers])
});

// Current official classroom list. Edit only this config when classes or valid seats change.
export const CLASSROOMS = Object.freeze([
  classroom('701'),
  classroom('702'),
  classroom('703'),
  classroom('704'),
  classroom('705'),
  classroom('706'),
  classroom('707'),
  classroom('708'),
  classroom('709'),
  classroom('710'),
  classroom('711'),
  classroom('712'),
  classroom('713'),
  classroom('714'),
  classroom('715')
]);

export function classroomOptions(classrooms = CLASSROOMS) {
  return classrooms.map(({ id }) => ({ value: id, label: `${id} 班` }));
}

export function seatOptions(classId, classrooms = CLASSROOMS) {
  const classroom = classrooms.find(({ id }) => id === String(classId));
  if (!classroom) return [];
  return classroom.validSeatNumbers.slice();
}

export function formatSeatNumber(seatNo) {
  return String(Number(seatNo)).padStart(2, '0');
}

export function isValidStudentIdentity(classId, seatNo, classrooms = CLASSROOMS) {
  return seatOptions(classId, classrooms).includes(Number(seatNo));
}
