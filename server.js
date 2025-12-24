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

console.log('🚀 DUBSTUDIO PRO BOOTING UP...');
console.log(`📡 Port: ${port}`);
console.log(`🔑 API Key: ${process.env.API_KEY ? 'ACTIVE' : 'NOT DETECTED'}`);

app.use(cors());
app.use(express.json({ limit: '120mb' }));

// Health Check for Railway/GCP
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', uptime: process.uptime() }));

// Serve Static Frontend from 'dist' folder
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log(`✅ Serving production frontend from: ${distPath}`);
  app.use(express.static(distPath));
} else {
  console.warn('⚠️ WARNING: "dist" folder not found. Did you run "npm run build"?');
}

// API: Analyze video and generate script
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "API_KEY is missing on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview'; 
    
    const prompt = `Analyze this video. Identify speakers and translate all dialogue into ${targetLanguageCode}. 
    Output ONLY valid JSON: 
    {
      "speakers": [{"id": "Speaker A", "gender": "MALE/FEMALE"}],
      "script": [{"speakerId": "Speaker A", "text": "translated dialogue"}]
    }`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: videoData } },
          { text: prompt }
        ]
      },
      config: { 
        responseMimeType: "application/json",
        temperature: 0
      }
    });

    const result = JSON.parse(response.text.trim());
    const formattedTranscript = (result.script || []).map(line => `${line.speakerId}: ${line.text}`).join('\n');
    const speakers = (result.speakers || []).map(s => ({
      id: s.id,
      gender: s.gender?.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE'
    }));

    res.json({ transcript: formattedTranscript, speakers });
  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Generate Audio (TTS)
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { analysis } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY is missing on the server." });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-preview-tts'; 

    const speakerConfigs = analysis.speakers.map((s, idx) => ({
      speaker: s.id,
      voiceConfig: { 
        prebuiltVoiceConfig: { 
          voiceName: s.gender === 'FEMALE' ? 'Kore' : (idx % 2 === 0 ? 'Fenrir' : 'Puck')
        } 
      }
    }));

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: analysis.transcript }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakerConfigs
          }
        }
      }
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) throw new Error("Audio synthesis failed");

    res.json({ audioBase64 });
  } catch (error) {
    console.error("Audio Synthesis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// SPA Fallback: All other routes serve index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Production build not found. Ensure "npm run build" was executed.');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server is listening on 0.0.0.0:${port}`);
});