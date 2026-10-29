# Everyday native iPhone milestone (v98 groundwork)

**Status:** Capacitor 8 preparation scaffold. This is not a signed or tested iPhone app. The v98 PWA remains the supported production release. Native authentication, automatic local-data migration, HealthKit and signing are not implemented or verified.

## Requirements and boundaries

Capacitor 8 uses Node.js 22+ and Xcode 26+ for building on iOS. Xcode requires macOS, including for signing a build. A Windows computer can prepare the web bundle, but a Mac or cloud Mac environment is needed to compile and verify.

The native app uses a different storage origin from the GitHub Pages PWA. Local browser records do not transfer automatically. Export a JSON backup, confirm the intended Firebase user identity, and verify counts and stable IDs before migrating. Never silently merge notebook copies.

## First-build procedure

1. Run `node scripts/prepare-native.mjs` at the repository root. It reads the existing service-worker asset manifest and copies the offline web app assets plus version metadata to `native/www`. The service-worker file is not copied.
2. In the `native/` directory with Node.js 22+, run `npm install`, then `npm run ios:add`. This creates the local iOS project; it is ignored in v98 until a native build has been validated.
3. On a Mac with Xcode 26+, run `npm run ios:sync` and `npm run ios:open`. Build and launch on a simulator or iPhone using your development team.
4. Check that the app launches and navigation works before importing any real personal data. Record Xcode/Swift Package Manager errors. Validate authentication separately, using an isolated test account.
5. For TestFlight distribution in later releases, enroll in Apple's Developer Program and set up App Store Connect and private testers.

## Gates for v99 and v100

- Native Google sign-in: the current Firebase web signInWithPopup flow is not verified for a WKWebView. Add a native-compatible authentication bridge and check that the resulting Firebase UID matches the existing account before any writes.
- Migration: verify JSON export, cloud recovery, and stable bank IDs, without assuming the PWA's localStorage is available in the native WebView.
- Offline: the app skips service-worker registration when Capacitor identifies the native runtime. The native bundle contains its own assets.
- Lifecycle: test backgrounding, resume, force-close, and pending cloud saves on an actual iPhone.
- Apple Health: require explicit HealthKit permissions and native entitlements. Keep the current Shortcut bridge available until a native bridge is verified.
- Signing: successful web asset packaging is not an Xcode build, and neither is proof of TestFlight eligibility.

Official documentation: https://capacitorjs.com/docs/getting-started , https://capacitorjs.com/docs/ios , https://capacitorjs.com/docs/getting-started/environment-setup
