const pad = (n: number) => String(n).padStart(2, '0');

export function todayLocal(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
}

export function currentPeriod(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  return `${year}-${month}`;
}
