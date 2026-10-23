const pad = (n: number) => String(n).padStart(2, '0');

export function todayLocal(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}

export function occurrenceInMonth(dayOfMonth: number, year: number, monthIndex: number): string {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const targetDay = Math.min(dayOfMonth, daysInMonth);
  return `${year}-${pad(monthIndex + 1)}-${pad(targetDay)}`;
}
