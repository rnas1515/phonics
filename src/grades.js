// Grade levels. To add a grade later, add one line here and tag lessons with "grade": N.
export const GRADES = [
  { id: 1, label: '1st grade' },
  { id: 2, label: '2nd grade' },
];
export const DEFAULT_GRADE = 2;
export const gradeLabel = (id) => GRADES.find((g) => g.id === id)?.label || `Grade ${id}`;
export const validGrade = (g) => (GRADES.some((x) => x.id === Number(g)) ? Number(g) : DEFAULT_GRADE);
