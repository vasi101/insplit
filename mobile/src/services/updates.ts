import { Alert, Linking, Platform } from 'react-native';
import { nativeBuildVersion } from 'expo-application';
import { apiClient } from './api/client';

export const releaseChannel = __DEV__ ? 'development' : 'production';
let shownVersion = 0;
let checking = false;

export async function checkForUpdate(force = false): Promise<void> {
  if (checking || Platform.OS !== 'android') return;
  checking = true;
  try {
    const response = await apiClient.get('/releases/latest', { params: { channel: releaseChannel } });
    const release = response.data.data?.release;
    const installed = Number(nativeBuildVersion);
    if (!Number.isSafeInteger(installed) || installed < 1) return;
    if (!release || !Number.isSafeInteger(release.versionCode) || release.versionCode <= installed ||
        (!force && release.versionCode <= shownVersion) || typeof release.downloadUrl !== 'string' ||
        !release.downloadUrl.startsWith('https://')) return;
    shownVersion = release.versionCode;
    Alert.alert(`Insplit ${release.version} available`, release.notes, [
      { text: 'Later', style: 'cancel' },
      { text: 'Update', onPress: () => { void Linking.openURL(release.downloadUrl).catch(() => {
        Alert.alert('Could not open download', 'Please try again when your browser is available.');
      }); } },
    ]);
  } catch (error) { console.warn('Update check unavailable:', error); }
  finally { checking = false; }
}
