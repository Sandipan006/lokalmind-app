# Next development phases

Short backlog for features not in the current App Store / OSS cut. **Do not add privacy usage strings until the feature ships** - Apple expects `Info.plist` keys to match real permission prompts.

## Voice input (STT)

- Implement `whisper.rn` in `src/infrastructure/whisper/whisperRnAdapter.ts` (replace Phase 3 stubs).
- Wire UI (mic button, recording) and pass transcript into chat composer.
- **When enabling microphone:** add `NSMicrophoneUsageDescription` to `app.json` → `expo.ios.infoPlist` with a clear user-facing reason. Same for Android if using `RECORD_AUDIO`.
- Revisit `expo-av` usage - any code path that records or session-configures audio may require the same disclosure.

## Image / document understanding (OCR & attachments)

- Choose stack (e.g. VisionKit / ML Kit / on-device OCR) and add **photo library** or **camera** usage only if users pick images.
- **When enabling camera:** `NSCameraUsageDescription`.
- **When reading the photo library:** `NSPhotoLibraryUsageDescription` (and iOS 14+ limited-library variants if applicable).
- Keep attachments local-only to match the product story; document any new data flows in `SECURITY.md` if needed.

## Misc

- Add automated tests for high-value use cases (`ResolveInitialRouteUseCase`, download/model flows, chat send) as contributors grow.
- Optional: feature-flag incomplete adapters so stubs never ship in production builds.
