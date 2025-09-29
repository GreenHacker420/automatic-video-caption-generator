import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

const FONT_FAMILIES = {
  hinglish: '"Noto Sans Devanagari", "Noto Sans", sans-serif',
  english: '"Noto Sans", sans-serif',
};

const PRESET_STYLES = {
  'bottom-centered': {
    position: 'bottom',
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '12px 24px',
    borderRadius: '8px',
    maxWidth: '80%',
    textAlign: 'center',
    fontSize: '32px',
    fontWeight: '600',
    color: 'white',
    lineHeight: '1.2',
  },
  'top-bar': {
    position: 'top',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '16px 32px',
    borderRadius: '0 0 12px 12px',
    width: '100%',
    textAlign: 'center',
    fontSize: '28px',
    fontWeight: '700',
    color: 'white',
    lineHeight: '1.3',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  'karaoke': {
    position: 'bottom',
    background: 'rgba(0, 0, 0, 0.8)',
    padding: '16px 32px',
    borderRadius: '12px',
    maxWidth: '90%',
    textAlign: 'center',
    fontSize: '36px',
    fontWeight: '700',
    color: 'white',
    lineHeight: '1.2',
    border: '2px solid #ffd700',
  },
};

export const CaptionRenderer = ({ caption, preset, currentWordData, currentTime }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const presetKey = Object.keys(PRESET_STYLES).includes(preset.style) 
    ? preset.style 
    : 'bottom-centered';
  
  const style = PRESET_STYLES[presetKey];
  
  // Animation for caption entrance
  const progress = interpolate(
    frame,
    [0, 15], // Fade in over 15 frames
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Detect if text contains Devanagari characters (Hindi)
  const containsHindi = useMemo(() => {
    const devanagariRegex = /[\u0900-\u097F]/;
    return devanagariRegex.test(caption.text);
  }, [caption.text]);

  // Position calculations
  const getPositionStyle = () => {
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: progress,
      transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
    };

    switch (style.position) {
      case 'top':
        return {
          ...baseStyle,
          top: 0,
          left: 0,
          right: 0,
          paddingTop: '40px',
        };
      case 'bottom':
      default:
        return {
          ...baseStyle,
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: '80px',
        };
    }
  };

  // Render karaoke-style text with word highlighting
  const renderKaraokeText = () => {
    if (!caption.words || caption.words.length === 0) {
      return <span>{caption.text}</span>;
    }

    return (
      <span>
        {caption.words.map((word, index) => {
          const isActive = currentWordData && currentWordData.word === word.word;
          const wordStyle = {
            color: isActive ? '#ffd700' : 'white',
            textShadow: isActive 
              ? '0 0 10px #ffd700, 0 0 20px #ffd700' 
              : '2px 2px 4px rgba(0, 0, 0, 0.8)',
            transition: 'all 0.1s ease',
            transform: isActive ? 'scale(1.1)' : 'scale(1)',
            display: 'inline-block',
            marginRight: '8px',
          };

          return (
            <span key={`${word.word}-${index}`} style={wordStyle}>
              {word.word}
            </span>
          );
        })}
      </span>
    );
  };

  const captionStyle = {
    ...style,
    fontFamily: containsHindi ? FONT_FAMILIES.hinglish : FONT_FAMILIES.english,
    textShadow: presetKey !== 'karaoke' ? '2px 2px 4px rgba(0, 0, 0, 0.8)' : undefined,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
  };

  return (
    <AbsoluteFill style={getPositionStyle()}>
      <div style={captionStyle}>
        {presetKey === 'karaoke' ? renderKaraokeText() : caption.text}
      </div>
    </AbsoluteFill>
  );
};
