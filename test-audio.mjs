// Quick test script: verify Gemini audio generation works
// Run: node test-audio.mjs YOUR_API_KEY

import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";

const apiKey = process.argv[2];
if (!apiKey) {
  console.error("Usage: node test-audio.mjs YOUR_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const MODELS_TO_TEST = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
];

const text = "Hello, this is a test. My name is Mrs. Dung.";

async function testModel(model) {
  console.log(`\n--- Testing model: ${model} ---`);
  try {
    // Test 1: Basic AUDIO modality without speechConfig
    console.log("  Test 1: Basic AUDIO modality...");
    const response1 = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Read this text aloud: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });

    const parts1 = response1?.candidates?.[0]?.content?.parts || [];
    console.log(`  Response parts count: ${parts1.length}`);
    for (const p of parts1) {
      if (p.inlineData) {
        console.log(`  ✅ SUCCESS! Got inlineData. mimeType: ${p.inlineData.mimeType}, data length: ${p.inlineData.data?.length || 0}`);
        // Save first successful audio
        if (p.inlineData.data) {
          const cleanData = String(p.inlineData.data).replace(/^data:.*?;base64,/, '');
          const buf = Buffer.from(cleanData, 'base64');
          fs.writeFileSync(`test-audio-${model.replace(/[^a-z0-9]/gi, '_')}.pcm`, buf);
          console.log(`  Saved raw PCM to test-audio-${model.replace(/[^a-z0-9]/gi, '_')}.pcm (${buf.length} bytes)`);
        }
      } else if (p.text) {
        console.log(`  ⚠️ Got text instead of audio: "${p.text.substring(0, 100)}"`);
      } else {
        console.log(`  ⚠️ Unknown part type:`, JSON.stringify(p).substring(0, 200));
      }
    }

    // Test 2: With speechConfig
    console.log("  Test 2: With speechConfig (Kore)...");
    try {
      const response2 = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: `Read this text: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });
      const parts2 = response2?.candidates?.[0]?.content?.parts || [];
      for (const p of parts2) {
        if (p.inlineData) {
          console.log(`  ✅ speechConfig works! data length: ${p.inlineData.data?.length || 0}`);
        } else {
          console.log(`  ⚠️ speechConfig returned non-audio part`);
        }
      }
    } catch (err) {
      console.log(`  ❌ speechConfig FAILED: ${err.message?.substring(0, 150)}`);
    }

  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message?.substring(0, 200)}`);
  }
}

(async () => {
  for (const model of MODELS_TO_TEST) {
    await testModel(model);
  }
  console.log("\n=== Done ===");
})();
