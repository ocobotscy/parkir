import { GoogleGenAI, Type } from "@google/genai";
import { OcrResult, VehicleType, ParkingTicket } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini Vision to extract license plate and vehicle type from an image.
 */
export const scanLicensePlate = async (base64Image: string): Promise<OcrResult | null> => {
  try {
    const modelId = "gemini-2.5-flash";
    
    // Clean base64 string if it contains metadata header
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "image/jpeg",
            },
          },
          {
            text: `Analyze this image of a vehicle. 
            1. Identify the license plate number. Remove spaces and special characters from the plate.
            2. Identify the vehicle type (CAR, MOTORCYCLE, or TRUCK).
            Return the result in JSON format.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                licensePlate: { type: Type.STRING },
                vehicleType: { type: Type.STRING, enum: ["CAR", "MOTORCYCLE", "TRUCK"] },
                confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" }
            },
            required: ["licensePlate", "vehicleType"]
        }
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as OcrResult;
    }
    return null;
  } catch (error) {
    console.error("OCR Error:", error);
    return null;
  }
};

/**
 * Uses Gemini to answer questions about the parking status.
 */
export const askParkingAssistant = async (
  query: string, 
  currentData: { tickets: ParkingTicket[], stats: any }
): Promise<string> => {
  try {
    // We convert dates to readable strings for the AI
    const dataContext = JSON.stringify({
      ...currentData,
      tickets: currentData.tickets.map(t => ({
        ...t,
        entryTime: t.entryTime.toLocaleString(),
        exitTime: t.exitTime ? t.exitTime.toLocaleString() : null
      }))
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a helpful Parking Management Assistant. 
      Here is the current parking facility data in JSON format: 
      ${dataContext}
      
      User Question: "${query}"
      
      Answer briefly and accurately based on the data provided. If you calculate revenue, explain the math briefly.`,
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I am having trouble connecting to the AI service right now.";
  }
};