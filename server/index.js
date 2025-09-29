import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini client
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn('⚠️  GEMINI_API_KEY not found. Caption generation will not work until you set it in .env file');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the upload interface at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadsDir);

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Routes
app.post('/api/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const videoInfo = {
      id: path.parse(req.file.filename).name,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/uploads/${req.file.filename}`
    };

    res.json({
      success: true,
      video: videoInfo
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

app.post('/api/generate-captions', async (req, res) => {
  try {
    const { videoPath, method = 'gemini' } = req.body;
    
    if (!videoPath) {
      return res.status(400).json({ error: 'Video path is required' });
    }

    const fullPath = path.join(__dirname, '..', videoPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    console.log('Generating captions for:', fullPath);

    let captions = [];
    let transcriptionText = '';

    // Try different methods based on availability
    if (method === 'gemini' && genAI) {
      try {
        const transcription = await transcribeWithGemini(fullPath, genAI);
        
        captions = processGeminiTranscription(transcription);
        transcriptionText = transcription.text;
      } catch (error) {
        console.error('Gemini API error:', error.message);
        // Fall back to demo captions
        captions = generateDemoCaptions();
        transcriptionText = 'Demo captions generated (Gemini API error: ' + error.message + ')';
      }
    } else {
      // Generate demo captions for testing
      captions = generateDemoCaptions();
      transcriptionText = 'Demo captions generated (for testing purposes)';
    }

    res.json({
      success: true,
      captions,
      transcription: transcriptionText,
      method: captions.length > 0 ? 'demo' : 'failed'
    });

  } catch (error) {
    console.error('Caption generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate captions',
      details: error.message 
    });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Extract audio from video for browser-based speech recognition
app.post('/api/extract-audio', async (req, res) => {
  try {
    const { videoPath } = req.body;
    
    if (!videoPath) {
      return res.status(400).json({ error: 'Video path is required' });
    }

    const fullPath = path.join(__dirname, '..', videoPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // For now, just return the video URL for browser processing
    // In a full implementation, you could use ffmpeg to extract audio
    res.json({
      success: true,
      audioUrl: videoPath,
      message: 'Use browser Web Speech API for transcription'
    });

  } catch (error) {
    console.error('Audio extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract audio',
      details: error.message 
    });
  }
});

// Process transcription to create timed caption segments using functional approach
const processTranscription = (transcription) => {
  if (!transcription.words || transcription.words.length === 0) {
    // Fallback: create segments from full text
    return [{
      id: 1,
      start: 0,
      end: 5,
      text: transcription.text || 'No captions available'
    }];
  }

  const { words } = transcription;
  const wordsPerSegment = 8; // Adjust based on preference
  
  // Create segments using functional approach
  const segments = Array.from(
    { length: Math.ceil(words.length / wordsPerSegment) },
    (_, index) => {
      const startIdx = index * wordsPerSegment;
      const segmentWords = words.slice(startIdx, startIdx + wordsPerSegment);
      
      return {
        id: index + 1,
        start: segmentWords[0].start,
        end: segmentWords[segmentWords.length - 1].end,
        text: segmentWords.map(w => w.word).join(' ').trim(),
        words: segmentWords
      };
    }
  );

  return segments;
};

// Generate demo captions for testing when API is not available
const generateDemoCaptions = () => {
  const demoTexts = [
    "Welcome to this amazing video demonstration",
    "यह एक बेहतरीन वीडियो का उदाहरण है", // Hindi text for Hinglish testing
    "This shows how captions work perfectly",
    "Multiple styles और effects के साथ", // Mixed Hindi-English
    "Beautiful typography and smooth animations",
    "Perfect for all your video needs"
  ];

  return demoTexts.map((text, index) => ({
    id: index + 1,
    start: index * 3,
    end: (index + 1) * 3,
    text,
    words: text.split(' ').map((word, wordIndex) => ({
      word,
      start: index * 3 + (wordIndex * 0.4),
      end: index * 3 + ((wordIndex + 1) * 0.4)
    }))
  }));
};

// Function to transcribe audio using Gemini API
const transcribeWithGemini = async (videoPath, genAI) => {
  try {
    // Read the video file
    const videoData = await fs.readFile(videoPath);
    
    // Convert to base64
    const base64Video = videoData.toString('base64');
    
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Create the prompt for transcription
    const prompt = `Please transcribe the audio from this video file. Provide the transcription as plain text with approximate timestamps. Format the response as JSON with the following structure:
{
  "text": "full transcription text",
  "segments": [
    {
      "start": 0.0,
      "end": 3.0,
      "text": "segment text"
    }
  ]
}`;
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Video,
          mimeType: 'video/mp4'
        }
      },
      prompt
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      return parsed;
    } catch (parseError) {
      // If JSON parsing fails, create a simple response
      return {
        text: text,
        segments: [{
          start: 0,
          end: 10,
          text: text
        }]
      };
    }
  } catch (error) {
    console.error('Gemini transcription error:', error);
    throw error;
  }
};

// Process Gemini transcription to create timed caption segments
const processGeminiTranscription = (transcription) => {
  if (!transcription.segments || transcription.segments.length === 0) {
    // Fallback: create segments from full text
    return [{
      id: 1,
      start: 0,
      end: 5,
      text: transcription.text || 'No captions available'
    }];
  }

  return transcription.segments.map((segment, index) => ({
    id: index + 1,
    start: segment.start,
    end: segment.end,
    text: segment.text,
    words: segment.text.split(' ').map((word, wordIndex) => {
      const wordDuration = (segment.end - segment.start) / segment.text.split(' ').length;
      return {
        word,
        start: segment.start + (wordIndex * wordDuration),
        end: segment.start + ((wordIndex + 1) * wordDuration)
      };
    })
  }));
};

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to set GEMINI_API_KEY environment variable for STT functionality');
});
