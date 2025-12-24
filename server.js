
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

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', engine: 'Neural 2025 Master' }));

// IMPORTANT: Serve static files from root or dist depending on environment
// On Railway/Production, we usually serve from 'dist' after 'npm run build'
const distPath = path.resolve(__dirname, 'dist');
const publicPath = path.resolve(__dirname, 'public');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  // Fallback for development/direct serve
  app.use(express.static(__dirname));
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }
}

app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY missing" });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview'; 
    
    const prompt = `Task: Professional Multi-Speaker Video Dubbing Analysis.
    Identify ALL speakers in the video and their vocal profiles.
    
    CRITICAL INSTRUCTIONS:
    1. For each speaker, determine:
       - Gender: MALE or FEMALE.
       - Age Group: ADULT or CHILD. (Crucial: Identify children by high pitch and smaller stature).
    2. Map the dialogue meticulously.
    3. Translate accurately into ${targetLanguageCode}.
    
    Output JSON ONLY:
    {
      "speakers": [
        { "id": "Speaker A", "gender": "MALE", "age": "ADULT" },
        { "id": "Speaker B", "gender": "FEMALE", "age": "CHILD" }
      ],
      "script": [
        { "speakerId": "Speaker A", "text": "Translated text..." }
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
      config: { responseMimeType: "application/json", temperature: 0.1 }
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

app.post('/api/generate-audio', async (req, res) => {
  try {
    const { analysis } = req.body;
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-preview-tts'; 

    let speechConfig = {};
    const validSpeakers = (analysis.speakers || []).slice(0, 2);

    const getVoice = (s) => {
      if (s.age === 'CHILD') return 'Puck'; // Best child voice
      if (s.gender === 'FEMALE') return 'Kore';
      return 'Fenrir'; // Strong male voice
    };

    if (validSpeakers.length >= 2) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: validSpeakers[0].id,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoice(validSpeakers[0]) } }
            },
            {
              speaker: validSpeakers[1].id,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoice(validSpeakers[1]) } }
            }
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

// Serve index.html for any other route (SPA)
app.get('*', (req, res) => {
  let indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    indexPath = path.join(__dirname, 'index.html');
  }
  res.sendFile(indexPath);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Master Server Live on port ${port}`);
});
