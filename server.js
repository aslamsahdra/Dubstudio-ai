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

app.get('/health', (req, res) => res.status(200).json({ status: 'OK', engine: 'Neural 2025' }));

const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY missing" });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview'; 
    
    const prompt = `Task: High-Fidelity Video Dubbing Analysis.
    1. Watch the video meticulously.
    2. Identify unique speakers.
    3. ABSOLUTE REQUIREMENT: Determine if each speaker is MALE or FEMALE by visual and auditory cues.
    4. Translate the content to ${targetLanguageCode}.
    
    Format:
    {
      "speakers": [{"id": "Speaker A", "gender": "MALE/FEMALE"}],
      "script": [{"speakerId": "Speaker A", "text": "Translated text"}]
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
      gender: s.gender?.toUpperCase().includes('FEMALE') ? 'FEMALE' : 'MALE'
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

    if (validSpeakers.length === 2) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: validSpeakers[0].id,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: validSpeakers[0].gender === 'FEMALE' ? 'Kore' : 'Fenrir' } }
            },
            {
              speaker: validSpeakers[1].id,
              voiceConfig: { prebuiltVoiceConfig: { voiceName: validSpeakers[1].gender === 'FEMALE' ? 'Puck' : 'Zephyr' } }
            }
          ]
        }
      };
    } else {
      const primaryGender = validSpeakers[0]?.gender || 'MALE';
      speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: primaryGender === 'FEMALE' ? 'Kore' : 'Zephyr' }
        }
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

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Master Edition Not Found');
});

app.listen(port, '0.0.0.0');