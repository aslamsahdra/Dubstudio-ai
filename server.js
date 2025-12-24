
import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '200mb' }));

// Set path for production build
const distPath = path.resolve(__dirname, 'dist');

// Serve static files from 'dist' first (critical for Railway/Production)
if (fs.existsSync(distPath)) {
  console.log('Serving from dist folder...');
  app.use(express.static(distPath));
} else {
  console.log('Dist folder not found, serving from root...');
  app.use(express.static(__dirname));
  const publicPath = path.resolve(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }
}

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', production: true }));

// API: Analyze Script
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY variable is missing on Railway dashboard" });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview'; 
    
    const prompt = `Task: Professional Multi-Speaker Video Dubbing Analysis.
    Analyze the video to identify ALL speakers.
    CRITICAL: Detect if any speaker is a CHILD (high pitch, small stature) vs ADULT.
    Translate the dialogue naturally into ${targetLanguageCode}.
    
    Output JSON ONLY:
    {
      "speakers": [
        { "id": "Speaker 1", "gender": "MALE", "age": "ADULT" },
        { "id": "Speaker 2", "gender": "FEMALE", "age": "CHILD" }
      ],
      "script": [
        { "speakerId": "Speaker 1", "text": "Translated line..." }
      ]
    }`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: videoData } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text.trim());
    const formattedTranscript = (result.script || []).map(line => `${line.speakerId}: ${line.text}`).join('\n');
    const speakers = (result.speakers || []).map(s => ({
      id: s.id,
      gender: s.gender?.toUpperCase().includes('FEMALE') ? 'FEMALE' : 'MALE',
      age: s.age?.toUpperCase().includes('CHILD') ? 'CHILD' : 'ADULT'
    }));

    res.json({ transcript: formattedTranscript, speakers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Generate Audio (TTS)
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { analysis } = req.body;
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-preview-tts'; 

    const getVoice = (s) => {
      if (s.age === 'CHILD') return 'Puck'; // Natural Child voice
      if (s.gender === 'FEMALE') return 'Kore';
      return 'Fenrir'; // Deep Male voice
    };

    const validSpeakers = (analysis.speakers || []).slice(0, 2);
    let speechConfig = {};

    if (validSpeakers.length >= 2) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: validSpeakers[0].id, voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoice(validSpeakers[0]) } } },
            { speaker: validSpeakers[1].id, voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoice(validSpeakers[1]) } } }
          ]
        }
      };
    } else {
      speechConfig = {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoice(validSpeakers[0] || {age: 'ADULT', gender: 'MALE'}) } }
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: analysis.transcript }] },
      config: { responseModalities: [Modality.AUDIO], speechConfig }
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({ audioBase64 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA Catch-all: Always serve the build's index.html
app.get('*', (req, res) => {
  let indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    indexPath = path.join(__dirname, 'index.html');
  }
  res.sendFile(indexPath);
});

app.listen(port, '0.0.0.0', () => console.log(`Master Server running on port ${port}`));
