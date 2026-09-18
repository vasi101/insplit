const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function setup(exists, isAdmin = false) {
  let connected;
  const listeners = {}, joined = [], queries = [];
  class Server {
    use() {}
    on(event, callback) { if (event === 'connection') connected = callback; }
  }
  const mocks = {
    'socket.io': { Server },
    '../config/env': { env: { corsOrigins: [] } },
    '../utils/jwt': {},
    '../modules/rooms/room.model': { Room: { exists: query => { queries.push(query); return exists(query); } } },
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/sockets/socket.server.ts'), 'utf8');
  new Function('require', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(name => mocks[name], exports);
  exports.initSocketServer({});
  connected({ id: 'test', userId: 'user', isAdmin, connected: true,
    on: (name, callback) => { listeners[name] = callback; },
    join: name => joined.push(name), leave: () => {}, });
  return { listeners, joined, queries };
}
const roomId = 'a'.repeat(24);
test('room socket subscription requires active membership; regular users cannot join admin broadcasts', async () => {
  const denied = setup(async () => null);
  await denied.listeners['join:room'](roomId);
  denied.listeners['join:admin']();
  assert.deepEqual(denied.joined, []);
  const allowed = setup(async () => ({ _id: roomId }));
  await allowed.listeners['join:room'](roomId);
  assert.deepEqual(allowed.queries[0], { _id: roomId, members: { $elemMatch: { userId: 'user', status: 'ACTIVE' } } });
  assert.deepEqual(allowed.joined, [`room:${roomId}`]);
  const admin = setup(async () => null, true);
  assert.deepEqual(admin.joined, ['admin:channel']);
});
test('leaving while membership check is pending does not rejoin the old room', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const socket = setup(() => pending);
  const joining = socket.listeners['join:room'](roomId);
  socket.listeners['leave:room'](roomId);
  resolve({ _id: roomId });
  await joining;
  assert.deepEqual(socket.joined, []);
});
