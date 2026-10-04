# Brain Boost Android

The application uses Android Browser Helper / Trusted Web Activity (TWA) to open `https://backboost-skill1.vercel.app` with the same Chrome mobile-responsive layout. It does not bundle a second frontend, rebuild the backend, copy database secrets, append a desktop user agent, disable animations, or apply the old `BrainBoostAndroid` WebView CSS. Native code provides startup, HTTPS connectivity/error checks, retry, and exit confirmation. The browser provides the existing app screens, authentication, web storage, uploads, downloads, media and keyboard behavior.

## Outputs and installation

- `mobile/artifacts/Brain-Boost-debug.apk`: debug APK for development.
- `mobile/artifacts/Brain-Boost-release-unsigned.apk`: unsigned release output; sign before installation.
- `mobile/artifacts/Brain-Boost-release-signed.apk`: signed APK for phone installation.
- `mobile/artifacts/Brain-Boost-release-signed.aab`: signed Android App Bundle for Play Console.
- `public/downloads/brainboost.apk`: the signed release APK exposed through `/android.html` and the direct download URL. No signing key is included.

Android 6+ (minimum SDK 23), target/compile SDK 36. A current TWA-capable browser such as Chrome must be installed. Digital Asset Links must be live and match the APK certificate before Chrome removes the address bar. Unsupported browsers may fall back to a secure Custom Tab. External sites and OAuth providers intentionally show browser security controls.

## Project structure

`android/` is a normal Gradle/Android Studio project. `native/` contains the startup screen sources. `generate.cjs` recreates the Bubblewrap project and calls `customize.cjs`; the latter installs the native startup theme, adaptive icon background, permission declarations, secure link routing and release-signing Gradle configuration. `release-signing.gradle` reads the signing password from the build process environment only.

## Build on this computer

Required tools are installed under the git-ignored `.tools/` directory: Microsoft OpenJDK 17, Android command-line SDK, platform 36, build tools 36.1.0 and Gradle wrapper 8.11.1. Original platform/vendor licences remain in their distributions. No global Java or Android Studio installation was replaced.

From the repository root in PowerShell:

```powershell
./mobile/build.ps1 -Mode Debug
./mobile/build.ps1 -Mode Unsigned
./mobile/build.ps1 -Mode Release
./mobile/build.ps1 -Mode All
```

Direct Gradle builds also work from `mobile/android` with JDK 17 and a configured Android SDK (`local.properties` or `ANDROID_HOME`):

```text
gradlew assembleDebug
gradlew assembleRelease bundleRelease
```

Without `BRAINBOOST_SIGNING_PASSWORD`, release outputs remain unsigned. Signed builds require the existing release keystore at `mobile/.signing/brainboost-release.jks`. Preserve that keystore for future APK updates. This computer stores its password encrypted with Windows DPAPI in `.signing/password.dpapi`; it is readable only by this Windows account. Both files are git-ignored and must never be deployed or committed. Back them up privately; recover the password on this Windows account before moving signing to another computer or CI.

The app ID is `app.brainboost.mobile`. A debug APK uses a different certificate from the release APK; production Asset Links currently trust only the release certificate. Do release builds for full-screen phone acceptance testing. Do not replace the release key just to build on another machine. For Play App Signing, add the Play Console app-signing certificate fingerprint to `public/.well-known/assetlinks.json` before testing the Play-installed version.

To regenerate native files, install the pinned generator (`npm ci --prefix mobile`) and run `node mobile/generate.cjs`, then build again. Bubblewrap is a development generator only, not shipped in the APK. Its upstream npm dependency audit currently reports unresolved development-tool advisories; only trusted project manifests/images and official SDK archives were used. No automatic package downgrade or unrelated application dependency changes were applied.

## Authentication and links

Website auth uses the same secure browser cookies and local storage as the HTTPS website. This avoids Google's embedded-WebView OAuth restriction. Supabase Google login redirects to the existing website root; Chrome handles the provider UI and returns to the verified website. No new OAuth provider/client was invented, and no auth tokens pass through a custom native JavaScript bridge.

App Links handle HTTPS URLs on the owned host. The native entry checks HTTPS, host, port and user info. Internal SPA navigation keeps using the site's existing history/popstate behavior. Browser Back traverses that history; at the end of browser history it returns to the native Continue/exit screen, where a second Back exits. Rotation does not deliberately reload the website. Chrome owns keyboard resize, safe-area layout and file/media runtime permission prompts. Camera/microphone/gallery permissions are requested through Chrome when the website uses those APIs; no broad storage or unconditional camera permissions are declared by this wrapper.

## Offline and security

Startup checks connectivity and a strict HTTPS connection (15-second timeouts), rejecting SSL failures without bypassing validation. While browsing, the service worker replaces failed/5xx document loads with an offline/server-unavailable page and Retry. Retry preserves the destination and fragment, and forces a real reload when retrying the same URL. API/auth/private data requests are not cached. APK downloads and Digital Asset Links bypass service-worker caching. The frontend theme updates `theme-color` so browser system bars can follow the selected theme.

Camera/video/file picker/browser download features follow current Chrome's Android behavior. Pull-to-refresh, zoom and gestures follow browser/site settings. No global touch handler blocks horizontal swipe or text selection. The app cannot guarantee identical behavior in every alternative browser.

## Notifications

Bubblewrap notification delegation is enabled. The existing notification permission/inbox flow remains in the website; Android/browser permissions still require the user's action. A safe `push` service-worker handler is prepared and notification clicks are restricted to the owned origin. Fully closed/background push sending is **not yet active**: provision authenticated per-device Web Push subscriptions, server-held VAPID keys, account-specific dispatch, unsubscribe/revocation and delivery retries before advertising that capability. No Firebase project or fake FCM configuration was added, and no database migration was required for this wrapper.

## Verification

Run with the website development server:

```text
npm run lint
npm run build
node tests/android-service-worker.cjs
node tests/android-mobile.cjs
```

The browser checks cover 320/360/390/480px phones, 844px landscape, 768/1024px tablets/foldable-sized layouts, both themes, no horizontal overflow on auth, orientation preserving form input, real service-worker offline navigation and successful Retry. They verify that the wrapper launch URL uses the existing Chrome mobile view, not the old native WebView override. These are browser checks, not physical-device tests of the APK.

Built Debug/Release/Unsigned/Bundle outputs; `apksigner verify` passed on signed APKs, `jarsigner -verify` verified the signed bundle. Release certificate matches the published Digital Asset Links. APK manifest inspection confirms min SDK 23, target SDK 36, correct app name, HTTPS-only links and no backend credentials. Legacy packaging metadata warnings from Android/JAR verification are recorded in build logs; they are not a claim of Play Store approval.

No Android phone or emulator was connected (`adb devices` empty). Still required before a production launch: install the **signed release APK** on a real phone; confirm full-screen origin verification, Google login/callback, registration/login/reopen session, file/camera/gallery/PDF upload, microphone/voice, download/open file, keyboard/send controls, fullscreen video/audio, Back/second-Back exit, rotate/fold, notification permissions and denied-permission handling. Login/Google account, real hardware and OS prompts were not simulated as a successful device test. Existing website/backend tests do not establish these Android acceptance results. The generated APK is ready for this device testing; store publication is not performed.
