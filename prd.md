# PRD: Remotion Captioning Demo

## 1. Goal

Build a local web application (no hosting required) that allows a user to:

- Upload an .mp4 video.
- Automatically generate captions from the audio track using Speech-to-Text (STT).
- Render captions on the video using Remotion with multiple predefined styles.
- Support Hinglish captions (Hindi + English mixed text).
- Preview the captioned video in real-time and export it as .mp4.

## 2. Functional Requirements

### 2.1 Mandatory Features

#### Remotion Integration

Use Remotion (remotion.dev) for rendering captions.

Provide a Remotion composition with video + captions.

#### Video Upload

UI element to upload an .mp4 file from the local system.

Uploaded video should load in a preview player.

#### Auto-Captioning

"Auto-generate captions" button triggers STT.

Options:

- Cloud API: Google Speech-to-Text, AssemblyAI, or OpenAI Whisper API.
- Local: Whisper.cpp (document which method was chosen).

Captions returned as text + timestamps.

#### Hinglish Support

Must correctly render mixed Devanagari + English text.

Use appropriate fonts: e.g., Noto Sans Devanagari + Noto Sans.

#### Caption Presets

Provide at least 3 caption styles:

- Bottom-centered (classic subtitles).
- Top bar (wide strip at top).
- Karaoke-style (word highlight with timeline).

User selects preset via dropdown.

#### Local Preview

Video preview with captions in real time.

Use Remotion Player or a similar component.

#### Export

Allow user to export captioned video.

- Option A: In-app "Export" button → runs Remotion's renderMedia.
- Option B: Provide clear CLI command instructions in README (npx remotion render).

### 2.2 Deliverables

Codebase in:

- GitHub repo (with downloadable ZIP), or
- Google Drive folder.

README.md with:

- Node.js version used.
- Setup instructions (npm install, npm run dev, etc.).
- Export steps (e.g., npx remotion render).
- Any API keys required (if cloud STT used).

Sample files:

- One example input .mp4.
- One exported .mp4 with captions.

## 3. Non-Functional Requirements

- Local-first setup: No hosting required.
- Cross-platform: Must run on Windows, Mac, and Linux (Node.js + VS Code).
- Performance: Export should complete for a 1–2 min video within reasonable time (<5 min).
- Modularity: Keep code clean and modular (bonus if in TypeScript).

## 4. Nice-to-Have Features (Optional, Bonus)

- Offline Whisper: Integration with whisper.cpp or Hugging Face local STT.
- Import/Export Subtitles: Support .srt or .vtt upload/download.
- Word-level Karaoke Effect: Highlight words as they are spoken.
- Docker/Devcontainer Setup: For isolated reproducibility.

## 5. User Flow

Open App Locally → Start development server (npm run dev).

Upload MP4 → File appears in preview window.

Click "Auto-generate captions" → Captions appear (after STT processing).

Choose Caption Style → Dropdown updates preview with chosen preset.

Preview in Player → Remotion Player shows video + captions.

Export Video → User clicks "Export" or runs CLI command → Outputs .mp4.

## 6. Tech Stack

- Frontend/Player: React + Remotion.
- STT: Whisper API (or Whisper.cpp if offline).
- Font Handling: Google Fonts (Noto Sans + Noto Sans Devanagari).
- Build Tool: Vite / Next.js (choose one, but simple Vite React preferred).
- Language: TypeScript (preferred) or JavaScript.

## 7. Evaluation Focus

- ✅ Correct Remotion usage for video + captions.
- ✅ Hinglish rendering (Devanagari + English text).
- ✅ Multiple caption presets implemented.
- ✅ Local setup + export works smoothly.
- ✅ Clear README with reproducible steps.