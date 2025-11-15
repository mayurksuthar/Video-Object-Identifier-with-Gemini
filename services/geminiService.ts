import { GoogleGenAI, Type } from "@google/genai";

// --- DEVELOPMENT TOGGLE ---
// Set to true to use local mock data and bypass the Gemini API.
// This is useful for offline development, testing UI, and avoiding API errors/costs.
const USE_MOCK_DATA = false;

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

interface VideoObject {
  name: string;
  description: string;
  timestamp: number;
  boundingBox: BoundingBox;
  price: string;
}

interface IdentifyResult {
  objects: VideoObject[];
  rawJson: string;
}

const getMockData = (targetObjects: string[]): IdentifyResult => {
    console.warn("Using mock data. To use the real Gemini API, set USE_MOCK_DATA to false in geminiService.ts");
    const mockObjects: VideoObject[] = [
        {
            name: "Mock Glock 17",
            description: "A standard issue mock handgun.",
            timestamp: 2.5,
            boundingBox: { x_min: 0.25, y_min: 0.4, x_max: 0.45, y_max: 0.6 },
            price: "$500 - $600"
        },
        {
            name: "Mock AR-15",
            description: "A mock semi-automatic rifle with a scope.",
            timestamp: 5.1,
            boundingBox: { x_min: 0.1, y_min: 0.3, x_max: 0.8, y_max: 0.5 },
            price: "$800 - $1200"
        },
        {
            name: "Mock Shotgun",
            description: "A mock pump-action shotgun.",
            timestamp: 8.9,
            boundingBox: { x_min: 0.3, y_min: 0.6, x_max: 0.9, y_max: 0.8 },
            price: "$300 - $500"
        },
        {
            name: `Mock ${targetObjects[0] || 'Object'}`,
            description: "A generic mock item based on your query.",
            timestamp: 11.2,
            boundingBox: { x_min: 0.6, y_min: 0.1, x_max: 0.8, y_max: 0.3 },
            price: "$100 - $200"
        }
    ];
    const rawJson = JSON.stringify(mockObjects, null, 2);
    return { objects: mockObjects, rawJson };
};

export const identifyObjectsInVideo = async (videoFile: File, targetObjects: string[]): Promise<IdentifyResult> => {
  if (USE_MOCK_DATA) {
    return getMockData(targetObjects);
  }

  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';

  const base64Video = await fileToBase64(videoFile);

  const prompt = `
    You are a precision object detection system. Your mission is to perform an exhaustive and meticulous scan of this video to identify EVERY SINGLE UNIQUE INSTANCE of the following items: **${targetObjects.join(', ')}**.

    **CRITICAL DIRECTIVES - PRECISION IS PARAMOUNT:**
    - **SPECIFIC NAMING:** You MUST identify the object by its most specific name possible. For example, instead of 'pistol', identify it as 'Glock 19 Gen 5'. Instead of 'car', identify it as 'Red 2021 Honda Civic'. Generic names are unacceptable.
    - **IDENTIFY ALL PHYSICAL INSTANCES:** This is your #1 most important rule. You must identify every single physically separate instance of an object. For example, if you see four guns on a table, even if they are the exact same model, you MUST return four separate entries. Do NOT group or de-duplicate physically separate items. Missing any instance is a failure.
    - **EXHAUSTIVE SEARCH:** You must find ALL instances of the target objects. Pay extreme attention to objects in the background, those that appear briefly, are partially obscured, or are in cluttered scenes.
    - **ACCURATE BOUNDING BOXES:** This is non-negotiable. The bounding box coordinates MUST be extremely precise and tightly frame the object.
    - **HIGH-CONFIDENCE IDENTIFICATION:** Scrutinize details to ensure correct identification. Differentiate between real items and look-alikes. If you are not highly confident, do not include the object.
    - **REALISTIC PRICING:** Provide a realistic, estimated current market price in USD for each object (e.g., "$450 - $550").

    **Output Format:**
    You MUST return a valid JSON array of objects. Each object represents ONE unique detected item and must contain these FIVE keys:
    1. "name": (String) The most specific name possible (e.g., 'Glock 19 Gen 5', not just 'pistol').
    2. "description": (String) A concise visual description of the object.
    3. "timestamp": (Number) The precise time in seconds (e.g., 12.75) when the object is best seen.
    4. "boundingBox": (Object) An object with normalized coordinates ("x_min", "y_min", "x_max", "y_max"). The box MUST be a tight fit around the object's visible pixels with minimal to no background padding.
    5. "price": (String) A formatted string representing the estimated current market price in USD.

    Before responding, perform a final review of your work to ensure you have not missed or incorrectly grouped any items. If no instances of the target objects are detected, you must return an empty JSON array: [].
  `;
  
  const maxRetries = 3;
  let delay = 1000; // start with 1 second

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: videoFile.type,
                data: base64Video,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: 'The specific model/type of the object (e.g. "Glock 19 Gen 5").',
                },
                description: {
                  type: Type.STRING,
                  description: 'A brief visual description of the object.',
                },
                timestamp: {
                  type: Type.NUMBER,
                  description: 'The time in seconds when the object is most clearly visible.',
                },
                boundingBox: {
                  type: Type.OBJECT,
                  description: 'Critically accurate, normalized coordinates of the bounding box. Must be a tight fit.',
                  properties: {
                    x_min: { type: Type.NUMBER },
                    y_min: { type: Type.NUMBER },
                    x_max: { type: Type.NUMBER },
                    y_max: { type: Type.NUMBER },
                  },
                  required: ['x_min', 'y_min', 'x_max', 'y_max'],
                },
                price: {
                  type: Type.STRING,
                  description: 'Estimated market price in USD as a formatted string.',
                },
              },
              required: ['name', 'description', 'timestamp', 'boundingBox', 'price'],
            },
          },
        },
      });

      const text = response.text.trim();
      if (!text) {
        return { objects: [], rawJson: '[]' };
      }
      
      const objects: VideoObject[] = JSON.parse(text);
      
      return { objects: objects, rawJson: text };
    } catch (error: any) {
      // Check if the error is a 503 Service Unavailable error
      const isServiceUnavailable = error.message?.includes('503') || error.message?.includes('UNAVAILABLE') || error.message?.includes('overloaded');

      if (isServiceUnavailable && i < maxRetries - 1) {
        console.warn(`Gemini API is overloaded. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
        continue; // Go to the next iteration of the loop to retry
      }
      
      console.error("Error generating content from Gemini API:", error);
      throw new Error("Failed to identify objects in the video. The model may have returned an error or invalid data after multiple retries.");
    }
  }

  // This line should theoretically not be reached, but it's good practice for type safety.
  throw new Error("Exhausted all retries to the Gemini API.");
};