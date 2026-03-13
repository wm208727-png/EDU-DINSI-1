import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text || !targetLanguage || targetLanguage === 'English') return text;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text into ${targetLanguage}. Return only the translated text, nothing else.\n\nText: ${text}`,
    });
    
    return response.text || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

export async function generateExpertSummary(topic: string, subject: string, grade: number): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed, expert-level educational summary for Grade ${grade} ${subject} on the topic: "${topic}". 
      The summary should be long, professional, and include key points for exams. 
      Use clear headings and bullet points.`,
    });
    
    return response.text || "Failed to generate summary.";
  } catch (error) {
    console.error("Summary generation error:", error);
    return "Error generating content. Please try again.";
  }
}
