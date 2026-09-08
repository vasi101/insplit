const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function setup() {
  let token = 'first';
  const sockets = [];
  const mocks = {
    'socket.io-client': { io: (_url, options) => {
      const listeners = {};
      const socket = {
        options, listeners, connected: false, active: true, emitted: [], connects: 0,
        on: (event, fn) => { listeners[event] = fn; },
        emit: (...args) => socket.emitted.push(args),
        connect: () => { socket.connects++; socket.active = true; },
        disconnect: () => { socket.connected = false; socket.active = false; },
      };
      sockets.push(socket);
      return socket;
    } },
    '../../../constants/api': { API_CONFIG: { BASE_URL: 'http://localhost:5000', HAS_ENV_OVERRIDE: true } },
    '../../utils/storage': { getAccessToken: async () => token, getCustomBaseUrl: async () => null },
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/services/socket/socket.service.ts'), 'utf8');
  new Function('require', 'exports', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)(name => mocks[name], exports);
  return { service: exports, sockets, setToken: value => { token = value; } };
}

test('concurrent calls and reconnects reuse one socket with fresh credentials', async () => {
  const { service, sockets, setToken } = setup();
  await Promise.all([service.connectSocket(), service.connectSocket()]);
  await service.connectSocket();
  assert.equal(sockets.length, 1);
  const socket = sockets[0];
  assert.equal(socket.options.reconnectionAttempts, Infinity);
  setToken('refreshed');
  assert.deepEqual(await new Promise(socket.options.auth), { token: 'refreshed' });
  socket.active = false;
  await service.connectSocket();
  assert.equal(socket.connects, 1);
  assert.equal(sockets.length, 1);
});

test('reconnect rejoins room and signals catch-up; switching leaves old room', async () => {
  const { service } = setup();
  service.joinSocketRoom('a');
  const socket = await service.connectSocket();
  let syncs = 0;
  const unsubscribe = service.subscribeSocketConnect(() => { syncs++; });
  socket.connected = true;
  socket.listeners.connect();
  service.joinSocketRoom('b');
  socket.listeners.connect();
  assert.deepEqual(socket.emitted, [['join:room', 'a'], ['leave:room', 'a'], ['join:room', 'b'], ['join:room', 'b']]);
  assert.equal(syncs, 2);
  unsubscribe();
  socket.listeners.connect();
  assert.equal(syncs, 2);
});

test('logout cancels pending socket initialization', async () => {
  const { service, sockets } = setup();
  const pending = service.connectSocket();
  service.disconnectSocket();
  assert.equal(await pending, null);
  assert.equal(sockets.length, 0);
});
