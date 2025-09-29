# Remotion Captioning

A modern web application for automatically generating and styling captions on videos using Remotion, with support for Hinglish (Hindi + English) text.

## Features

- **Video Upload**: Upload MP4 videos through a modern web interface
- **Auto-Captioning**: Generate captions using OpenAI Whisper API
- **Hinglish Support**: Proper rendering of mixed Devanagari + English text
- **Multiple Caption Styles**: 
  - Bottom-centered (classic subtitles)
  - Top bar (wide strip at top)
  - Karaoke-style (word highlight with timeline)
- **Real-time Preview**: Preview captions with Remotion Player
- **Export**: Export captioned videos as MP4

## Tech Stack

- **Frontend**: React with functional components and hooks
- **Video Processing**: Remotion (@latest)
- **Backend**: Express.js with ES6 modules
- **STT**: OpenAI Whisper API
- **Fonts**: Google Fonts (Noto Sans + Noto Sans Devanagari)
- **Styling**: Tailwind CSS

## Prerequisites

- Node.js 18+ 
- OpenAI API key (optional - for real speech-to-text)

**Note**: The application now works without an OpenAI API key using free demo captions!

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your OpenAI API key to the `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

### 3. Start Development

Run both the server and Remotion studio:

```bash
npm run dev
```

This will start:
- **Upload Interface**: `http://localhost:3000` (for video upload and caption generation)
- **Remotion Studio**: `http://localhost:3001` (for video composition and rendering)

### 4. Alternative: Run Components Separately

**Start only the server:**
```bash
npm run server
```

**Start only Remotion Studio:**
```bash
npm run studio
```

## Usage

### 1. Upload Video
- Open the Upload Interface at `http://localhost:3000`
- Click "📤 Upload Video" and select an MP4 file
- The video will be uploaded and displayed in the preview

### 2. Generate Captions
Choose from multiple caption generation methods:
- **🎬 Demo Captions (Free)**: Sample captions with Hinglish text for testing
- **🤖 OpenAI Whisper**: Real transcription (requires API credits)  
- **🎤 Web Speech API**: Browser-based recognition (Chrome/Edge only)

### 3. Choose Caption Style
- Select from 3 preset styles:
  - **Bottom Centered**: Classic subtitle style
  - **Top Bar**: Full-width bar at the top
  - **Karaoke**: Word-by-word highlighting effect

### 4. Preview & Edit
- Preview your video in the upload interface
- Click "🎥 Open in Remotion Studio" to edit with full Remotion features
- The Remotion Studio will show your video with captions for fine-tuning

### 5. Export Video

To export your captioned video, use the Remotion CLI:

```bash
npx remotion render CaptionedVideo out/captioned-video.mp4 --props='{"videoSrc":"http://localhost:3000/uploads/your-video.mp4","captions":[...],"preset":{"style":"bottom-centered"}}'
```

Or use the export command shown in the web interface after generating captions.

## Project Structure

```
src/
├── CaptioningApp/           # Main web interface
│   └── index.jsx
├── CaptionedVideo/          # Remotion composition
│   ├── index.jsx
│   └── CaptionRenderer.jsx  # Caption styling component
├── HelloWorld/              # Original Remotion example
└── Root.jsx                 # Remotion compositions registry

server/
└── index.js                 # Express server with ES6 modules

uploads/                     # Uploaded video files
out/                         # Rendered video outputs
```

## API Endpoints

- `POST /api/upload` - Upload video file
- `POST /api/generate-captions` - Generate captions using Whisper API
- `GET /uploads/:filename` - Serve uploaded video files

## Hinglish Support

The application automatically detects Hindi text (Devanagari script) and applies appropriate fonts:

- **English text**: Noto Sans
- **Hindi/Hinglish text**: Noto Sans Devanagari + Noto Sans

## Troubleshooting

### OpenAI API Issues
- Ensure your API key is valid and has credits
- Check that the key is properly set in the `.env` file

### Video Upload Issues
- Ensure the video is in MP4 format
- Check file size (limit: 100MB)
- Verify server is running on port 3000

### Font Rendering Issues
- Ensure Google Fonts are loading properly
- Check internet connection for font downloads

## Development

### Adding New Caption Styles

1. Add new preset to `CAPTION_PRESETS` in `CaptioningApp/index.jsx`
2. Add corresponding styles to `PRESET_STYLES` in `CaptionRenderer.jsx`
3. Implement custom rendering logic if needed

### Modifying STT Provider

The current implementation uses OpenAI Whisper. To use a different provider:

1. Update the `/api/generate-captions` endpoint in `server/index.js`
2. Modify the `processTranscription` function for the new response format

## License

UNLICENSED - Private project

## Support

For Remotion-specific issues, visit the [Remotion Discord](https://discord.gg/6VzzNDwUwV)./blob/main/LICENSE.md).
