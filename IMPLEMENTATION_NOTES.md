# Implementation Notes

This package was converted from the original React/Vite web prototype into a React Native / Expo mobile application.

Key changes:
- Removed React DOM, Vite, Tailwind, browser `localStorage`, `MediaRecorder`, and Web Speech API dependencies.
- Added Expo SDK 54 / React Native 0.81 mobile client.
- Added `expo-speech-recognition` for native iOS/Android speech-to-text.
- Added AsyncStorage for persistent mobile storage.
- Kept Gemini API access behind an Express backend so the Gemini key is not bundled into the mobile app.
- Added Android emulator and physical-device API URL guidance.
- Added an assessment-focused README and EAS APK preview configuration.
