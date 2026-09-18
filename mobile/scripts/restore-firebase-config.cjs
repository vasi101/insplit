const fs = require('node:fs');
const path = require('node:path');

function restoreFirebaseConfig(value, destination) {
  if (!value?.trim()) {
    throw new Error('Missing GOOGLE_SERVICES_JSON secret. Supply the release Firebase google-services.json contents.');
  }
  let config;
  try {
    config = JSON.parse(value);
  } catch {
    throw new Error('GOOGLE_SERVICES_JSON must contain valid JSON (not base64).');
  }
  const client = config?.client?.find(item =>
    item.client_info?.android_client_info?.package_name === 'com.insplit.app');
  if (!config?.project_info?.project_number || !client?.client_info?.mobilesdk_app_id ||
      !client.api_key?.some(item => item.current_key)) {
    throw new Error('GOOGLE_SERVICES_JSON must include Firebase configuration for com.insplit.app.');
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(config));
}

module.exports = { restoreFirebaseConfig };

if (require.main === module) {
  try {
    restoreFirebaseConfig(process.env.GOOGLE_SERVICES_JSON,
      path.join(__dirname, '../android/app/src/release/google-services.json'));
    console.log('Release Firebase configuration restored.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
