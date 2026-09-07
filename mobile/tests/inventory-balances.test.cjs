const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/utils/inventory-balances.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const loaded = { exports: {} };
new Function('exports', 'require', 'module', compiled.outputText)(loaded.exports, require, loaded);
const { inventoryBalances } = loaded.exports;
const members = ['A', 'B'].map(id => ({ userId: { _id: id, name: id }, status: 'ACTIVE' }));
const entry = (name, quantity, addedBy, extra = {}) => ({ name, quantity, addedBy, unit: 'kg', roomId: 'room', isActive: true, status: 'VERIFIED', ...extra });
const balance = entries => inventoryBalances(entries, members, 'room');

test('grams and kg settle as the same item regardless of entry order', () => {
  for (const entries of [
    [entry('Rice', 500, 'B', { unit: 'g' }), entry('Rice', 2, 'A'), entry('Rice', 1, 'B')],
    [entry('Rice', 2, 'A'), entry('Rice', 1, 'B'), entry('Rice', 500, 'B', { unit: 'g' })],
  ]) {
    const result = balance(entries);
    assert.equal(result.length, 1);
    assert.equal(result[0].unit, 'kg');
    assert.equal(result[0].total, 3.5);
    assert.equal(result[0].people[1].remaining, 0.5);
  }
});

test('oil packets and liters never cancel each other', () => {
  const result = balance([entry('Oil', 3, 'A', { unit: 'packets' }), entry('Oil', 2, 'B', { unit: 'L' })]);
  assert.equal(result.length, 2);
  assert.equal(result.find(group => group.unit === 'packets').people[1].remaining, 3);
  assert.equal(result.find(group => group.unit === 'L').people[0].remaining, 2);
});

test('null populated users do not crash or create obligations for missing roommates', () => {
  const result = inventoryBalances([
    entry('Rice', 95, { _id: 'A', name: 'A' }),
    entry('Rice', 30, 'B'),
    entry('Rice', 200, null),
  ], [...members, { userId: null, status: 'ACTIVE' }], 'room');
  assert.deepEqual(result[0].people.map(p => p.remaining), [0, 65]);
  assert.equal(result[0].total, 325);
  assert.equal(result[0].entries.length, 3);
});

test('only missing user references still preserve delivery history and totals', () => {
  const result = inventoryBalances([entry('Oil', 2, null)], [{ userId: null, status: 'ACTIVE' }], 'room');
  assert.deepEqual(result[0].people, []);
  assert.equal(result[0].target, 0);
  assert.equal(result[0].total, 2);
});

test('95 kg rice minus 30 kg contribution leaves 65 kg; daal and oil settle independently', () => {
  const result = balance([entry('Rice', 95, 'A'), entry(' rice ', 30, 'B'), entry('Daal', 5, 'A'), entry('Oil', 2, 'B', { unit: 'L' })]);
  assert.equal(result.find(g => g.item.name === 'Rice').people[1].remaining, 65);
  assert.equal(result.find(g => g.item.name === 'Daal').people[1].remaining, 5);
  assert.equal(result.find(g => g.item.name === 'Oil').people[0].remaining, 2);
});
test('repeat deliveries settle and exceeding the target reverses the obligation', () => {
  const entries = [entry('Rice', 95, 'A'), entry('Rice', 30, 'B'), entry('Rice', 65, 'B')];
  assert.deepEqual(balance(entries)[0].people.map(p => p.remaining), [0, 0]);
  assert.deepEqual(balance([...entries, entry('Rice', 5, 'B')])[0].people.map(p => p.remaining), [5, 0]);
});
test('pending is provisional, rejected and deleted deliveries and other rooms are excluded', () => {
  const group = balance([entry('Rice', 95, 'A'), entry('Rice', 30, 'B', { status: 'PENDING' }), entry('Rice', 90, 'B', { status: 'REJECTED' }), entry('Rice', 80, 'B', { isActive: false }), entry('Rice', 80, 'B', { roomId: 'other' })])[0];
  assert.equal(group.pending, true);
  assert.equal(group.people[1].remaining, 65);
  assert.equal(group.total, 125);
});
test('empty catalog entries, decimal quantities, units and three active members', () => {
  assert.equal(balance([entry('Oil', 0, 'B')])[0].target, 0);
  assert.equal(balance([entry('Rice', 0.3, 'A'), entry('Rice', 0.1, 'B')])[0].people[1].remaining, 0.2);
  assert.equal(balance([entry('Rice', 3, 'A'), entry('Rice', 1, 'B', { unit: 'packets' })]).length, 2);
  const result = inventoryBalances([entry('Rice', 95, 'A'), entry('Rice', 30, 'B')], [...members, { userId: 'C', status: 'ACTIVE' }, { userId: 'D', status: 'LEFT' }], 'room');
  assert.deepEqual(result[0].people.map(p => p.remaining), [0, 65, 95]);
});
