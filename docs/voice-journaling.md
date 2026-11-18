# Voice journaling

## What is implemented

- The existing create-entry dialog has **Write manually** and **Speak instead** modes. Manual entry fields and save behavior remain available.
- Voice mode records with `MediaRecorder`, with start, pause, resume, stop, playback, delete, duration display, and microphone error handling.
- Audio is held in browser memory, uploaded only when the owner requests transcription, and not stored by the application. Closing the form discards the audio. The owner must explicitly save the edited transcript to create an entry.
- Voice diary entries store the final edited text in `originalContent`, the original provider transcript in `transcript`, and `inputMethod = VOICE`. Manual entries use `inputMethod = TEXT` by default.
- Existing writing modes can preview an unsaved transcript. Light Fix currently collapses whitespace; Review currently leaves text unchanged and reports that suggestions are unavailable. Applying a preview remains a user action.
- The authenticated `POST /api/diary/transcribe` endpoint checks MIME type and file signature, enforces file-size and parsed audio-duration limits, applies an IP rate limit, and forwards audio to an OpenAI-compatible transcription endpoint. It does not retrieve diary entries or grant access.

## Configuration

Set these in the backend environment (the existing `AI_PROVIDER_API_KEY` is used as a fallback when a dedicated transcription key is absent):

```env
AI_TRANSCRIPTION_API_KEY=your-secret-key
AI_TRANSCRIPTION_API_URL=https://api.openai.com/v1/audio/transcriptions
AI_TRANSCRIPTION_MODEL=whisper-1
TRANSCRIPTION_MAX_FILE_SIZE_MB=25
TRANSCRIPTION_MAX_DURATION_SECONDS=600
```

The key stays on the backend. The endpoint expects an OpenAI-compatible multipart transcription API that returns `{ "text": "..." }`. Without a configured key, the route returns a clear service-unavailable error; it never fabricates a transcript.

## Database migration and startup

From the repository root, apply the additive migration and generate the client:

```sh
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npx prisma generate --schema backend/prisma/schema.prisma
```

Then start the backend and frontend with the existing workspace scripts:

```sh
npm run dev:backend
npm run dev:frontend
```

No audio-storage integration exists in this project, so recording retention is intentionally unavailable. Users can save the transcript without retaining audio.

## Tests

Backend tests cover authentication, missing audio, invalid media signatures, provider configuration, provider success/error handling, and TEXT/VOICE create-input validation. Browser microphone and playback flows require manual testing in a secure browser context with microphone access.
