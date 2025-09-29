import React, { useState, useCallback, useRef } from 'react';
import { Player } from '@remotion/player';
import { CaptionedVideo } from '../CaptionedVideo';

const CAPTION_PRESETS = {
  'bottom-centered': {
    name: 'Bottom Centered',
    position: 'bottom',
    style: 'classic'
  },
  'top-bar': {
    name: 'Top Bar',
    position: 'top',
    style: 'bar'
  },
  'karaoke': {
    name: 'Karaoke Style',
    position: 'bottom',
    style: 'karaoke'
  }
};

export const CaptioningApp = () => {
  const [video, setVideo] = useState(null);
  const [captions, setCaptions] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('bottom-centered');
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

      const response = await fetch('http://localhost:3000/api/upload', {
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
      const response = await fetch('http://localhost:3000/api/generate-captions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoPath: video.url,
          method,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate captions');
      }

      const result = await response.json();
      setCaptions(result.captions);
      
      if (result.method === 'demo') {
        setError('Demo captions generated. For real transcription, add Gemini API key or use Web Speech API.');
      }
    } catch (err) {
      setError(`Caption generation failed: ${err.message}`);
    } finally {
      setIsGeneratingCaptions(false);
    }
  }, [video]);

  const handleWebSpeechCaptions = useCallback(async () => {
    if (!video || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Web Speech API not supported in this browser. Try Chrome or Edge.');
      return;
    }

    setIsGeneratingCaptions(true);
    setError(null);

    try {
      // Create a simple demo for Web Speech API
      // In a full implementation, you'd play the video audio and capture it
      const demoWebSpeechCaptions = [
        { id: 1, start: 0, end: 3, text: "Web Speech API Demo Caption 1" },
        { id: 2, start: 3, end: 6, text: "This would use browser speech recognition" },
        { id: 3, start: 6, end: 9, text: "Real implementation needs audio processing" },
      ];
      
      setCaptions(demoWebSpeechCaptions);
      setError('Web Speech API demo. Real implementation requires audio extraction and processing.');
    } catch (err) {
      setError(`Web Speech API failed: ${err.message}`);
    } finally {
      setIsGeneratingCaptions(false);
    }
  }, [video]);

  const handlePresetChange = useCallback((e) => {
    setSelectedPreset(e.target.value);
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Remotion Video Captioning
          </h1>
          <p className="text-gray-600">
            Upload a video, generate captions, and preview with different styles
          </p>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload and Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Upload & Generate</h2>
            
            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <button
                  onClick={triggerFileInput}
                  disabled={isUploading}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isUploading ? 'Uploading...' : 'Upload Video'}
                </button>
              </div>

              {video && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700">Uploaded Video:</h3>
                  <p className="text-sm text-gray-600">{video.originalName}</p>
                  <p className="text-sm text-gray-500">
                    Size: {(video.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <strong>Caption Generation Options:</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• <strong>Demo:</strong> Free sample captions with Hinglish text</li>
                    <li>• <strong>Whisper.cpp:</strong> Local transcription (no API required)</li>
                    <li>• <strong>Gemini:</strong> Cloud transcription (requires API key)</li>
                    <li>• <strong>Web Speech:</strong> Browser-based (Chrome/Edge only)</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleGenerateCaptions('demo')}
                  disabled={!video || isGeneratingCaptions}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isGeneratingCaptions ? 'Generating...' : '🎦 Generate Demo Captions (Free)'}
                </button>
                
                <button
                  onClick={() => handleGenerateCaptions('whisper')}
                  disabled={!video || isGeneratingCaptions}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isGeneratingCaptions ? 'Generating...' : '🎙️ Local Whisper.cpp (No API Required)'}
                </button>
                
                <button
                  onClick={() => handleGenerateCaptions('gemini')}
                  disabled={!video || isGeneratingCaptions}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isGeneratingCaptions ? 'Generating...' : '🤖 Google Gemini (Requires API Key)'}
                </button>
                
                <button
                  onClick={handleWebSpeechCaptions}
                  disabled={!video || isGeneratingCaptions}
                  className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isGeneratingCaptions ? 'Generating...' : '🎤 Web Speech API (Browser)'}
                </button>
              </div>

              {captions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caption Style:
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(CAPTION_PRESETS).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Preview</h2>
            
            {video && captions.length > 0 ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <Player
                  component={CaptionedVideo}
                  inputProps={{
                    videoSrc: `http://localhost:3000${video.url}`,
                    captions,
                    preset: CAPTION_PRESETS[selectedPreset]
                  }}
                  durationInFrames={300} // Will be calculated dynamically
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={30}
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              </div>
            ) : video ? (
              <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                <video
                  src={`http://localhost:3000${video.url}`}
                  controls
                  className="max-w-full max-h-full"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Upload a video to see preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Caption List */}
        {captions.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Generated Captions</h2>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {captions.map((caption) => (
                <div key={caption.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">
                      {caption.start.toFixed(2)}s - {caption.end.toFixed(2)}s
                    </span>
                  </div>
                  <p className="mt-1 text-gray-800">{caption.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Section */}
        {video && captions.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Export Video</h2>
            <p className="text-gray-600 mb-4">
              To export your captioned video, run the following command in your terminal:
            </p>
            <code className="block bg-gray-100 p-4 rounded-lg text-sm font-mono">
              npx remotion render CaptionedVideo out/video-with-captions.mp4 --props='{JSON.stringify({
                videoSrc: `http://localhost:3000${video.url}`,
                captions,
                preset: CAPTION_PRESETS[selectedPreset]
              })}'
            </code>
          </div>
        )}
      </div>
    </div>
  );
};
