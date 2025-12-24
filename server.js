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
app.use(express.json({ limit: '150mb' })); // Increased limit for larger videos

app.get('/health', (req, res) => res.status(200).json({ status: 'OK', uptime: process.uptime() }));

const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY is missing." });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview'; 
    
    const prompt = `Carefully watch this video and translate ALL dialogue into ${targetLanguageCode}.
    IMPORTANT: Identify each unique speaker. 
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
        temperature: 0.1
      }
    });

    const result = JSON.parse(response.text.trim());
    const formattedTranscript = (result.script || []).map(line => `${line.speakerId}: ${line.text}`).join('\n');
    const speakers = (result.speakers || []).slice(0, 2).map(s => ({
      id: s.id,
      gender: s.gender?.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE'
    }));

    res.json({ transcript: formattedTranscript, speakers });
  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-audio', async (req, res) => {
  try {
    const { analysis } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY missing" });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-preview-tts'; 

    let speechConfig = {};

    // Gemini API Rule: multiSpeakerVoiceConfig MUST have exactly 2 speakers.
    if (analysis.speakers.length === 2) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: analysis.speakers.map((s, idx) => ({
            speaker: s.id,
            voiceConfig: { 
              prebuiltVoiceConfig: { 
                voiceName: s.gender === 'FEMALE' ? 'Kore' : (idx === 0 ? 'Fenrir' : 'Puck')
              } 
            }
          }))
        }
      };
    } else {
      // Fallback for 1 speaker or more than 2 speakers (Gemini only supports 2 for multi-speaker)
      const primaryGender = analysis.speakers[0]?.gender || 'MALE';
      speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: { 
            voiceName: primaryGender === 'FEMALE' ? 'Kore' : 'Zephyr' 
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: analysis.transcript }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig
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

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Build not found.');
});

app.listen(port, '0.0.0.0', () => console.log(`✅ Live on port ${port}`));