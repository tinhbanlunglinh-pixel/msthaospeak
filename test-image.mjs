import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config();
const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("API key not found");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function testImagen() {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: 'A highly detailed futuristic cityscape at sunset',
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
      },
    });
    
    console.log("Success!");
    if (response?.generatedImages) {
      console.log(`Generated ${response.generatedImages.length} images.`);
    } else {
      console.log("No images generated, response:", response);
    }
  } catch (err) {
    console.error("Error with 002:", err?.message || err);
    try {
      console.log("Trying 001...");
      const response2 = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: 'A highly detailed futuristic cityscape at sunset',
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
        },
      });
      console.log("Success with 001!");
      if (response2?.generatedImages) {
        console.log(`Generated ${response2.generatedImages.length} images.`);
      }
    } catch (err2) {
      console.error("Error with 001:", err2?.message || err2);
    }
  }
}

testImagen();
