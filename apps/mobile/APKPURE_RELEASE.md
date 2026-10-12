# APKPure release checklist

This checklist prepares the Turnify Android APK for a human-authorized APKPure release. It does not upload or publish anything.

## EAS production configuration

- [ ] Configure these EAS `production` environment variable **names** in the intended EAS environment; enter values only through the authorized EAS secret/variable workflow:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_ENABLE_PUSH`
  - `EXPO_PUBLIC_ROUTING_PROVIDER`
  - `EXPO_PUBLIC_OPENROUTESERVICE_KEY` (only when the selected routing provider requires it)
- [ ] Do not configure demo-only flags for production: `EXPO_PUBLIC_SKIP_AUTH` and `EXPO_PUBLIC_DEMO_BUSINESS_ID`.
- [ ] The Supabase anon/publishable key is client-visible by design and protected by RLS. Never put `SUPABASE_SERVICE_ROLE_KEY`, a database password, or an ORS secret value in the APK, repository, or this document.
- [ ] Confirm the production profile uses store distribution, Android `apk`, the `production` EAS environment, and remote version auto-increment.

## Build and validate the artifact

From `apps/mobile`:

```bash
eas build --platform android --profile production
```

- [ ] Download the generated `.apk` only after reviewing the build result.
- [ ] Validate the artifact is an Android APK, has package name `com.esau01s.turnify`, and reports the expected version/version code.
- [ ] Record the artifact checksum and retain the build/version evidence with the release record.

## Clean-device smoke test

- [ ] Install on a clean Android device or emulator with no previous Turnify data.
- [ ] Launch without development tooling and verify the public QR/code entry flow.
- [ ] Scan a valid QR code, browse the business/service flow, take and cancel a turn, and verify live ticket updates.
- [ ] Verify sign-in, registration, profile/history, staff operations, and push notification behavior for the supported test accounts.
- [ ] Deny and later grant camera, location, and notification permissions; confirm the app remains understandable and recovers correctly.
- [ ] Reinstall/update over the previous release and verify persisted-session and migration behavior.

## Privacy and permissions disclosure

- [ ] Publish a privacy policy and data-safety disclosure covering Supabase Auth/profile data, realtime ticket data, device push tokens, camera use for QR scanning, location use for route estimation, and notification use.
- [ ] Explain why each requested Android permission is needed and request it only in the relevant user flow.
- [ ] Confirm the store listing, in-app permission text, and privacy policy are consistent.

## Signing and continuity

- [ ] Verify the Android application ID and signing identity match the existing Turnify release.
- [ ] Preserve the EAS Android keystore and document its secure owner/backup and recovery process.
- [ ] Never rotate, replace, or regenerate the production keystore casually; APKPure updates must be signed with a compatible key.

## APKPure upload and update

- [ ] Prepare the APKPure listing: app name, icon, screenshots, description, category, content rating, privacy policy URL, and support contact.
- [ ] Confirm APKPure accepts the selected APK, version code is greater than the currently published version, and release notes describe the update.
- [ ] For every update, retain the same package name and compatible signing key; increment the Android version code and review permissions and disclosures for changes.
- [ ] Human authorization is required for the final APKPure upload, publication, and any store-side update operation. This repository preparation does not authorize or perform those actions.
