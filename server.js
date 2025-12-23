import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

console.log('--- DUBSTUDIO STARTUP ---');
console.log('PORT:', port);
console.log('API_KEY:', process.env.API_KEY ? 'CONFIGURED ✅' : 'MISSING ❌');
console.log('---------------------');

app.use(cors());
app.use(express.json({ limit: '120mb' }));

// Health check for Railway monitoring
app.get('/health', (req, res) => res.status(200).send('OK'));

// Static file serving from 'dist'
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// API: Analyze video and generate script
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "Missing API_KEY in server environment." });
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
    if (!apiKey) return res.status(500).json({ error: "API_KEY Missing" });

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
    console.error("Audio Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});