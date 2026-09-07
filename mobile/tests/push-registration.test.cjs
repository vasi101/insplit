const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('logout waits for an in-flight registration before removing its token', async () => {
  const events = [];
  let stored = null;
  let finishRegistration;
  const gate = new Promise(resolve => { finishRegistration = resolve; });
  const mocks = {
    '@react-native-async-storage/async-storage': {
      getItem: async () => stored,
      setItem: async (_key, value) => { stored = value; },
      removeItem: async () => { stored = null; },
    },
    './api/auth.api': { updatePushToken: async token => { events.push(['register', token]); await gate; } },
    './api/client': { apiClient: { delete: async (_url, options) => events.push(['remove', options.data.pushToken]) } },
  };
  const loaded = { exports: {} };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/push-registration.ts'), 'utf8');
  new Function('require', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText)(name => mocks[name], loaded.exports);
  const registering = loaded.exports.registerPushToken('device');
  const loggingOut = loaded.exports.unregisterPushToken();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, [['register', 'device']]);
  finishRegistration();
  await Promise.all([registering, loggingOut]);
  assert.deepEqual(events, [['register', 'device'], ['remove', 'device']]);
  assert.equal(stored, null);
});
