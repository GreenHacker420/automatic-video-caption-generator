import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const STUDIO_PORT = 3001;

// Initialize Gemini client
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn('⚠️  GEMINI_API_KEY not found. Caption generation will not work until you set it in .env file');
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept', 'Origin', 'User-Agent'],
  exposedHeaders: ['Accept-Ranges', 'Content-Length', 'Content-Range', 'Content-Type']
}));
app.use(express.json());

// Remove static file serving - everything is now unified

// Unified HTML with embedded React application
const getUnifiedHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Remotion Video Captioning</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.development.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        .hinglish-text {
            font-family: 'Noto Sans Devanagari', 'Noto Sans', sans-serif;
            font-feature-settings: 'liga' 1, 'calt' 1;
            text-rendering: optimizeLegibility;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script>
        ${getReactApplication()}
    </script>
</body>
</html>
`;

// React Application with Router
const getReactApplication = () => {
  return `
const { useState, useCallback, useRef } = React;
const { BrowserRouter, Routes, Route, useNavigate, Link } = ReactRouterDOM;

// Shadcn-style Button component
const Button = ({ children, onClick, disabled, variant = 'default', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 bg-slate-900 text-white hover:bg-slate-800',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground border-slate-200 hover:bg-slate-100',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 bg-slate-100 text-slate-900 hover:bg-slate-200',
    ghost: 'hover:bg-accent hover:text-accent-foreground hover:bg-slate-100',
    link: 'underline-offset-4 hover:underline text-primary text-slate-900'
  };

  return React.createElement('button', {
    className: \`\${baseClasses} \${variants[variant]} h-10 py-2 px-4 \${className}\`,
    onClick,
    disabled,
    ...props
  }, children);
};

// Card components
const Card = ({ children, className = '' }) => {
  return React.createElement('div', {
    className: \\\`rounded-lg border bg-card text-card-foreground shadow-sm bg-white border-slate-200 \\\${className}\\\`
  }, children);
};

const CardHeader = ({ children, className = '' }) => {
  return React.createElement('div', {
    className: \\\`flex flex-col space-y-1.5 p-6 \\\${className}\\\`
  }, children);
};

const CardTitle = ({ children, className = '' }) => {
  return React.createElement('h3', {
    className: \\\`text-2xl font-semibold leading-none tracking-tight \\\${className}\\\`
  }, children);
};

const CardContent = ({ children, className = '' }) => {
  return React.createElement('div', {
    className: \\\`p-6 pt-0 \\\${className}\\\`
  }, children);
};

// Upload Page Component
const UploadPage = () => {
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [captions, setCaptions] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('bottom-centered');
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const CAPTION_PRESETS = {
    'bottom-centered': { name: 'Bottom Centered', position: 'bottom', style: 'classic' },
    'top-bar': { name: 'Top Bar', position: 'top', style: 'bar' },
    'karaoke': { name: 'Karaoke Style', position: 'bottom', style: 'karaoke' }
  };

  const handleVideoUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload video');
      }

      const result = await response.json();
      setVideo(result.video);
    } catch (err) {
      setError(\\\`Upload failed: \\\${err.message}\\\`);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleGenerateCaptions = useCallback(async (method = 'demo') => {
    if (!video) return;

    setIsGeneratingCaptions(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath: video.url, method }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate captions');
      }

      const result = await response.json();
      setCaptions(result.captions);
      
      if (result.captions && result.captions.length > 0) {
        const maxEndTime = Math.max(...result.captions.map(c => c.end));
        const durationInFrames = Math.ceil(maxEndTime * 30);
        
        const props = {
          videoSrc: \\\`\\\${window.location.origin}\\\${video.url}\\\`,
          captions: result.captions,
          preset: CAPTION_PRESETS[selectedPreset]
        };
        
        // Store props in localStorage for Remotion to access
        localStorage.setItem('remotionProps', JSON.stringify(props));
        localStorage.setItem('remotionDuration', durationInFrames.toString());
        
        setError('✅ Captions generated! Redirecting to studio...');
        
        // Navigate to studio page
        setTimeout(() => {
          navigate('/studio');
        }, 2000);
      }
    } catch (err) {
      setError(\\\`Caption generation failed: \\\${err.message}\\\`);
    } finally {
      setIsGeneratingCaptions(false);
    }
  }, [video, selectedPreset, navigate]);

  return React.createElement('div', {
    className: 'min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8'
  }, 
    React.createElement('div', {
      className: 'max-w-4xl mx-auto'
    },
      // Header
      React.createElement('div', {
        className: 'text-center mb-8'
      },
        React.createElement('h1', {
          className: 'text-4xl font-bold text-slate-800 mb-2'
        }, 'Remotion Video Captioning'),
        React.createElement('p', {
          className: 'text-slate-600 mb-4'
        }, 'Upload a video, generate captions, and edit in the studio'),
        React.createElement('div', {
          className: 'flex justify-center space-x-4'
        },
          React.createElement(Link, {
            to: '/studio',
            className: 'inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors'
          }, '🎬 Go to Studio'),
          React.createElement('a', {
            href: 'https://github.com/remotion-dev/remotion',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors'
          }, '📚 Remotion Docs')
        )
      ),

      // Error Alert
      error && React.createElement('div', {
        className: 'relative w-full rounded-lg border p-4 mb-6 bg-blue-50 border-blue-200 text-blue-800'
      }, error),

      // Upload Card
      React.createElement(Card, {
        className: 'mb-8'
      },
        React.createElement(CardHeader, null,
          React.createElement(CardTitle, null, '📁 Upload & Generate Captions')
        ),
        React.createElement(CardContent, {
          className: 'space-y-4'
        },
          // File Input
          React.createElement('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'video/*',
            onChange: handleVideoUpload,
            className: 'hidden'
          }),
          
          React.createElement(Button, {
            onClick: () => fileInputRef.current?.click(),
            disabled: isUploading,
            className: 'w-full',
            variant: 'outline'
          }, isUploading ? 'Uploading...' : '📤 Upload Video'),

          // Video Info
          video && React.createElement('div', {
            className: 'bg-slate-50 p-4 rounded-lg'
          },
            React.createElement('h3', {
              className: 'font-semibold text-slate-700'
            }, 'Uploaded Video:'),
            React.createElement('p', {
              className: 'text-sm text-slate-600'
            }, video.originalName),
            React.createElement('p', {
              className: 'text-sm text-slate-500'
            }, \\\`Size: \\\${(video.size / (1024 * 1024)).toFixed(2)} MB\\\`)
          ),

          // Caption Generation Options
          React.createElement('div', {
            className: 'space-y-3'
          },
            React.createElement(Button, {
              onClick: () => handleGenerateCaptions('demo'),
              disabled: !video || isGeneratingCaptions,
              className: 'w-full bg-green-600 hover:bg-green-700'
            }, isGeneratingCaptions ? 'Generating...' : '🎦 Generate Demo Captions'),
            
            React.createElement(Button, {
              onClick: () => handleGenerateCaptions('whisper'),
              disabled: !video || isGeneratingCaptions,
              className: 'w-full bg-orange-600 hover:bg-orange-700'
            }, isGeneratingCaptions ? 'Generating...' : '🎙️ Local Whisper.cpp'),
            
            React.createElement(Button, {
              onClick: () => handleGenerateCaptions('gemini'),
              disabled: !video || isGeneratingCaptions,
              className: 'w-full bg-blue-600 hover:bg-blue-700'
            }, isGeneratingCaptions ? 'Generating...' : '🤖 Google Gemini')
          ),

          // Video Preview
          video && React.createElement('div', {
            className: 'aspect-video bg-black rounded-lg overflow-hidden'
          },
            React.createElement('video', {
              src: \\\`\\\${window.location.origin}\\\${video.url}\\\`,
              controls: true,
              className: 'w-full h-full object-contain'
            })
          )
        )
      )
    )
  );
};

// Studio Page Component
const StudioPage = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Start Remotion Studio
    const startStudio = async () => {
      try {
        const response = await fetch('/api/start-studio', { method: 'POST' });
        if (response.ok) {
          // Redirect to actual studio
          window.location.href = '/remotion-studio';
        }
      } catch (error) {
        console.error('Failed to start studio:', error);
      }
    };
    
    startStudio();
  }, []);

  return React.createElement('div', {
    className: 'min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8'
  },
    React.createElement('div', {
      className: 'max-w-4xl mx-auto text-center'
    },
      React.createElement('h1', {
        className: 'text-4xl font-bold text-slate-800 mb-4'
      }, '🎬 Remotion Studio'),
      React.createElement('p', {
        className: 'text-slate-600 mb-8'
      }, 'Starting Remotion Studio...'),
      React.createElement(Button, {
        onClick: () => navigate('/upload'),
        variant: 'outline'
      }, '← Back to Upload')
    )
  );
};

// Main App Component with Router
const App = () => {
  return React.createElement(BrowserRouter, null,
    React.createElement(Routes, null,
      React.createElement(Route, { path: '/', element: React.createElement(UploadPage) }),
      React.createElement(Route, { path: '/upload', element: React.createElement(UploadPage) }),
      React.createElement(Route, { path: '/studio', element: React.createElement(StudioPage) })
    )
  );
};

// Render the app
ReactDOM.render(React.createElement(App), document.getElementById('root'));
`;
};

// Serve unified application with client-side routing
app.get('/', (req, res) => {
  res.send(getUnifiedHTML());
});

app.get('/upload', (req, res) => {
  res.send(getUnifiedHTML());
});

app.get('/studio', (req, res) => {
  res.send(getUnifiedHTML());
});

// API route to start studio
app.post('/api/start-studio', async (req, res) => {
  try {
    await startRemotionStudio();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start studio' });
  }
});

// Redirect to actual Remotion Studio
app.get('/remotion-studio', (req, res) => {
  res.redirect('http://localhost:3001');
});

// Remotion Studio Integration
let remotionStudioProcess = null;

// Start Remotion Studio as a subprocess
const startRemotionStudio = () => {
  if (remotionStudioProcess) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log('🎬 Starting Remotion Studio...');
    
    remotionStudioProcess = spawn('npx', ['remotion', 'studio', '--port', '3001'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let studioReady = false;

    remotionStudioProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Remotion Studio: ${output}`);
      
      if (output.includes('Ready!') || output.includes('localhost:3001')) {
        if (!studioReady) {
          studioReady = true;
          console.log('✅ Remotion Studio is ready!');
          resolve();
        }
      }
    });

    remotionStudioProcess.stderr.on('data', (data) => {
      console.log(`Remotion Studio Error: ${data}`);
    });

    remotionStudioProcess.on('close', (code) => {
      console.log(`Remotion Studio process exited with code ${code}`);
      remotionStudioProcess = null;
    });

    remotionStudioProcess.on('error', (error) => {
      console.error('Failed to start Remotion Studio:', error);
      remotionStudioProcess = null;
      reject(error);
    });

    // Timeout after 30 seconds if studio doesn't start
    setTimeout(() => {
      if (!studioReady) {
        console.log('⚠️  Remotion Studio startup timeout, but continuing...');
        resolve();
      }
    }, 30000);
  });
};

// Proxy requests to Remotion Studio
const studioProxy = createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  pathRewrite: {
    '^/studio': '', // Remove /studio prefix when forwarding
  },
  onError: (err, req, res) => {
    console.log('Studio proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Remotion Studio not available' });
    }
  }
});

// Handle studio routes
app.use('/studio', (req, res, next) => {
  // Start studio if not running
  if (!remotionStudioProcess) {
    startRemotionStudio().then(() => {
      // Give it a moment to fully start
      setTimeout(() => studioProxy(req, res, next), 1000);
    }).catch(() => {
      res.status(502).json({ error: 'Failed to start Remotion Studio' });
    });
  } else {
    studioProxy(req, res, next);
  }
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
    } else if (method === 'whisper') {
      try {
        const transcription = await transcribeWithWhisperCpp(fullPath);
        
        captions = processWhisperTranscription(transcription);
        transcriptionText = transcription.text;
      } catch (error) {
        console.error('Whisper.cpp error:', error.message);
        // Fall back to demo captions
        captions = generateDemoCaptions();
        transcriptionText = 'Demo captions generated (Whisper.cpp error: ' + error.message + ')';
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

// Handle OPTIONS requests for uploads
app.options('/uploads/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin, User-Agent');
  res.header('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type');
  res.status(200).end();
});

// Handle HEAD requests for uploads (Remotion checks headers first)
app.head('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  console.log(`HEAD /uploads/${filename}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).end();
  }
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  
  // Determine MIME type
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  switch (ext) {
    case '.mp4': contentType = 'video/mp4'; break;
    case '.webm': contentType = 'video/webm'; break;
    case '.ogg': contentType = 'video/ogg'; break;
    case '.avi': contentType = 'video/x-msvideo'; break;
    case '.mov': contentType = 'video/quicktime'; break;
    case '.wav': contentType = 'audio/wav'; break;
    case '.mp3': contentType = 'audio/mpeg'; break;
  }
  
  // Set headers for HEAD request
  res.header('Accept-Ranges', 'bytes');
  res.header('Content-Type', contentType);
  res.header('Content-Length', fileSize.toString());
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type');
  res.header('Cache-Control', 'no-cache');
  
  res.status(200).end();
});

// Custom static file handler with range support
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  console.log(`GET /uploads/${filename} - Range: ${req.headers.range || 'none'}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  // Determine MIME type based on file extension
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  switch (ext) {
    case '.mp4':
      contentType = 'video/mp4';
      break;
    case '.webm':
      contentType = 'video/webm';
      break;
    case '.ogg':
      contentType = 'video/ogg';
      break;
    case '.avi':
      contentType = 'video/x-msvideo';
      break;
    case '.mov':
      contentType = 'video/quicktime';
      break;
    case '.wav':
      contentType = 'audio/wav';
      break;
    case '.mp3':
      contentType = 'audio/mpeg';
      break;
  }
  
  // Set basic headers
  res.header('Accept-Ranges', 'bytes');
  res.header('Content-Type', contentType);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range');
  res.header('Cache-Control', 'no-cache');
  
  if (range) {
    // Parse range header
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    // Validate range
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).header('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }
    
    const chunksize = (end - start) + 1;
    
    // Create read stream for the range
    const file = fs.createReadStream(filePath, { start, end });
    
    // Set range headers
    res.status(206);
    res.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.header('Content-Length', chunksize.toString());
    
    // Handle stream errors
    file.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
    
    file.pipe(res);
  } else {
    // Send entire file
    res.header('Content-Length', fileSize.toString());
    const file = fs.createReadStream(filePath);
    
    // Handle stream errors
    file.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
    
    file.pipe(res);
  }
});

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

// Function to extract audio from video using ffmpeg
const extractAudioFromVideo = async (videoPath) => {
  const audioPath = videoPath.replace(/\.[^/.]+$/, '.wav');
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-ar', '16000',  // 16kHz sample rate for Whisper
      '-ac', '1',      // Mono channel
      '-c:a', 'pcm_s16le', // PCM 16-bit little-endian
      '-y',            // Overwrite output file
      audioPath
    ]);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`ffmpeg: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(audioPath);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(error);
    });
  });
};

