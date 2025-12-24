
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

// Static Assets
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  app.use(express.static(__dirname));
  if (fs.existsSync(path.resolve(__dirname, 'public'))) {
    app.use(express.static(path.resolve(__dirname, 'public')));
  }
}

// API: Analyze Script
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY environment variable is missing on Railway" });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview'; 
    
    const prompt = `Task: Professional Multi-Speaker Video Dubbing Analysis.
    Identify ALL speakers in the video.
    Crucial: Differentiate between Adults and Children based on vocal pitch.
    Translate precisely into ${targetLanguageCode}.
    
    Output JSON ONLY:
    {
      "speakers": [
        { "id": "Speaker A", "gender": "MALE", "age": "ADULT" },
        { "id": "Speaker B", "gender": "FEMALE", "age": "CHILD" }
      ],
      "script": [
        { "speakerId": "Speaker A", "text": "Translated dialogue..." }
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

// API: Generate Audio
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { analysis } = req.body;
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-preview-tts'; 

    const getVoice = (s) => {
      if (s.age === 'CHILD') return 'Puck'; // Natural Child Voice
      if (s.gender === 'FEMALE') return 'Kore';
      return 'Fenrir'; // Deep Male Voice
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

// SPA Fallback
app.get('*', (req, res) => {
  let indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) indexPath = path.join(__dirname, 'index.html');
  res.sendFile(indexPath);
});

app.listen(port, '0.0.0.0', () => console.log(`DubStudio Server running on port ${port}`));
