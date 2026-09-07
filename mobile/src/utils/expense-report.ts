export type ReportPeriod = 'DAY' | 'WEEK' | 'MONTH';

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function reportDate(value: string): Date {
  // Date-only values are local calendar dates, not UTC timestamps.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
}

export function getPeriodKey(value: string, period: ReportPeriod): string {
  const date = reportDate(value);
  if (period === 'DAY') return localDateKey(date);
  if (period === 'MONTH') return localDateKey(date).slice(0, 7);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDateKey(date);
}

export function weekDates(value: string): Date[] {
  const monday = reportDate(getPeriodKey(value, 'WEEK'));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}