// Function to transcribe audio using whisper.cpp
const transcribeWithWhisperCpp = async (videoPath) => {
  try {
    // First extract audio from video
    const audioPath = await extractAudioFromVideo(videoPath);
    
    // Path to whisper.cpp binary and model
    const whisperBinary = path.join(__dirname, '../whisper.cpp/build/bin/whisper-cli');
    const modelPath = path.join(__dirname, '../whisper.cpp/models/ggml-base.en.bin');
    
    return new Promise((resolve, reject) => {
      // Set a timeout for the whisper process
      const timeout = setTimeout(() => {
        whisper.kill('SIGTERM');
        reject(new Error('Whisper.cpp process timed out after 60 seconds'));
      }, 60000);

      const whisper = spawn(whisperBinary, [
        '-m', modelPath,
        '-f', audioPath,
        '--output-json',
        '--no-prints'
      ]);

      let output = '';
      let errorOutput = '';

      whisper.stdout.on('data', (data) => {
        output += data.toString();
      });

      whisper.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      whisper.on('close', async (code) => {
        clearTimeout(timeout);
        
        try {
          // Since whisper.cpp saves to file, read the JSON file
          const jsonPath = audioPath + '.json';
          let result;
          
          if (await fs.pathExists(jsonPath)) {
            const jsonContent = await fs.readFile(jsonPath, 'utf8');
            result = JSON.parse(jsonContent);
            // Clean up JSON file
            await fs.unlink(jsonPath).catch(() => {});
          } else {
            // Fallback: parse stdout or create simple response
            if (output.trim()) {
              result = {
                text: output.trim(),
                segments: [{
                  start: 0,
                  end: 10,
                  text: output.trim()
                }]
              };
            } else {
              throw new Error('No output from whisper.cpp');
            }
          }
          
          // Clean up audio file
          await fs.unlink(audioPath).catch(() => {});
          
          if (code === 0) {
            resolve(result);
          } else {
            reject(new Error(`Whisper.cpp exited with code ${code}: ${errorOutput}`));
          }
        } catch (cleanupError) {
          reject(new Error(`Error processing whisper.cpp output: ${cleanupError.message}`));
        }
      });

      whisper.on('error', async (error) => {
        clearTimeout(timeout);
        // Clean up files
        await fs.unlink(audioPath).catch(() => {});
        await fs.unlink(audioPath + '.json').catch(() => {});
        reject(error);
      });
    });
  } catch (error) {
    console.error('Whisper.cpp transcription error:', error);
    throw error;
  }
};

