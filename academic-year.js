export const ACTIVE_ACADEMIC_YEAR = '115';

export function buildStudentKey(academicYear, classId, seatNo) {
  const normalizedAcademicYear = String(academicYear);
  const normalizedClassId = String(classId);
  const normalizedSeatNo = Number(seatNo);
  if (!/^\d+$/.test(normalizedAcademicYear)
    || !/^\d{3}$/.test(normalizedClassId)
    || !Number.isInteger(normalizedSeatNo)
    || normalizedSeatNo <= 0) return null;
  return `${normalizedAcademicYear}-${normalizedClassId}-${normalizedSeatNo}`;
}
