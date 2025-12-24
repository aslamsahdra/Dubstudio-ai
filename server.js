
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

app.get('/health', (req, res) => res.status(200).json({ status: 'OK', engine: 'Neural 2025 Master' }));

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
    
    const prompt = `Task: Professional Multi-Speaker Video Dubbing Analysis.
    Analyze the video meticulously to identify ALL speakers and their distinct vocal characteristics.
    
    CRITICAL INSTRUCTIONS:
    1. For each speaker, determine:
       - Gender: Is the speaker MALE or FEMALE?
       - Age Group: Is the speaker an ADULT or a CHILD? (Watch for pitch and appearance).
    2. Identify who is speaking at which time.
    3. Translate all speech accurately into ${targetLanguageCode}.
    
    Output JSON format only:
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

    // SMARTER VOICE MAPPING FOR REALISM:
    // Adult Male -> Fenrir (Strong, Deep)
    // Adult Female -> Kore (Clear, Natural)
    // Child -> Puck (High pitch, Young)
    
    if (validSpeakers.length >= 2) {
      speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: validSpeakers[0].id,
              voiceConfig: { 
                prebuiltVoiceConfig: { 
                  voiceName: validSpeakers[0].age === 'CHILD' ? 'Puck' : (validSpeakers[0].gender === 'FEMALE' ? 'Kore' : 'Fenrir') 
                } 
              }
            },
            {
              speaker: validSpeakers[1].id,
              voiceConfig: { 
                prebuiltVoiceConfig: { 
                  voiceName: validSpeakers[1].age === 'CHILD' ? 'Puck' : (validSpeakers[1].gender === 'FEMALE' ? 'Kore' : 'Fenrir') 
                } 
              }
            }
          ]
        }
      };
    } else {
      const sp = validSpeakers[0];
      const primaryVoice = sp?.age === 'CHILD' ? 'Puck' : (sp?.gender === 'FEMALE' ? 'Kore' : 'Fenrir');
      speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: primaryVoice }
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
