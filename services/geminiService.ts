import { GoogleGenAI, Modality } from "@google/genai";
import { Language, ScriptAnalysis, Speaker } from "../types";

// ==========================================
// CONFIGURATION: SERVER VS CLIENT MODE
// ==========================================
const USE_CUSTOM_SERVER = false; 
const API_BASE_URL = "http://localhost:3000/api"; 
// ==========================================

const getClient = () => {
  const apiKey = process.env.API_KEY;eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNGVmYWYyNy00MTI2LTRjY2UtYjlmZC1jN2E2NGU0ZjZjNjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjRkYWEwOGU2LTM4NDItNDNlYy1hNDA5LWYzZTc2MGI0Njk4MSIsImlhdCI6MTc2NTM2NjU5Mn0.r8gNTtcAFsmwat4vbDqv6XoYSR4TgGUV_xUcALEI6sI
  if (!apiKey) throw new Error("API Key is missing. Please ensure your environment is configured.");
  return new GoogleGenAI({ apiKey });
};

export const generateTranslatedScript = async (
  videoBase64: string,
  mimeType: string,
  targetLanguage: Language
): Promise<ScriptAnalysis> => {
  
  if (USE_CUSTOM_SERVER) {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoData: videoBase64, 
          mimeType, 
          targetLanguageCode: targetLanguage.code 
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Server failed to analyze video");
      }
      return await response.json();

    } catch (serverError) {
      console.error("Server connection failed", serverError);
      throw serverError;
    }
  }

  try {
    const ai = getClient();
    const model = "gemini-3-flash-preview"; 
    
    const prompt = `
      You are an expert video dubbing and diarization assistant.
      1. Watch this video and listen to the audio carefully.
      2. Identify ALL distinct speakers.
      3. Determine the GENDER of each speaker (MALE or FEMALE).
      4. Translate the spoken content into ${targetLanguage.name}.
      5. Return the result in strictly parsable JSON format with this structure:
      {
        "speakers": [
          { "id": "Speaker A", "gender": "MALE" },
          { "id": "Speaker B", "gender": "FEMALE" }
        ],
        "script": [
          { "speakerId": "Speaker A", "text": "Translated line..." },
          { "speakerId": "Speaker B", "text": "Translated response..." }
        ]
      }
      6. Do not add any markdown formatting. Just return raw JSON.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType, data: videoBase64 } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    if (!response.text) throw new Error("No response generated from Gemini.");

    let jsonString = response.text.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(json)?|```$/g, '');
    }
    
    const result = JSON.parse(jsonString);
    
    const formattedTranscript = (result.script || []).map((line: any) => `${line.speakerId}: ${line.text}`).join('\n');
    const speakers = (result.speakers || []).map((s: any) => ({
      id: s.id,
      gender: (s.gender?.toUpperCase() === 'FEMALE') ? 'FEMALE' : 'MALE'
    }));

    return { transcript: formattedTranscript, speakers };

  } catch (error) {
    console.error("Analysis error:", error);
    throw new Error("Could not analyze video. It might be too large or have a format issue.");
  }
};

export const generateDubbedAudio = async (
  analysis: ScriptAnalysis,
  targetLanguage: Language
): Promise<string> => {
  
  if (USE_CUSTOM_SERVER) {
    try {
      const response = await fetch(`${API_BASE_URL}/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, targetLanguageCode: targetLanguage.code })
      });
      if (!response.ok) throw new Error("Server failed to generate audio");
      const data = await response.json();
      return data.audioBase64;
    } catch (serverError) {
       throw serverError;
    }
  }

  try {
    const ai = getClient();
    const model = "gemini-2.5-flash-preview-tts"; 

    const speechConfig = {
      multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
              { speaker: "Speaker A", voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
              { speaker: "Speaker B", voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
          ]
      }
    };
    
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: analysis.transcript }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("Audio generation produced no data.");
    return audioData;
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};