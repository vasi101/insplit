const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { restoreFirebaseConfig } = require('../scripts/restore-firebase-config.cjs');

test('release build rejects missing, malformed, and debug-only Firebase configuration', () => {
  for (const value of [undefined, '', 'invalid', 'null', JSON.stringify({
    project_info: { project_number: '123' },
    client: [{ client_info: { android_client_info: { package_name: 'com.insplit.app.debug' } } }],
  })]) {
    assert.throws(() => restoreFirebaseConfig(value, 'unused'), /GOOGLE_SERVICES_JSON/);
  }
});

test('restores valid release configuration in the variant directory', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'insplit-firebase-'));
  try {
    const config = {
      project_info: { project_number: '123' },
      client: [{ client_info: { mobilesdk_app_id: 'test-app',
        android_client_info: { package_name: 'com.insplit.app' } },
        api_key: [{ current_key: 'test-key' }] }],
    };
    const destination = path.join(directory, 'release/google-services.json');
    restoreFirebaseConfig(JSON.stringify(config), destination);
    assert.deepEqual(JSON.parse(fs.readFileSync(destination, 'utf8')), config);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
