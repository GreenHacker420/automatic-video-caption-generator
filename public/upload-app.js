const { useState, useCallback, useRef } = React;

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

  const sizes = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
    lg: 'h-11 px-8 rounded-md',
    icon: 'h-10 w-10'
  };

  return React.createElement('button', {
    className: `${baseClasses} ${variants[variant]} ${sizes.default} ${className}`,
    onClick,
    disabled,
    ...props
  }, children);
};

// Shadcn-style Card components
const Card = ({ children, className = '' }) => {
  return React.createElement('div', {
    className: `rounded-lg border bg-card text-card-foreground shadow-sm bg-white border-slate-200 ${className}`
  }, children);
};

const CardHeader = ({ children, className = '' }) => {
  return React.createElement('div', {
    className: `flex flex-col space-y-1.5 p-6 ${className}`
  }, children);
};

const CardTitle = ({ children, className = '' }) => {
  return React.createElement('h3', {
    className: `text-2xl font-semibold leading-none tracking-tight ${className}`
  }, children);
};

const CardContent = ({ children, className = '' }) => {
  return React.createElement('div', {
    className: `p-6 pt-0 ${className}`
  }, children);
};

// Shadcn-style Select component
const Select = ({ value, onValueChange, children, className = '' }) => {
  return React.createElement('select', {
    value,
    onChange: (e) => onValueChange(e.target.value),
    className: `flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200 bg-white ${className}`
  }, children);
};

// Shadcn-style Alert component
const Alert = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-background text-foreground border-slate-200',
    destructive: 'border-destructive/50 text-destructive dark:border-destructive border-red-200 text-red-800 bg-red-50'
  };

  return React.createElement('div', {
    className: `relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`
  }, children);
};

