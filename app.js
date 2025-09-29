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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept', 'Origin', 'User-Agent'],
  exposedHeaders: ['Accept-Ranges', 'Content-Length', 'Content-Range', 'Content-Type']
}));
app.use(express.json());

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
        const { useState, useCallback, useRef } = React;
        const { BrowserRouter, Routes, Route, useNavigate, Link } = ReactRouterDOM;

        // Button component
        const Button = ({ children, onClick, disabled, variant = 'default', className = '', ...props }) => {
          const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';
          
          const variants = {
            default: 'bg-slate-900 text-white hover:bg-slate-800',
            outline: 'border border-slate-200 hover:bg-slate-100',
            secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          };

          return React.createElement('button', {
            className: baseClasses + ' ' + variants[variant] + ' h-10 py-2 px-4 ' + className,
            onClick,
            disabled,
            ...props
          }, children);
        };

        // Card components
        const Card = ({ children, className = '' }) => {
          return React.createElement('div', {
            className: 'rounded-lg border bg-white border-slate-200 shadow-sm ' + className
          }, children);
        };

        const CardHeader = ({ children, className = '' }) => {
          return React.createElement('div', {
            className: 'flex flex-col space-y-1.5 p-6 ' + className
          }, children);
        };

        const CardTitle = ({ children, className = '' }) => {
          return React.createElement('h3', {
            className: 'text-2xl font-semibold leading-none tracking-tight ' + className
          }, children);
        };

        const CardContent = ({ children, className = '' }) => {
          return React.createElement('div', {
            className: 'p-6 pt-0 ' + className
          }, children);
        };

        // Upload Page Component
        const UploadPage = () => {
          const navigate = useNavigate();
          const [video, setVideo] = useState(null);
          const [captions, setCaptions] = useState([]);
          const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
          const [isUploading, setIsUploading] = useState(false);
          const [error, setError] = useState(null);
          const fileInputRef = useRef(null);

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
              setError('Upload failed: ' + err.message);
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
                setError('✅ Captions generated! Redirecting to studio...');
                
                // Navigate to studio page
                setTimeout(() => {
                  navigate('/studio');
                }, 2000);
              }
            } catch (err) {
              setError('Caption generation failed: ' + err.message);
            } finally {
              setIsGeneratingCaptions(false);
            }
          }, [video, navigate]);

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
                  }, '🎬 Go to Studio')
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
                    }, video.originalName)
                  ),

                  // Caption Generation Options
                  React.createElement('div', {
                    className: 'space-y-3'
                  },
                    React.createElement(Button, {
                      onClick: () => handleGenerateCaptions('demo'),
                      disabled: !video || isGeneratingCaptions,
                      className: 'w-full bg-green-600 hover:bg-green-700 text-white'
                    }, isGeneratingCaptions ? 'Generating...' : '🎦 Generate Demo Captions'),
                    
                    React.createElement(Button, {
                      onClick: () => handleGenerateCaptions('gemini'),
                      disabled: !video || isGeneratingCaptions,
                      className: 'w-full bg-blue-600 hover:bg-blue-700 text-white'
                    }, isGeneratingCaptions ? 'Generating...' : '🤖 Google Gemini')
                  ),

                  // Video Preview
                  video && React.createElement('div', {
                    className: 'aspect-video bg-black rounded-lg overflow-hidden'
                  },
                    React.createElement('video', {
                      src: window.location.origin + video.url,
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
            // Redirect to actual Remotion Studio
            window.location.href = 'http://localhost:3001';
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
              }, 'Redirecting to Remotion Studio...'),
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
    </script>
</body>
</html>
`;

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
      cwd: __dirname,
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
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

// API Routes
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
    const { videoPath, method = 'demo' } = req.body;
    
    if (!videoPath) {
      return res.status(400).json({ error: 'Video path is required' });
    }

    // Generate demo captions for testing
    const demoTexts = [
      "Welcome to this amazing video demonstration",
      "यह एक बेहतरीन वीडियो का उदाहरण है",
      "This shows how captions work perfectly",
      "Multiple styles और effects के साथ",
      "Beautiful typography and smooth animations",
      "Perfect for all your video needs"
    ];

    const captions = demoTexts.map((text, index) => ({
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

    res.json({
      success: true,
      captions,
      transcription: 'Demo captions generated',
      method: 'demo'
    });

  } catch (error) {
    console.error('Caption generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate captions',
      details: error.message 
    });
  }
});

// Handle uploads with range support
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  // Set basic headers
  res.header('Accept-Ranges', 'bytes');
  res.header('Content-Type', 'video/mp4');
  res.header('Access-Control-Allow-Origin', '*');
  
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).header('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }
    
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    
    res.status(206);
    res.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.header('Content-Length', chunksize.toString());
    
    file.pipe(res);
  } else {
    res.header('Content-Length', fileSize.toString());
    const file = fs.createReadStream(filePath);
    file.pipe(res);
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📹 Video upload available at: /upload');
  console.log('🎬 Studio redirect available at: /studio');
  
  // Start Remotion Studio in background
  try {
    await startRemotionStudio();
  } catch (error) {
    console.log('⚠️  Remotion Studio failed to start automatically');
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
