/**
 * Calculates age in completed years from a birth date.
 * Mirrors PostgreSQL's EXTRACT(YEAR FROM AGE(birth_date)) semantics.
 */
export function calculateAge(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}