// Process whisper.cpp transcription to create timed caption segments
const processWhisperTranscription = (transcription) => {
  // Handle whisper.cpp JSON output format
  if (transcription.transcription && Array.isArray(transcription.transcription)) {
    const segments = transcription.transcription;
    
    return segments.map((segment, index) => {
      const startTime = segment.offsets?.from / 1000 || 0;
      const endTime = segment.offsets?.to / 1000 || startTime + 3;
      const text = segment.text?.trim() || '';
      
      // Create word-level timestamps
      const words = text.split(' ').filter(word => word.length > 0).map((word, wordIndex, allWords) => {
        const segmentDuration = endTime - startTime;
        const wordDuration = segmentDuration / allWords.length;
        const wordStartTime = startTime + (wordIndex * wordDuration);
        
        return {
          word: word,
          start: wordStartTime,
          end: wordStartTime + wordDuration
        };
      });
      
      return {
        id: index + 1,
        start: startTime,
        end: endTime,
        text: text,
        words: words
      };
    });
  }
  
  // Fallback for other formats or empty transcription
  if (!transcription.segments || transcription.segments.length === 0) {
    // Create segments from full text if available
    const fullText = transcription.text || 'No captions available';
    return [{
      id: 1,
      start: 0,
      end: 5,
      text: fullText,
      words: fullText.split(' ').map((word, index) => ({
        word,
        start: index * 0.5,
        end: (index + 1) * 0.5
      }))
    }];
  }

  // Handle standard segments format
  return transcription.segments.map((segment, index) => ({
    id: index + 1,
    start: segment.start || 0,
    end: segment.end || segment.start + 3,
    text: segment.text || '',
    words: segment.words ? segment.words.map(word => ({
      word: word.word || word.text,
      start: word.start || segment.start,
      end: word.end || word.start + 0.5
    })) : segment.text.split(' ').map((word, wordIndex) => {
      const wordDuration = (segment.end - segment.start) / segment.text.split(' ').length;
      return {
        word,
        start: segment.start + (wordIndex * wordDuration),
        end: segment.start + ((wordIndex + 1) * wordDuration)
      };
    })
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

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📹 Video upload and captioning available at: /');
  console.log('🎬 Remotion Studio available at: /studio');
  console.log('Make sure to set GEMINI_API_KEY environment variable for STT functionality');
  
  // Start Remotion Studio in background
  try {
    await startRemotionStudio();
  } catch (error) {
    console.log('⚠️  Remotion Studio failed to start automatically, but you can still access /studio');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  if (remotionStudioProcess) {
    console.log('🎬 Stopping Remotion Studio...');
    remotionStudioProcess.kill('SIGTERM');
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  if (remotionStudioProcess) {
    remotionStudioProcess.kill('SIGTERM');
  }
  
  process.exit(0);
});
