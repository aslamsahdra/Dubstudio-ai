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
console.log(`📡 Listening on port: ${port}`);
console.log(`🔑 API Key Status: ${process.env.API_KEY ? 'Present (First 4 chars: ' + process.env.API_KEY.substring(0,4) + '...)' : 'MISSING!'}`);

app.use(cors());
app.use(express.json({ limit: '200mb' })); // Higher limit for high-res videos

app.get('/health', (req, res) => res.status(200).json({ status: 'OK', uptime: process.uptime() }));

const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log('✅ Serving production build from /dist');
  app.use(express.static(distPath));
}

app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY is not configured on Railway." });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview'; 
    
    const prompt = `Analyze this video and translate all spoken dialogue into ${targetLanguageCode}.
    Identify each speaker clearly.
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
    
    // Ensure we handle speaker detection robustly
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

app.post('/api/generate-audio', async (req, res) => {
  try {
    const { analysis } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API_KEY missing" });

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-preview-tts'; 

    let speechConfig = {};
    const validSpeakers = (analysis.speakers || []).slice(0, 2);

    // CRITICAL: Gemini multiSpeakerVoiceConfig requires EXACTLY 2 speakers.
    if (validSpeakers.length === 2) {
      console.log('🎙️ Using Multi-Speaker Config (2 speakers found)');
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
      console.log(`🎙️ Using Single Speaker Config (${validSpeakers.length} speakers detected)`);
      const primaryGender = validSpeakers[0]?.gender || 'MALE';
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
    if (!audioBase64) throw new Error("Audio synthesis failed - No data returned from model");

    res.json({ audioBase64 });
  } catch (error) {
    console.error("Audio Synthesis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Wait for production build to finish.');
});

app.listen(port, '0.0.0.0', () => console.log(`✅ Production server listening on 0.0.0.0:${port}`));