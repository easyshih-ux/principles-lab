export const LEGACY_DEFAULT_ACADEMIC_YEAR = '115';
export const ACTIVE_ACADEMIC_YEAR = LEGACY_DEFAULT_ACADEMIC_YEAR;

export function normalizeAcademicYear(value) {
  const academicYear = String(value ?? '').trim();
  if (!/^\d{2,4}$/.test(academicYear) || Number(academicYear) <= 0) {
    throw new TypeError('請輸入有效的純數字學年度。');
  }
  return academicYear;
}

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
