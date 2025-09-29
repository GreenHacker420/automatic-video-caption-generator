import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
} from 'remotion';
import { CaptionRenderer } from './CaptionRenderer';

export const CaptionedVideo = ({ videoSrc, captions = [], preset = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Try to load props from localStorage if not provided
  const actualProps = useMemo(() => {
    if (videoSrc && captions.length > 0) {
      return { videoSrc, captions, preset };
    }
    
    // Try to load from localStorage (set by upload interface)
    try {
      const storedProps = localStorage.getItem('remotionProps');
      if (storedProps) {
        const parsed = JSON.parse(storedProps);
        return {
          videoSrc: parsed.videoSrc || videoSrc,
          captions: parsed.captions || captions,
          preset: parsed.preset || preset
        };
      }
    } catch (error) {
      console.warn('Could not load props from localStorage:', error);
    }
    
    return { videoSrc, captions, preset };
  }, [videoSrc, captions, preset]);
  
  // Convert frame to seconds
  const currentTime = frame / fps;
  
  // Find active captions at current time using functional approach
  const activeCaptions = useMemo(() => 
    actualProps.captions.filter(caption => 
      currentTime >= caption.start && currentTime <= caption.end
    ), [actualProps.captions, currentTime]
  );

  // Get current word for karaoke effect
  const currentWordData = useMemo(() => {
    if (actualProps.preset.style !== 'karaoke' || activeCaptions.length === 0) {
      return null;
    }

    const activeCaption = activeCaptions[0];
    if (!activeCaption.words) return null;

    // Find the current word based on timing
    const currentWord = activeCaption.words.find(word => 
      currentTime >= word.start && currentTime <= word.end
    );

    return currentWord ? {
      ...currentWord,
      progress: interpolate(
        currentTime,
        [currentWord.start, currentWord.end],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      )
    } : null;
  }, [activeCaptions, currentTime, actualProps.preset.style]);

  return (
    <AbsoluteFill>
      {/* Background Video */}
      <Video
        src={actualProps.videoSrc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      
      {/* Caption Overlay */}
      {activeCaptions.map((caption, index) => (
        <Sequence
          key={`${caption.id}-${index}`}
          from={Math.floor(caption.start * fps)}
          durationInFrames={Math.floor((caption.end - caption.start) * fps)}
        >
          <CaptionRenderer
            caption={caption}
            preset={actualProps.preset}
            currentWordData={currentWordData}
            currentTime={currentTime}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
