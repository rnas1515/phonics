# iOS and Android apps (Capacitor wrap)

The web app can be packaged as real iOS and Android apps without rewriting it. Capacitor wraps the built site (`dist/`) in a native shell.

## What is ready
- `capacitor.config.json` points at `dist/`. **Change `appId`** (for example `com.yourcompany.worddetective`) before you create the native projects; it cannot be changed easily later.
- The app already works offline and is built with a relative base path, so it runs from the app bundle.

## Steps (on a Mac for iOS; Android Studio for Android)
1. `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
2. `npm run build`
3. `npx cap add ios` and `npx cap add android` (once), then `npx cap sync` after each build
4. `npx cap open ios` (Xcode) or `npx cap open android` (Android Studio), then run on a device or simulator.
5. Apple Developer Program (about $99/year) and a Google Play developer account (one-time fee) are needed to publish.

## Things to know before publishing
- **Service worker:** it is for the website; inside the app the bundle itself is offline, so skip registering `sw.js` there.
- **Sign-in redirects:** the email confirmation link opens the website, not the app. Fine for now; deep links can come later.
- **Kids rules:** Apple's Kids Category and Google's Families policy require a parental gate for anything outside the app, ban third-party analytics and ads, and require a privacy policy URL. The tutor PIN is a start, but a real parental gate (for example a simple math question) should guard links and the cloud account screen.
- **Accounts:** Apple requires in-app account deletion (built: Settings, Cloud account, Delete my account) and a privacy label in App Store Connect.
- **Voice:** recorded audio plays in the app; the device voice is still the fallback.
- **Review risk:** reviewers test sign-in. Prepare a demo account and a note explaining parent versus child use.
- See `docs/compliance-checklist.md` first.
