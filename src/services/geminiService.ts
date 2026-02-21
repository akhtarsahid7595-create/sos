import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : (import.meta as any).env?.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || "" });

export async function getChatResponse(message: string, history: { role: "user" | "model"; parts: { text: string }[] }[]) {
  const model = "gemini-3.1-pro-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: `You are the SOS Script Vault Assistant. 
      Your goal is to help women in long-distance relationships communicate their needs, set boundaries, and protect their self-worth.
      You should be empathetic, empowering, and concise.
      If the user asks for a script, provide a high-value "I" statement script.
      Always remind them that they are a "Diamond" and their worth is inherent.
      Keep responses short and mobile-friendly.`,
    },
  });

  return response.text || "I'm sorry, I couldn't process that. Please try again.";
}
