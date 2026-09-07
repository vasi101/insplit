# Local Android builds and notifications

Builds run on this computer with Gradle. No EAS Build/cloud build is required.

## Insplit Dev

From `mobile` in PowerShell:

```powershell
npm ci
$env:NODE_ENV = 'development'
npm run build:android:debug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8082
node --max-old-space-size=6144 --dns-result-order=ipv4first node_modules/expo/bin/cli start --localhost --port 8082 --max-workers 2
```

This debug APK uses Metro for JavaScript. Keep Metro running for cold-start tests.
The command above uses IPv4 localhost so USB forwarding can reach Metro on
Windows, with a 6 GB heap and two workers. If the phone remains on the logo,
check the Metro terminal: an `Unable to load script` phone error can mean Metro
is unreachable or has crashed. A successful Gradle build does not start Metro.
Reconnect USB forwarding after reconnecting the phone. For a local backend on
port 5000, also run `adb reverse tcp:5000 tcp:5000` and start that backend.
The launcher name is **Insplit Dev**, package `com.insplit.app.debug`. Production
remains `com.insplit.app`, so the two apps can coexist. Android native files are
checked in; do not run `expo prebuild --clean` without preserving these Gradle changes.

## Firebase setup required for remote push

Register both package IDs as Android apps in your Firebase project. Download each
app's Firebase configuration and place it at:

- Dev: `mobile/android/app/src/debug/google-services.json`
- Production: `mobile/android/app/src/release/google-services.json`

Alternatively put a config containing both Android clients at
`mobile/android/app/google-services.json`. These files are ignored by Git.
The Google Services Gradle plugin is applied when a configuration file exists;
without it the app can build, but Android push registration will fail.

Configure the FCM v1 service-account credential for the existing Expo project
`ee347e05-2b42-4545-b947-fcf85bc2e747` in Expo's credentials dashboard (including
the debug application ID). This configures push transport, not a cloud build.
Never place the service-account private key in the APK or repository.
See [Expo FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/).
If Expo push security is enabled, set `EXPO_ACCESS_TOKEN` on the backend.

Use a physical Android phone, allow notifications, and sign in. Tokens are stored
in MongoDB with the release channel. Registration retries when the app returns
to the foreground and when its native token rotates. Logout removes the current
device token when the backend is reachable; offline logout cannot guarantee
immediate server-side removal. Other devices stay registered.

## Releases

Build production locally from `mobile/android`:

```powershell
$env:NODE_ENV = 'production'
.\gradlew.bat :app:assembleRelease -Pinsplit.versionCode=6 -Pinsplit.versionName=1.2.0 --no-daemon
```

Output: `app/build/outputs/apk/release/app-release.apk`. The existing release
configuration uses the debug signing key. Configure your stable production
keystore before distributing production updates, and retain the same signing
key for every update. Android requires a higher versionCode for each update.

Upload the APK to your HTTPS download/release host, then publish metadata using
an administrator bearer token with `POST /api/releases`:

```json
{
  "channel": "production",
  "version": "1.2.0",
  "versionCode": 6,
  "notes": "Transaction notifications and bug fixes.",
  "downloadUrl": "https://your-download-host.example/insplit-1.2.0.apk",
  "notify": false
}
```

Use `development` for debug APK releases. `notify: true` explicitly broadcasts
to devices registered for that channel. Publication requires an increasing build
number. The app checks `GET /api/releases/latest?channel=production` (or
`development`) on launch and foreground, compares the installed native build
number, and shows version, notes, Later and Update. A release notification tap
rechecks server metadata; it never opens an arbitrary URL from a push payload.

Push delivery is best effort. Immediate Expo ticket errors are logged and
DeviceNotRegistered tokens are removed. Durable broadcast jobs, retries, and
delayed Expo receipt polling are not implemented; an interrupted broadcast can
be incomplete. Publishing metadata still enables in-app discovery.

## Device verification

1. Install production and Dev together; confirm distinct names and package IDs.
2. Sign in as A and B on separate devices and join the same room.
3. With B backgrounded, create an expense as A. B should receive
   “A added Rs. 500 – Groceries.” A should not receive their own creation push.
4. Tap while backgrounded, then repeat with the app closed and Metro reachable.
   Both should open that transaction. Repeat after logging in from a signed-out state.
5. Test another room, multiple devices for B, denied permission, token rotation,
   and online logout. Existing transaction authorization protects detail access.
6. Publish development metadata with a higher build number. Check launch,
   foreground, Later, Update, and an optional release push. Equal/older builds
   must not prompt. Confirm production devices do not receive development announcements.

Automated checks: `npm run typecheck` in both `mobile` and `server`,
`node --test tests/updates.test.cjs tests/push-registration.test.cjs` in mobile and
`node --test tests/push.test.cjs` in server. Physical-device delivery requires the
Firebase configuration and Expo credentials above.
