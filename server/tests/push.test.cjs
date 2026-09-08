const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadPush() {
  const sent = [], removed = [];
  class Expo {
    static isExpoPushToken(token) { return /^ExpoPushToken\[.+\]$/.test(token); }
    chunkPushNotifications(messages) { return [messages.slice(0, 100), messages.slice(100)].filter(x => x.length); }
    async sendPushNotificationsAsync(messages) {
      sent.push(...messages);
      return messages.map(m => m.to === 'ExpoPushToken[100]' ?
        { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } } : { status: 'ok', id: 'receipt' });
    }
  }
  const loaded = { exports: {} };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/notifications/push.service.ts'), 'utf8');
  new Function('require', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText)(name =>
    name === 'expo-server-sdk' ? Expo : { User: { updateMany: async (...args) => removed.push(args) } }, loaded.exports);
  return { ...loaded.exports, sent, removed };
}

test('deduplicates devices and removes the correct invalid token in the second chunk', async () => {
  const service = loadPush();
  const tokens = Array.from({ length: 101 }, (_, i) => `ExpoPushToken[${i}]`);
  await service.sendPushNotifications([...tokens, tokens[0], 'invalid'], { title: 'Expense', body: 'Test', data: { transactionId: 'abc' } });
  assert.equal(service.sent.length, 101);
  assert.equal(service.sent[0].channelId, 'insplit-chime-v1');
  assert.equal(service.sent[0].sound, 'insplit_chime.wav');
  assert.equal(service.removed[0][1].$pull.pushTokens, tokens[100]);
  assert.deepEqual(service.sent[0].data, { transactionId: 'abc' });
});

test('keeps legacy registrations and all distinct devices', () => {
  const service = loadPush();
  assert.deepEqual(service.userPushTokens({ pushToken: 'one', pushTokens: ['one', 'two'] }), ['one', 'two']);
  assert.deepEqual(service.userPushTokens({}), []);
});
