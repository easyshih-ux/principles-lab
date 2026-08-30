// DEMO classroom data for V2-A1. Replace this list with official classroom data later.
export const DEMO_CLASSROOMS = Object.freeze([
  Object.freeze({ id: '701', seats: 28 }),
  Object.freeze({ id: '702', seats: 27 }),
  Object.freeze({ id: '703', seats: 29 })
]);

export function classroomOptions(classrooms = DEMO_CLASSROOMS) {
  return classrooms.map(({ id }) => ({ value: id, label: `${id} 班` }));
}

export function seatOptions(classId, classrooms = DEMO_CLASSROOMS) {
  const classroom = classrooms.find(({ id }) => id === String(classId));
  if (!classroom) return [];
  return Array.from({ length: classroom.seats }, (_, index) => index + 1);
}

export function isValidStudentIdentity(classId, seatNo, classrooms = DEMO_CLASSROOMS) {
  return seatOptions(classId, classrooms).includes(Number(seatNo));
}
