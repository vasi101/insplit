const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function loadUpdates(release) {
  const alerts = [], urls = [], queries = [];
  const loaded = { exports: {} };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/updates.ts'), 'utf8');
  const mocks = {
    'react-native': { Platform: { OS: 'android' }, Alert: { alert: (...args) => alerts.push(args) }, Linking: { openURL: async url => urls.push(url) } },
    'expo-application': { nativeBuildVersion: '5' },
    './api/client': { apiClient: { get: async (...args) => { queries.push(args); return { data: { data: { release } } }; } } },
  };
  new Function('require', 'exports', '__DEV__', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText)(name => mocks[name], loaded.exports, true);
  return { ...loaded.exports, alerts, urls, queries };
}
test('newer native build prompts once, includes notes, and opens the download on Update', async () => {
  const service = loadUpdates({ version: '1.2.0', versionCode: 6, notes: 'Fixes', downloadUrl: 'https://example.com/app.apk' });
  await service.checkForUpdate();
  await service.checkForUpdate();
  assert.equal(service.alerts.length, 1);
  assert.equal(service.alerts[0][1], 'Fixes');
  assert.equal(service.queries[0][1].params.channel, 'development');
  service.alerts[0][2][1].onPress();
  assert.deepEqual(service.urls, ['https://example.com/app.apk']);
  await service.checkForUpdate(true);
  assert.equal(service.alerts.length, 2);
});
test('equal/older builds and unsafe links never prompt', async () => {
  for (const [versionCode, downloadUrl] of [[5, 'https://example.com'], [4, 'https://example.com'], [6, 'javascript:alert(1)']]) {
    const service = loadUpdates({ versionCode, downloadUrl });
    await service.checkForUpdate();
    assert.equal(service.alerts.length, 0);
  }
});
