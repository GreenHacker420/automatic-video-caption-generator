#!/usr/bin/env node

// Script to generate the exact export command for Remotion
// Usage: node generate-export-command.js

import fs from 'fs';
import path from 'path';

// Sample data based on your demo captions
const sampleData = {
  videoSrc: "http://localhost:3000/uploads/e44c0d2e-59d2-460d-8ad6-ca98cf27e114-bug.mp4",
  captions: [
    {
      id: 1,
      start: 0,
      end: 3,
      text: "Welcome to this amazing video demonstration",
      words: [
        { word: "Welcome", start: 0, end: 0.4 },
        { word: "to", start: 0.4, end: 0.8 },
        { word: "this", start: 0.8, end: 1.2 },
        { word: "amazing", start: 1.2, end: 1.6 },
        { word: "video", start: 1.6, end: 2 },
        { word: "demonstration", start: 2, end: 2.4 }
      ]
    },
    {
      id: 2,
      start: 3,
      end: 6,
      text: "यह एक बेहतरीन वीडियो का उदाहरण है",
      words: [
        { word: "यह", start: 3, end: 3.4 },
        { word: "एक", start: 3.4, end: 3.8 },
        { word: "बेहतरीन", start: 3.8, end: 4.2 },
        { word: "वीडियो", start: 4.2, end: 4.6 },
        { word: "का", start: 4.6, end: 5 },
        { word: "उदाहरण", start: 5, end: 5.4 },
        { word: "है", start: 5.4, end: 5.8 }
      ]
    },
    {
      id: 3,
      start: 6,
      end: 9,
      text: "This shows how captions work perfectly",
      words: [
        { word: "This", start: 6, end: 6.4 },
        { word: "shows", start: 6.4, end: 6.8 },
        { word: "how", start: 6.8, end: 7.2 },
        { word: "captions", start: 7.2, end: 7.6 },
        { word: "work", start: 7.6, end: 8 },
        { word: "perfectly", start: 8, end: 8.4 }
      ]
    },
    {
      id: 4,
      start: 9,
      end: 12,
      text: "Multiple styles और effects के साथ",
      words: [
        { word: "Multiple", start: 9, end: 9.4 },
        { word: "styles", start: 9.4, end: 9.8 },
        { word: "और", start: 9.8, end: 10.2 },
        { word: "effects", start: 10.2, end: 10.6 },
        { word: "के", start: 10.6, end: 11 },
        { word: "साथ", start: 11, end: 11.4 }
      ]
    },
    {
      id: 5,
      start: 12,
      end: 15,
      text: "Beautiful typography and smooth animations",
      words: [
        { word: "Beautiful", start: 12, end: 12.4 },
        { word: "typography", start: 12.4, end: 12.8 },
        { word: "and", start: 12.8, end: 13.2 },
        { word: "smooth", start: 13.2, end: 13.6 },
        { word: "animations", start: 13.6, end: 14 }
      ]
    },
    {
      id: 6,
      start: 15,
      end: 18,
      text: "Perfect for all your video needs",
      words: [
        { word: "Perfect", start: 15, end: 15.4 },
        { word: "for", start: 15.4, end: 15.8 },
        { word: "all", start: 15.8, end: 16.2 },
        { word: "your", start: 16.2, end: 16.6 },
        { word: "video", start: 16.6, end: 17 },
        { word: "needs", start: 17, end: 17.4 }
      ]
    }
  ],
  preset: {
    name: "Bottom Centered",
    position: "bottom",
    style: "bottom-centered"
  }
};

// Calculate duration
const maxEndTime = Math.max(...sampleData.captions.map(c => c.end));
const durationInFrames = Math.ceil(maxEndTime * 30); // 30 fps

// Generate the command
const command = `npx remotion render CaptionedVideo out/captioned-video.mp4 --props='${JSON.stringify(sampleData)}' --frames=${durationInFrames}`;

console.log('🎬 Remotion Export Command:');
console.log('=' .repeat(80));
console.log(command);
console.log('=' .repeat(80));
console.log(`📊 Video Duration: ${maxEndTime}s (${durationInFrames} frames at 30fps)`);
console.log(`📝 Captions: ${sampleData.captions.length} segments`);
console.log(`🎨 Style: ${sampleData.preset.name}`);

// Save to file for easy copying
fs.writeFileSync('export-command.txt', command);
console.log('💾 Command saved to export-command.txt');
