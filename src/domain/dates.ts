// Local calendar dates ("YYYY-MM-DD"). "別の日" / "1日" are judged on the device's local date.

export type LocalDate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalDate(ms: number): LocalDate {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parts(d: LocalDate): [number, number, number] {
  const [y, m, day] = d.split("-").map(Number);
  return [y, m, day];
}

/** Calendar arithmetic in UTC so month ends, leap years and DST never shift the result. */
export function addDays(d: LocalDate, n: number): LocalDate {
  const [y, m, day] = parts(d);
  const t = new Date(Date.UTC(y, m - 1, day + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** a − b in whole days. */
export function diffDays(a: LocalDate, b: LocalDate): number {
  const [y1, m1, d1] = parts(a);
  const [y2, m2, d2] = parts(b);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86400000);
}

export function weekdayOf(d: LocalDate): number {
  const [y, m, day] = parts(d);
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay();
}
