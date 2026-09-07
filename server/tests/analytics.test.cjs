const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/modules/admin/analytics.controller.ts'), 'utf8');
const loaded = { exports: {} };
const stubRequire = name => {
  if (name === 'mongoose') return { isValidObjectId: value => /^[a-f0-9]{24}$/i.test(value) };
  if (name.includes('error.middleware')) return { createError: message => new Error(message) };
  return {};
};
new Function('exports', 'require', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText)(loaded.exports, stubRequire);
const { analyticsFilters } = loaded.exports;
const valid = { from: '2026-09-06T18:15:00.000Z', to: '2026-09-13T18:15:00.000Z', timezone: 'Asia/Kathmandu', group: 'week' };
test('keeps explicit timezone and end-exclusive weekly boundaries', () => {
  const result = analyticsFilters(valid);
  assert.equal(result.from.toISOString(), valid.from);
  assert.equal(result.to.toISOString(), valid.to);
  assert.equal(result.timezone, 'Asia/Kathmandu');
  assert.equal(result.group, 'week');
  assert.equal(result.currency, 'NPR');
  assert.equal(result.status, 'ALL');
});
test('supports all reporting intervals and transaction filters', () => {
  for (const group of ['day', 'week', 'month', 'year']) {
    const result = analyticsFilters({ ...valid, group, status: 'VERIFIED', category: 'GROCERY', currency: 'USD', roomId: 'a'.repeat(24), page: '2' });
    assert.equal(result.page, 2);
    assert.equal(result.currency, 'USD');
    assert.equal(result.category, 'GROCERY');
    assert.equal(result.status, 'VERIFIED');
  }
});
test('rejects malformed dates, reversed ranges and unbounded requests', () => {
  for (const change of [{ from: 'bad' }, { to: valid.from }, { from: '2030-01-01' }, { from: '2000-01-01' }]) assert.throws(() => analyticsFilters({ ...valid, ...change }));
});
test('rejects invalid room IDs, timezone, filters, currency and pagination', () => {
  for (const change of [{ roomId: 'invalid' }, { timezone: 'Mars/City' }, { category: 'INVALID' }, { status: 'INVALID' }, { currency: '$sum' }, { group: 'hour' }, { page: 0 }, { page: 1.2 }]) assert.throws(() => analyticsFilters({ ...valid, ...change }));
});
