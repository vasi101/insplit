const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createStore } = require('zustand/vanilla');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const item = (roomId, id = roomId) => ({ _id: id, roomId, isActive: true });
function setup() {
  const room = createStore(() => ({ currentRoom: { _id: 'a' } }));
  const auth = createStore(() => ({ user: { _id: 'user' }, isAuthenticated: true }));
  const requests = [], mutations = [];
  let handlers;
  const mocks = {
    zustand: { create: createStore },
    './room.store': { useRoomStore: room },
    './auth.store': { useAuthStore: auth },
    '../services/api/client': { extractErrorMessage: error => error.message },
    '../services/socket/socket.service': { registerSocketHandlers: value => { handlers = value; } },
    '../services/api/inventory.api': {
      getItemsByRoom: roomId => { const gate = deferred(); requests.push({ roomId, ...gate }); return gate.promise; },
      addItem: payload => { const gate = deferred(); mutations.push({ payload, ...gate }); return gate.promise; },
      deleteItem: async () => { mutations.push('delete'); },
    },
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/store/inventory.store.ts'), 'utf8');
  new Function('require', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(name => mocks[name], exports);
  return { store: exports.useInventoryStore, requests, mutations, handlers, room, auth };
}

test('room switch clears immediately and ignores the previous room response and socket events', async () => {
  const { store, room, requests, handlers } = setup();
  const first = store.getState().fetchItems('a');
  handlers.onInventoryCreated(item('a'));
  room.setState({ currentRoom: { _id: 'b' } });
  assert.deepEqual(store.getState().items, []);
  const second = store.getState().fetchItems('b');
  requests[1].resolve([item('b'), item('a')]);
  await second;
  requests[0].resolve([item('a')]);
  await first;
  handlers.onInventoryCreated(item('a', 'late'));
  assert.deepEqual(store.getState().items, [item('b')]);
  await assert.rejects(store.getState().deleteItem('a'), /selected room/);
});

test('late errors cannot replace current room loading state', async () => {
  const { store, room, requests } = setup();
  const first = store.getState().fetchItems('a');
  room.setState({ currentRoom: { _id: 'b' } });
  const second = store.getState().fetchItems('b');
  requests[0].reject(new Error('old room failure'));
  await first;
  assert.equal(store.getState().error, null);
  assert.equal(store.getState().isLoading, true);
  requests[1].resolve([]);
  await second;
});

test('logout clears inventory and invalidates pending fetches and mutations', async () => {
  const { store, auth, requests, mutations } = setup();
  const fetching = store.getState().fetchItems('a');
  const adding = store.getState().addItem({ roomId: 'a' });
  auth.setState({ user: null, isAuthenticated: false });
  requests[0].resolve([item('a')]);
  mutations[0].resolve(item('a', 'created'));
  await Promise.all([fetching, adding]);
  assert.deepEqual(store.getState().items, []);
  assert.equal(store.getState().roomId, null);
});

test('switching away and back cannot apply a previous mutation or fetch', async () => {
  const { store, room, requests, mutations } = setup();
  const oldFetch = store.getState().fetchItems('a');
  const adding = store.getState().addItem({ roomId: 'a' });
  room.setState({ currentRoom: { _id: 'b' } });
  room.setState({ currentRoom: { _id: 'a' } });
  const fresh = store.getState().fetchItems('a');
  requests[1].resolve([item('a', 'fresh')]);
  await fresh;
  requests[0].resolve([item('a', 'stale')]);
  mutations[0].resolve(item('a', 'old-mutation'));
  await Promise.all([oldFetch, adding]);
  assert.deepEqual(store.getState().items, [item('a', 'fresh')]);
});