// Main Upload Application
const UploadApp = () => {
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
      setError(`Upload failed: ${err.message}`);
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
      
      if (result.method === 'demo') {
        setError('✅ Demo captions generated! Opening Remotion Studio in 3 seconds...');
      } else {
        setError('✅ Captions generated! Opening Remotion Studio in 3 seconds...');
      }
      
      // Auto-open Remotion Studio after caption generation
      setTimeout(() => {
        if (result.captions && result.captions.length > 0) {
          const maxEndTime = Math.max(...result.captions.map(c => c.end));
          const durationInFrames = Math.ceil(maxEndTime * 30);
          
          const props = {
            videoSrc: `${window.location.origin}${video.url}`,
            captions: result.captions,
            preset: CAPTION_PRESETS[selectedPreset]
          };
          
          // Store props in localStorage for Remotion to access
          localStorage.setItem('remotionProps', JSON.stringify(props));
          localStorage.setItem('remotionDuration', durationInFrames.toString());
          
          // Auto-open Remotion Studio
          window.open('/studio', '_blank');
          
          // Update success message
          setError('🎥 Remotion Studio opened! Your video and captions are ready for editing.');
        }
      }, 3000); // 3 second delay to let user see the captions
    } catch (err) {
      setError(`Caption generation failed: ${err.message}`);
    } finally {
      setIsGeneratingCaptions(false);
    }
  }, [video]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openRemotionStudio = useCallback(() => {
    if (video && captions.length > 0) {
      // Calculate duration based on captions
      const maxEndTime = Math.max(...captions.map(c => c.end));
      const durationInFrames = Math.ceil(maxEndTime * 30); // 30 fps
      
      const props = {
        videoSrc: `${window.location.origin}${video.url}`,
        captions,
        preset: CAPTION_PRESETS[selectedPreset]
      };
      
      // Store props in localStorage for Remotion to access
      localStorage.setItem('remotionProps', JSON.stringify(props));
      localStorage.setItem('remotionDuration', durationInFrames.toString());
      
      // Open Remotion Studio
      const studioUrl = `/studio`;
      window.open(studioUrl, '_blank');
      
      // Also show a success message
      alert(`🎥 Opening Remotion Studio with your video and captions!\n\nDuration: ${maxEndTime}s (${durationInFrames} frames)`);
    }
  }, [video, captions, selectedPreset]);

  const generateExportCommand = useCallback(() => {
    if (!video || captions.length === 0) return '';
    
    const maxEndTime = Math.max(...captions.map(c => c.end));
    const durationInFrames = Math.ceil(maxEndTime * 30);
    
    const props = {
      videoSrc: `${window.location.origin}${video.url}`,
      captions,
      preset: CAPTION_PRESETS[selectedPreset]
    };
    
    return `npx remotion render CaptionedVideo out/captioned-video.mp4 --props='${JSON.stringify(props)}' --frames=${durationInFrames}`;
  }, [video, captions, selectedPreset]);

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
        }, 'Upload a video, generate captions, and preview with different styles'),
        React.createElement('div', {
          className: 'flex justify-center space-x-4'
        },
          React.createElement(Button, {
            onClick: () => window.open('/studio', '_blank'),
            variant: 'outline',
            className: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
          }, '🎬 Open Remotion Studio'),
          React.createElement('a', {
            href: 'https://github.com/remotion-dev/remotion',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors'
          }, '📚 Remotion Docs')
        )
      ),

      // Error Alert
      error && React.createElement(Alert, {
        variant: error.includes('Demo') ? 'default' : 'destructive',
        className: 'mb-6'
      }, error),

      // Main Content Grid
      React.createElement('div', {
        className: 'grid grid-cols-1 lg:grid-cols-2 gap-8'
      },
        // Upload Card
        React.createElement(Card, null,
          React.createElement(CardHeader, null,
            React.createElement(CardTitle, null, '📁 Upload & Generate')
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
              onClick: triggerFileInput,
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
              }, `Size: ${(video.size / (1024 * 1024)).toFixed(2)} MB`)
            ),

            // Caption Generation Options
            React.createElement('div', {
              className: 'space-y-3'
            },
              React.createElement('div', {
                className: 'text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200'
              },
                React.createElement('strong', null, 'Caption Generation Options:'),
                React.createElement('ul', {
                  className: 'mt-2 space-y-1 text-xs'
                },
                  React.createElement('li', null, '• Demo: Free sample captions with Hinglish text'),
                  React.createElement('li', null, '• Whisper.cpp: Local transcription (no API required)'),
                  React.createElement('li', null, '• Gemini: Cloud transcription (requires API key)'),
                  React.createElement('li', null, '• Web Speech: Browser-based (Chrome/Edge only)')
                )
              ),
              React.createElement(Button, {
                onClick: () => handleGenerateCaptions('demo'),
                disabled: !video || isGeneratingCaptions,
                className: 'w-full bg-green-600 hover:bg-green-700'
              }, isGeneratingCaptions ? 'Generating...' : '🎦 Generate Demo Captions (Free)'),
              
              React.createElement(Button, {
                onClick: () => handleGenerateCaptions('whisper'),
                disabled: !video || isGeneratingCaptions,
                className: 'w-full bg-orange-600 hover:bg-orange-700'
              }, isGeneratingCaptions ? 'Generating...' : '🎙️ Local Whisper.cpp (No API Required)'),
              
              React.createElement(Button, {
                onClick: () => handleGenerateCaptions('gemini'),
                disabled: !video || isGeneratingCaptions,
                className: 'w-full bg-blue-600 hover:bg-blue-700'
              }, isGeneratingCaptions ? 'Generating...' : '🤖 Google Gemini (Requires API Key)'),
              
              React.createElement(Button, {
                onClick: () => handleGenerateCaptions('webspeech'),
                disabled: !video || isGeneratingCaptions,
                className: 'w-full bg-purple-600 hover:bg-purple-700'
              }, isGeneratingCaptions ? 'Generating...' : '🎤 Web Speech API (Browser)')
            ),

            // Caption Style Selector
            captions.length > 0 && React.createElement('div', null,
              React.createElement('label', {
                className: 'block text-sm font-medium text-slate-700 mb-2'
              }, 'Caption Style:'),
              React.createElement(Select, {
                value: selectedPreset,
                onValueChange: setSelectedPreset
              },
                Object.entries(CAPTION_PRESETS).map(([key, preset]) =>
                  React.createElement('option', { key, value: key }, preset.name)
                )
              )
            )
          )
        ),

        // Preview Card
        React.createElement(Card, null,
          React.createElement(CardHeader, null,
            React.createElement(CardTitle, null, '👀 Preview')
          ),
          React.createElement(CardContent, null,
            video ? React.createElement('div', {
              className: 'aspect-video bg-black rounded-lg overflow-hidden mb-4'
            },
              React.createElement('video', {
                src: `${window.location.origin}${video.url}`,
                controls: true,
                className: 'w-full h-full object-contain'
              })
            ) : React.createElement('div', {
              className: 'aspect-video bg-slate-200 rounded-lg flex items-center justify-center'
            },
              React.createElement('p', {
                className: 'text-slate-500'
              }, 'Upload a video to see preview')
            ),

            // Open in Remotion Studio Button
            video && captions.length > 0 && React.createElement(Button, {
              onClick: openRemotionStudio,
              className: 'w-full bg-orange-600 hover:bg-orange-700'
            }, '🎥 Open in Remotion Studio')
          )
        )
      ),

      // Generated Captions
      captions.length > 0 && React.createElement(Card, {
        className: 'mt-8'
      },
        React.createElement(CardHeader, null,
          React.createElement(CardTitle, null, '📝 Generated Captions')
        ),
        React.createElement(CardContent, null,
          React.createElement('div', {
            className: 'max-h-64 overflow-y-auto space-y-2'
          },
            captions.map((caption) =>
              React.createElement('div', {
                key: caption.id,
                className: 'bg-slate-50 p-3 rounded-lg border'
              },
                React.createElement('div', {
                  className: 'flex justify-between items-start mb-1'
                },
                  React.createElement('span', {
                    className: 'text-sm text-slate-600'
                  }, `${caption.start.toFixed(2)}s - ${caption.end.toFixed(2)}s`)
                ),
                React.createElement('p', {
                  className: 'text-slate-800 hinglish-text'
                }, caption.text)
              )
            )
          )
        )
      ),

      // Export Instructions
      video && captions.length > 0 && React.createElement(Card, {
        className: 'mt-8'
      },
        React.createElement(CardHeader, null,
          React.createElement(CardTitle, null, '🚀 Export Video')
        ),
        React.createElement(CardContent, null,
          React.createElement('p', {
            className: 'text-slate-600 mb-4'
          }, 'To export your captioned video, run this command in your terminal:'),
          React.createElement('code', {
            className: 'block bg-slate-100 p-4 rounded-lg text-sm font-mono break-all select-all'
          }, generateExportCommand()),
          
          React.createElement(Button, {
            onClick: () => navigator.clipboard.writeText(generateExportCommand()),
            className: 'mt-2 bg-slate-600 hover:bg-slate-700'
          }, '📋 Copy Command')
        )
      )
    )
  );
};

// Render the app
ReactDOM.render(React.createElement(UploadApp), document.getElementById('root'));
