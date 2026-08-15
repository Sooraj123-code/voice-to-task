# Voice Task AI — React Native Technical Assessment

A React Native mobile voice-to-task application built for the Global Buzz technical assessment.

## What this implements

The app follows the required Option 2 pipeline:

**Voice input → Speech-to-text → AI extraction → Structured task → Local storage → Task list**

Example:

> “Remind me to call John tomorrow at 5 PM.”

The app converts the speech into a structured task containing task title, date, time, status, priority, category, notes, and AI confidence, then persists it with AsyncStorage.

## Why this is React Native

The mobile client is an Expo / React Native application using:

- Expo SDK 54
- React Native 0.81
- React 19.1
- `expo-speech-recognition` for native speech recognition
- `@react-native-async-storage/async-storage` for persistent local storage
- Express + Gemini on a separate backend for secure AI processing

Expo SDK 54 targets React Native 0.81 and React 19.1. Expo's documentation also recommends AsyncStorage for persistent key-value storage. Speech recognition is provided by `expo-speech-recognition`, which uses the native iOS/Android speech APIs and requires a development build because it includes native code.

## Architecture

```text
┌───────────────────────────────┐
│ React Native Mobile App       │
│                               │
│  Microphone                   │
│      ↓                        │
│  Native Speech Recognition   │
│      ↓                        │
│  Transcript                   │
│      ↓                        │
│  REST API                     │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Express Backend               │
│                               │
│  Gemini AI                    │
│      ↓                        │
│  Structured JSON              │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ React Native                  │
│                               │
│  Task card                    │
│      ↓                        │
│  AsyncStorage                 │
└───────────────────────────────┘
```

## Features

- Native microphone / speech recognition
- Live transcript display
- Gemini AI structured extraction
- Relative date understanding such as “tomorrow” and “next Monday”
- Task/date/time extraction
- Priority and category extraction
- Confidence value from AI
- Persistent AsyncStorage
- Task search
- Status cycle: Pending → In Progress → Completed
- Delete tasks
- Backend health indicator
- Loading and error states
- Mobile-first responsive UI

## Project structure

```text
voice-to-task-app/
├── App.tsx / src/App.tsx
├── src/
│   ├── api.ts
│   ├── storage.ts
│   └── types.ts
├── app.json
├── package.json
├── server.ts
├── .env.example
├── eas.json
└── README.md
```

## 1. Prerequisites

- Node.js 20.19+ recommended for Expo SDK 54
- Android Studio + Android SDK for local Android builds, or an EAS development/preview build
- A Gemini API key
- An Android/iOS device or simulator

## 2. Install dependencies

```bash
npm install
```

If you want Expo to verify and align package versions with SDK 54:

```bash
npx expo install
```

## 3. Configure environment variables

Copy `.env.example` to `.env`.

For Android Emulator:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

For a physical Android phone, replace `10.0.2.2` with the LAN IP address of the computer running the backend, for example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000
```

Keep `GEMINI_API_KEY` on the backend. Do not put the Gemini secret directly in the mobile bundle.

## 4. Start the AI backend

Open terminal 1:

```bash
npm run server
```

The backend listens on:

```text
http://localhost:3000
```

Health check:

```text
GET /api/health
```

AI extraction:

```text
POST /api/extract-task
```

## 5. Build and run the React Native app

Because `expo-speech-recognition` contains native speech-recognition code, use a development build rather than relying only on Expo Go.

Android:

```bash
npx expo run:android
```

Or generate native folders first:

```bash
npx expo prebuild
npx expo run:android
```

iOS:

```bash
npx expo run:ios
```

The repository intentionally does not include generated `android/` and `ios/` folders. They can be generated with Expo Prebuild from `app.json` and the installed dependencies.

## 6. Optional EAS preview APK

Install EAS CLI and log in:

```bash
npm install -g eas-cli
eas login
```

Then configure the project and create an Android preview build:

```bash
eas build:configure
eas build --platform android --profile preview
```

The included `eas.json` is configured to produce an installable APK for testing.

## AI extraction example

Input transcript:

```text
Remind me to call John tomorrow at 5 PM. It is important.
```

Possible structured output:

```json
{
  "taskTitle": "Call John",
  "date": "2026-08-16",
  "formattedDate": "16 August 2026",
  "time": "5:00 PM",
  "formattedTime": "5:00 PM",
  "status": "Pending",
  "priority": "High",
  "category": "Call",
  "notes": "",
  "confidence": "High"
}
```

## Assessment requirement mapping

| Requirement | Implementation |
|---|---|
| Capture voice input | `expo-speech-recognition` |
| Convert speech to text | Native iOS/Android speech recognition |
| AI extraction | Express backend + Gemini |
| Extract task/date/time | Gemini structured JSON schema |
| Store task locally | AsyncStorage |
| Structured display | Native React Native task cards |
| Loading indicators | `ActivityIndicator` and processing state |
| Error handling | Speech, network, AI, and permission alerts |
| Clean mobile UI | React Native `StyleSheet` |
| README | This document |

## Third-party libraries / services

- Expo / React Native
- `expo-speech-recognition`
- `@react-native-async-storage/async-storage`
- Express
- Google Gemini API via `@google/genai`
- TypeScript

## Security note

The Gemini API key is used by the Express backend rather than embedded in the React Native application. The mobile client sends the transcript to the backend, and the backend returns structured AI output.

## Submission checklist

- [ ] Run `npm install`
- [ ] Configure `.env` locally
- [ ] Start backend with `npm run server`
- [ ] Create/run Android development build
- [ ] Test microphone permission
- [ ] Test a voice command such as “Remind me to call John tomorrow at 5 PM”
- [ ] Verify task appears in the list
- [ ] Restart the app and verify the task is still present
- [ ] Verify status change and delete actions
- [ ] Remove `.env` before pushing to GitHub
- [ ] Push source code and README to GitHub
