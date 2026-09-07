const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/utils/expense-report.ts'), 'utf8');
const loaded = { exports: {} };
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(loaded.exports);
const { getPeriodKey, weekDates, localDateKey } = loaded.exports;
test('Monday through Sunday use the same key and next Monday starts a new week', () => {
  const dates = weekDates('2026-09-07');
  assert.deepEqual(dates.map(d => d.getDay()), [1, 2, 3, 4, 5, 6, 0]);
  assert.deepEqual(dates.map(localDateKey), ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13']);
  for (const date of dates) assert.equal(getPeriodKey(localDateKey(date), 'WEEK'), '2026-09-07');
  assert.equal(getPeriodKey('2026-09-14', 'WEEK'), '2026-09-14');
});
test('weekly summary equals chart sum, including Sunday and excluding adjacent weeks', () => {
  const entries = [['2026-09-06', 999], ['2026-09-07', 100], ['2026-09-09', 200], ['2026-09-13', 300], ['2026-09-14', 999]];
  const key = getPeriodKey('2026-09-10', 'WEEK');
  const total = entries.filter(([date]) => getPeriodKey(date, 'WEEK') === key).reduce((sum, [,amount]) => sum + amount, 0);
  const chartTotal = weekDates('2026-09-10').reduce((sum, date) => sum + entries.filter(([value]) => value === localDateKey(date)).reduce((s, [,amount]) => s + amount, 0), 0);
  assert.equal(total, 600);
  assert.equal(chartTotal, total);
});
test('weeks cross month and year boundaries without shifting dates', () => {
  assert.equal(getPeriodKey('2027-01-01', 'WEEK'), '2026-12-28');
  assert.equal(localDateKey(weekDates('2027-01-01')[6]), '2027-01-03');
  assert.equal(getPeriodKey('2026-09-07', 'DAY'), '2026-09-07');
});
