
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
app.use(express.json({ limit: '300mb' })); // Increased for longer videos

// Critical Production Path Setup
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log('DubStudio PRO: Serving from /dist');
  app.use(express.static(distPath));
} else {
  console.log('DubStudio PRO: Running in Development/Root mode');
  app.use(express.static(__dirname));
  if (fs.existsSync(path.resolve(__dirname, 'public'))) {
    app.use(express.static(path.resolve(__dirname, 'public')));
  }
}

// API: Script Analysis
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY configuration missing on Railway." });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview'; 
    
    const prompt = `Task: Master Production Video Dubbing Analysis.
    Analyze the video to identify ALL distinct speakers.
    Translate the dialogue naturally into ${targetLanguageCode}.
    Branding: Credit as "Aslam Sahdra Production".
    
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
    res.status(500).json({ error: "Video too large or analysis failed. Try a shorter clip." });
  }
});

// API: Audio Synthesis (TTS)
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { analysis } = req.body;
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-preview-tts'; 

    const getVoice = (s) => {
      if (s.age === 'CHILD') return 'Puck'; 
      if (s.gender === 'FEMALE') return 'Kore';
      return 'Fenrir';
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

// Final Fallback for Railway SPA
app.get('*', (req, res) => {
  let indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    indexPath = path.join(__dirname, 'index.html');
  }
  res.sendFile(indexPath);
});

app.listen(port, '0.0.0.0', () => console.log(`Aslam Sahdra Production Server: Online on Port ${port}`));
