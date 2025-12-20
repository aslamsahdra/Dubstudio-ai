import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
// Load environment variables (API Key)eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNGVmYWYyNy00MTI2LTRjY2UtYjlmZC1jN2E2NGU0ZjZjNjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjRkYWEwOGU2LTM4NDItNDNlYy1hNDA5LWYzZTc2MGI0Njk4MSIsImlhdCI6MTc2NTM2NjU5Mn0.r8gNTtcAFsmwat4vbDqv6XoYSR4TgGUV_xUcALEI6sI
dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Allow frontend to talk to backend
// Increased limit to 100MB to match frontend constraints
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Initialize Google AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ==========================================
// API ROUTE 1: Analyze Video & Generate Script
// ==========================================
app.post('/api/analyze-script', async (req, res) => {
  try {
    const { videoData, mimeType, targetLanguageCode } = req.body;

    if (!videoData) {
      return res.status(400).json({ error: "No video data received." });
    }

    console.log(`Analyzing video for language: ${targetLanguageCode}...`);

    const model = "gemini-3-flash-preview"; 
    
    const prompt = `
      You are an expert video dubbing assistant.
      1. Identify ALL distinct speakers.
      2. Determine GENDER of each speaker (MALE or FEMALE).
      3. Translate content into language code: ${targetLanguageCode}.
      4. Return strictly valid JSON:
      {
        "speakers": [{ "id": "Speaker A", "gender": "MALE" }],
        "script": [{ "speakerId": "Speaker A", "text": "Translated text..." }]
      }
    `;

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

    let jsonString = response.text.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(json)?|```$/g, '');
    }
    const result = JSON.parse(jsonString);

    const formattedTranscript = result.script.map(line => `${line.speakerId}: ${line.text}`).join('\n');
    const speakers = result.speakers.map(s => ({
        id: s.id,
        gender: s.gender?.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE'
    }));

    res.json({ transcript: formattedTranscript, speakers });

  } catch (error) {
    console.error("Error in analyze-script:", error);
    res.status(500).json({ error: error.message || "Failed to analyze video on server." });
  }
});

// ==========================================
// API ROUTE 2: Generate Audio (TTS)
// ==========================================
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { analysis, targetLanguageCode } = req.body;
    if (!analysis) return res.status(400).json({ error: "Missing analysis data." });

    console.log("Generating audio...");

    const model = "gemini-2.5-flash-preview-tts";
    
    const speechConfig = {
        multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
                { speaker: "Voice 1", voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                { speaker: "Voice 2", voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
            ]
        }
    };

    let finalTranscript = analysis.transcript;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: finalTranscript }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) throw new Error("No audio generated from AI model.");

    res.json({ audioBase64: audioData });

  } catch (error) {
    console.error("Error in generate-audio:", error);
    res.status(500).json({ error: error.message || "Failed to generate audio on server." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});