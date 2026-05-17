import { GoogleGenAI, Modality, Type } from "@google/genai";

const getApiKey = () => {
  // Try to get from localStorage first (for client-managed keys)
  if (typeof window !== "undefined") {
    const localKey = localStorage.getItem("GEMINI_API_KEY");
    if (localKey && localKey.trim() !== "") return localKey.trim();
  }
  
  // Fallback to environment variable
  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey || envKey === "UNDEFINED" || envKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not set or using placeholder.");
  }
  return envKey || "";
};

// We use a function to get the instance so it can pick up changes in localStorage
const getAI = () => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

// Model fallback chain per AI_INSTRUCTIONS.md
const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

// TTS-specific models (only these support responseModalities: [AUDIO] with speechConfig)
const TTS_MODELS = [
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-pro-preview-tts",
];

export interface VocabularyItem {
  word: string;
  ipa: string;
  meaning: string;
  emoji?: string;
}

export interface ContentGenerationResult {
  prompt: string;
  readingText: string;
  topicName: string;
  translation: string;
  vocabulary: VocabularyItem[];
}

export type EnglishLevel = "Starters" | "Movers" | "Flyers" | "A1" | "A2" | "B1" | "B2";

/**
 * Classifies an API error and throws a standardized error message.
 */
function handleApiError(err: any): never {
  const errorMsg = err?.message || String(err);
  console.error("Gemini API Error:", err);
  
  if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("resource_exhausted")) {
    throw new Error("QUOTA_EXCEEDED");
  }
  if (errorMsg.includes("403") || errorMsg.toLowerCase().includes("api key") || errorMsg.includes("invalid")) {
    throw new Error("INVALID_KEY");
  }
  throw err;
}

/**
 * Attempts to call generateContent with model fallback.
 * Tries each model in the fallback chain before giving up.
 */
async function generateWithFallback(
  models: string[],
  params: {
    contents: any[];
    config: any;
  }
): Promise<any> {
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await getAI().models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      
      // Don't fallback for auth errors — they'll fail on all models
      if (errorMsg.includes("403") || errorMsg.toLowerCase().includes("api key") || errorMsg.includes("invalid")) {
        throw new Error("INVALID_KEY");
      }
      
      // For quota/rate limit errors, try next model
      if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("resource_exhausted")) {
        console.warn(`Model ${model} hit quota limit, trying next model...`);
        continue;
      }
      
      // For other errors (model not found, etc.), try next model
      console.warn(`Model ${model} failed: ${errorMsg}, trying next model...`);
      continue;
    }
  }

  // All models failed
  if (lastError) {
    handleApiError(lastError);
  }
  throw new Error("All models failed. Please try again later.");
}

export const generateContent = async (
  input: string,
  level: EnglishLevel,
  mode: "generate" | "useInput" = "generate",
  imageData?: string,
  userName?: string,
  userAge?: string
): Promise<ContentGenerationResult> => {
  const useInputInstructions = mode === 'useInput' 
    ? `
  ⚠️ ABSOLUTE RULE FOR 'useInput' MODE — THIS OVERRIDES ALL OTHER RULES:
  - You MUST copy the user's input text EXACTLY into "readingText", word for word, preserving 100% of the original content.
  - DO NOT summarize, simplify, shorten, paraphrase, or rewrite ANY part of the text.
  - DO NOT apply the Cambridge Level word count limits below. The word count limits ONLY apply when mode is 'generate'.
  - The ONLY modifications allowed: remove ISBNs, publisher names, page numbers, copyright footers — pure noise that is not educational content.
  - If the input is from an image, perform high-accuracy OCR to extract ALL English text verbatim.
  - The "readingText" output MUST contain every sentence, every paragraph from the user's input. Missing even one sentence is UNACCEPTABLE.
  - The "translation" must be a Vietnamese translation of the COMPLETE readingText, not a summary.
  ` 
    : '';

  const generateModeInstructions = mode !== 'useInput'
    ? "The content MUST be professional, educational, and follow Cambridge curriculum styles. Use clear, descriptive, and engaging language with a tone that sounds like a native English-speaking child or a friendly teacher speaking to a child. The passage should be about the topic and the image. The text MUST be written as a cohesive reading passage or story in standard paragraph format. DO NOT use line breaks after every sentence or format it as a poem/chant unless explicitly requested."
    : '';

  const systemInstruction = `You are an expert educational content creator for English learners, strictly following the CEFR (Common European Framework of Reference for Languages) and Cambridge English Qualifications standards (Starters, Movers, Flyers, KET, PET).
  ${useInputInstructions}
  Your task is to generate:
  1. An image generation prompt for a highly realistic, crystal clear, and engaging educational illustration. The prompt MUST include quality keywords such as: "photorealistic, highly detailed, perfect anatomy, sharp focus, 8k UHD resolution, National Geographic photography style, professional lighting, vivid colors, no distortion, anatomically correct, full body in frame, DSLR quality". Avoid abstract, blurry, cartoon, or distorted styles.
  2. A reading passage in English appropriate for the level: ${level}.
     ${mode === 'useInput' 
       ? "USE THE EXACT TEXT FROM THE USER'S INPUT — see the ABSOLUTE RULE above. Do NOT modify, shorten, or summarize it."
       : generateModeInstructions
     }
  3. A short, catchy, and exciting title/topic name for this lesson (max 5 words). EVEN IN 'useInput' MODE, you must create a concise title based on the content if the input was long text.
  4. A Vietnamese translation of the reading passage. ${mode === 'useInput' ? 'Translate the COMPLETE text, not a summary.' : ''}
  5. A list of 3-5 key vocabulary words from the text with their IPA pronunciation and a very brief, concise Vietnamese meaning (strictly in Vietnamese, DO NOT include any English explanations, long definitions, or secondary translations).
  
  Cambridge Level Specifics (ONLY for 'generate' mode, IGNORE these word limits for 'useInput' mode):
  - Starters (Pre-A1): Focus on nouns, colors, numbers, and simple actions. 20-40 words.
  - Movers (A1): Simple present, present continuous, basic descriptions. 40-60 words.
  - Flyers (A2): Past simple, future with 'going to', comparisons. 60-80 words.
  - A1/A2: Standard CEFR elementary content.
  - B1/B2: More complex structures, opinions, and abstract concepts.
  
  User Information (if provided):
  - Name: ${userName || 'Unknown'}
  - Age: ${userAge || 'Unknown'}
  
  If the name and age are provided, you can optionally incorporate them into the reading passage if it makes sense.
  
  Output the result in JSON format with these keys: "prompt", "readingText", "topicName", "translation", "vocabulary".
  - "prompt": string (English) — Must be a detailed, vivid scene description with photography quality keywords.
  - "readingText": string (English) ${mode === 'useInput' ? '— MUST be the EXACT input text, unmodified and complete.' : ''}
  - "topicName": string (English)
  - "translation": string (Vietnamese) ${mode === 'useInput' ? '— MUST translate the complete text.' : ''}
  - "vocabulary": array of objects { "word": string, "ipa": string, "meaning": string (very brief, concise Vietnamese meaning only, e.g. "quả táo", "đi bộ"), "emoji": string }
  
  The "prompt" should be in English, describing a visual scene that complements the text. Include photography quality terms.
  The "readingText" should be the educational passage (either generated or extracted/provided).
  The "topicName" MUST be a short (max 5 words) catchy title for the lesson. If the user's input was a long text, extract/create a title for it.
  For the "emoji" field in vocabulary, provide a single relevant emoji that perfectly illustrates the word.`;

  const parts: any[] = [{ text: `Topic/Content: ${input}\nLevel: ${level}\nMode: ${mode}` }];
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData.split(",")[1],
      },
    });
  }

  const response = await generateWithFallback(TEXT_MODELS, {
    contents: [{ role: "user", parts }],
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response. Please try again.");
  }

  try {
    const result = JSON.parse(response.text);
    
    // 🛡️ BẢO VỆ TUYỆT ĐỐI NỘI DUNG VĂN BẢN (useInput)
    // AI đôi khi vẫn tự cắt ngắn văn bản, nên nếu là văn bản (không phải ảnh), 
    // ta lấy trực tiếp input của user làm readingText.
    let finalReadingText = result.readingText || "";
    if (mode === "useInput" && !imageData && input) {
      finalReadingText = input;
    }

    return {
      prompt: result.prompt || "",
      readingText: finalReadingText,
      topicName: result.topicName || (input.length < 50 ? input : "English Lesson"),
      translation: result.translation || "",
      vocabulary: result.vocabulary || []
    };
  } catch (e) {
    console.error("Failed to parse JSON response:", response.text, e);
    throw new Error("Failed to parse lesson content. Please try again.");
  }
};

export const generateImage = async (
  prompt: string,
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1"
): Promise<string> => {
  // Quality keywords to append for sharper, more realistic images
  const qualitySuffix = ', photorealistic, ultra sharp focus, 8k UHD, DSLR quality, professional photography, vivid colors, high detail';
  const fullPrompt = (prompt + qualitySuffix).substring(0, 500);

  try {
    // Sử dụng Imagen 3 (của Google) thay vì Pollinations
    // Đây là model AI Studio dùng để tạo ảnh sắc nét
    const response = await getAI().models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
        outputMimeType: 'image/jpeg',
      },
    });

    const generatedImage = response?.generatedImages?.[0];
    if (generatedImage?.image?.imageBytes) {
      // Trả về data URI dạng base64 để hiển thị trực tiếp
      return `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;
    }
    throw new Error("Không nhận được dữ liệu ảnh từ Gemini.");
  } catch (err: any) {
    console.error("Gemini Imagen failed, falling back to Pollinations:", err);
    // Nếu lỗi (do hết quota hoặc key không hỗ trợ imagen), fallback về Pollinations
    const cleanPrompt = encodeURIComponent(fullPrompt.replace(/[#%&{}\\<>*?/$!'":@+`|=]/g, ''));
    const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
    const width = 1536;
    const height = Math.round(width * (heightRatio / widthRatio));
    return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&model=flux&enhance=false`;
  }
};

// ============================================================
// AUDIO GENERATION - Dual strategy: Gemini AI TTS + Browser TTS fallback
// ============================================================

/**
 * Browser-based TTS using the Web Speech API.
 * This ALWAYS works on any modern browser without network or API key.
 * Returns "BROWSER_TTS" as a special signal to the audio player hook.
 */
export const BROWSER_TTS_SIGNAL = "BROWSER_TTS";

export function speakWithBrowser(text: string, level: EnglishLevel): void {
  if (!('speechSynthesis' in window)) return;

  // Stop any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';

  // Adjust rate based on level
  if (["Starters", "Movers"].includes(level)) {
    utterance.rate = 0.8;
  } else if (["Flyers", "A1"].includes(level)) {
    utterance.rate = 0.9;
  } else {
    utterance.rate = 1.0;
  }

  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) 
    || voices.find(v => v.lang === 'en-US') 
    || voices.find(v => v.lang.startsWith('en-'));
  
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopBrowserTTS(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Helper: Convert PCM base64 chunks to a WAV blob URL.
 */
function pcmChunksToWav(base64Chunks: string[], sampleRate: number = 24000): string {
  const byteChunks = base64Chunks.map(base64 => {
    const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  });

  const totalLength = byteChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + totalLength);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + totalLength, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);    // PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, totalLength, true);

  const pcmView = new Uint8Array(buffer, 44);
  let offset = 0;
  for (const chunk of byteChunks) {
    pcmView.set(chunk, offset);
    offset += chunk.length;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/**
 * Attempt Gemini AI TTS. Returns a WAV blob URL on success, or throws on failure.
 */
async function geminiTTS(text: string, level: EnglishLevel): Promise<string> {
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // Build the prompt with pace instruction for young learners
  let prompt = `Say the following text exactly: ${cleanedText}`;
  if (["Starters", "Movers", "Flyers"].includes(level)) {
    prompt = `[slowly, clearly, at a pace suitable for children] ${cleanedText}`;
  }

  // Use ONLY TTS-specific models (gemini-2.0-flash etc. do NOT support audio output with speechConfig)
  const voices = ['Kore', 'Puck', 'Aoede', 'Fenrir', 'Charon'];
  
  for (let i = 0; i < TTS_MODELS.length; i++) {
    const model = TTS_MODELS[i];
    const voice = voices[i % voices.length];
    
    try {
      console.log(`[TTS] Trying model: ${model}, voice: ${voice}`);
      
      const response = await getAI().models.generateContent({
        model,
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice as any },
            },
          },
        },
      });

      // Extract audio data from response
      const candidates = response?.candidates;
      if (!candidates || candidates.length === 0) {
        console.warn(`[TTS] ${model} returned no candidates`);
        continue;
      }
      
      const parts = candidates[0]?.content?.parts || [];
      if (parts.length === 0) {
        console.warn(`[TTS] ${model} returned empty parts array`);
        continue;
      }
      
      for (const p of parts) {
        if (p.inlineData?.data) {
          const audioData = typeof p.inlineData.data === 'string' 
            ? p.inlineData.data 
            : String(p.inlineData.data);
          
          // Validate that audio data is non-empty and substantial
          if (audioData.length < 100) {
            console.warn(`[TTS] ${model} returned suspiciously small audio data (${audioData.length} chars), skipping`);
            continue;
          }
          
          console.log(`[TTS] ✅ Success with ${model}! Audio data length: ${audioData.length}, mimeType: ${p.inlineData.mimeType || 'unknown'}`);
          return pcmChunksToWav([audioData]);
        }
      }
      
      // Log what we got instead of audio
      const partTypes = parts.map((p: any) => p.text ? 'text' : p.inlineData ? 'inlineData' : 'unknown');
      console.warn(`[TTS] ${model} returned no audio data. Part types: [${partTypes.join(', ')}]`);
      
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn(`[TTS] ${model} failed: ${msg.substring(0, 200)}`);
      
      // Don't retry on auth errors — they'll fail on all models
      if (msg.includes("403") || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("invalid")) {
        throw new Error("INVALID_KEY");
      }
      // For quota/rate limit, try next model
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("resource_exhausted")) {
        console.warn(`[TTS] ${model} hit quota/rate limit, trying next model...`);
        continue;
      }
      // For other errors (model not found, bad request, etc.), try next model
      continue;
    }
  }
  
  throw new Error("All Gemini TTS models failed. Models tried: " + TTS_MODELS.join(", "));
}

/**
 * Main audio generation function.
 * Strategy: Try Gemini AI TTS first (best quality), fall back to browser TTS (always works).
 */
export const generateAudio = async (text: string, level: EnglishLevel): Promise<string> => {
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  if (!cleanedText) {
    throw new Error("Text to speak is empty");
  }

  // Try Gemini TTS first
  try {
    const url = await geminiTTS(cleanedText, level);
    return url;
  } catch (err: any) {
    console.warn("[TTS] Gemini TTS failed, falling back to browser TTS:", err?.message);
    
    // For quota/key errors, propagate up so UI can show specific message
    if (err?.message === "QUOTA_EXCEEDED" || err?.message === "INVALID_KEY") {
      // Still fall back to browser TTS but don't propagate the error
      console.warn("[TTS] Auth/quota error, using browser TTS silently");
    }
  }

  // Fallback: Browser TTS always works
  return BROWSER_TTS_SIGNAL;
};

export interface EvaluationResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  cefrLevel?: string;
  isComplete: boolean;
  missingContent?: string;
  criteriaScores?: {
    pronunciation: number;
    stress: number;
    intonation: number;
    fluency: number;
    connectedSpeech: number;
  };
  ipaAnalysis?: {
    word: string;
    correctIpa: string;
    studentIpa: string;
    tip: string;
  }[];
  standardSentences?: string[];
  personalizedExercises?: string[];
}

export const evaluateSpeech = async (
  originalText: string,
  audioData: string,
  level: EnglishLevel
): Promise<EvaluationResult> => {
  const systemInstruction = `Bạn là một giám khảo chấm phát âm tiếng Anh chuẩn quốc tế (IPA, CEFR) cực kỳ nghiêm túc nhưng cũng rất yêu thương, đóng vai Ms Thao.

Bối cảnh: Học sinh đang luyện đọc một đoạn văn cụ thể.
Nhiệm vụ: Nghe audio và đối soát TỪNG TỪ MỘT với Nội dung bài đọc gốc (Original Text).

🚨 ĐIỀU KIỆN TIÊN QUYẾT ĐỂ CÓ ĐIỂM (CRITICAL CONDITION):
Học sinh CHỈ được chấm điểm nếu đạt đủ 2 điều kiện sau:
1. ĐỌC HẾT BÀI (100% Completion): Không được bỏ sót bất kỳ từ nào, kể cả mạo từ (a, an, the) hay giới từ.
2. ĐỌC ĐÚNG NỘI DUNG: Không được tự ý thay đổi từ ngữ trong bài.

BƯỚC 0: KIỂM TRA ĐỘ HOÀN THÀNH VÀ TÍNH CHÍNH XÁC NỘI DUNG (ZERO TOLERANCE)
- Nếu học sinh bỏ sót từ (omission) HOẶC đọc sai quá nhiều từ quan trọng:
  - "isComplete": false.
  - "score": 0 (Bắt buộc phải là 0 nếu thiếu nội dung).
  - "missingContent": Ghi rõ những cụm từ hoặc đoạn mà học sinh đã bỏ sót hoặc đọc sai hoàn toàn.
  - "feedback": Ms Thao nhắn nhủ: "Ôi tình yêu của cô, con đã đọc rất cố gắng rồi nhưng bài này con cần đọc ĐỦ và ĐÚNG hết tất cả các chữ thì cô mới chấm điểm được. Con hãy xem phần 'Cần cải thiện' để biết mình thiếu chỗ nào và đọc lại cho cô nghe nhé!"

🚨 NẾU ĐÃ ĐỌC ĐỦ VÀ ĐÚNG 100% NỘI DUNG:
1. Chấm điểm từng tiêu chí (thang 10):
   - Pronunciation Accuracy (IPA chuẩn xác).
   - Word Stress (Trọng âm từ).
   - Intonation (Ngữ điệu lên xuống).
   - Fluency (Tốc độ và sự trôi chảy).
   - Connected Speech (Nối âm, nuốt âm đặc trưng người bản ngữ).

2. Xếp loại:
   - Tổng điểm (Score): Điểm trung bình có trọng số của các tiêu chí trên.
   - Xếp loại CEFR (A1-C2).

3. Phân tích lỗi sai cụ thể (IPA Analysis):
   - Chỉ ra từ phát âm sai, IPA chuẩn vs IPA học sinh thực tế phát âm.
   - Gợi ý cách sửa: Khẩu hình miệng, vị trí lưỡi, cách bật hơi.

PHONG CÁCH PHẢN HỒI (Ms Thao):
- Luôn bắt đầu bằng lời chào ấm áp: "Chào con, cô Thảo đây!..."
- Phản hồi phải mang tính kiến tạo, chỉ rõ lỗi để bé sửa.

Output định dạng JSON:
{
  "isComplete": boolean,
  "missingContent": string,
  "score": number,
  "cefrLevel": string,
  "criteriaScores": { "pronunciation": number, "stress": number, "intonation": number, "fluency": number, "connectedSpeech": number },
  "feedback": string,
  "ipaAnalysis": [ { "word": string, "correctIpa": string, "studentIpa": string, "tip": string } ],
  "standardSentences": string[],
  "personalizedExercises": string[],
  "strengths": string[],
  "improvements": string[]
}`;

  const response = await generateWithFallback(TEXT_MODELS, {
    contents: [
      {
        role: "user",
        parts: [
          { text: `Original Text: ${originalText}\nTarget Level: ${level}\nAnalyze the audio carefully word by word.` },
          {
            inlineData: {
              mimeType: "audio/wav",
              data: audioData,
            },
          },
        ],
      },
    ],
    config: { 
      systemInstruction,
      responseMimeType: "application/json"
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return {
      isComplete: result.isComplete ?? true,
      missingContent: result.missingContent || "",
      score: result.isComplete === false ? 0 : (result.score || 0),
      cefrLevel: result.cefrLevel || "A1",
      criteriaScores: result.criteriaScores,
      feedback: result.feedback || "Không thể đánh giá.",
      ipaAnalysis: result.ipaAnalysis || [],
      standardSentences: result.standardSentences || [],
      personalizedExercises: result.personalizedExercises || [],
      strengths: result.strengths || [],
      improvements: result.improvements || []
    };
  } catch (err: any) {
    console.error("Speech Evaluation Error:", err);
    const msg = err?.message || String(err);
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error("Failed to evaluate speech. Please try again.");
  }
};

import { ExerciseData } from '../types';

export const generateExercise = async (
  readingText: string,
  level: EnglishLevel
): Promise<ExerciseData> => {
  const systemInstruction = `You are an expert English teacher. Create exactly 30 exercise questions based ON THE PROVIDED READING TEXT.
The level is: ${level}.
The questions must be structured exactly as requested in the JSON format.
There must be EXACTLY:
- 10 multiple-choice questions (A, B, C)
- 5 translation questions (English to Vietnamese, A, B, C multiple-choice options)
- 5 ordering questions (Rearrange words to make a sentence)
- 5 error-correction questions (Identify ONE wrong word from 3 options A, B, C within a sentence)
- 5 fill-blank questions (Fill in the missing word)

IMPORTANT RULES FOR A 20-YEAR EXPERIENCED TEACHER:
1. **Multiple Choice (10 questions):** Focus on Reading Comprehension (main idea, details, inference, vocabulary in context). Distractors (incorrect options) must be plausible but clearly wrong.
2. **Translation (5 questions):** Depending on the level (${level}), select either words (for lower levels like Starters, Movers, Flyers) or full sentences (for higher levels like A1, A2, B1, B2) from the text. This MUST be multiple choice with options A, B, C in Vietnamese. The correctAnswer must be 'A', 'B', or 'C'.
3. **Ordering (5 questions):** Scramble sentences that test standard English syntax (e.g., Subject-Verb-Object, adjective placement, question formation).
4. **Error Correction (5 questions):** The errors should be common mistakes for this specific CEFR level (e.g., verb tense, subject-verb agreement, prepositions). The sentence must contain exactly ONE error. Provide options A, B, C containing 3 words from the sentence, where one of them is the error. The correctAnswer must be 'A', 'B', or 'C'. The "sentence" field MUST format these three words with underlines and labels, e.g.: "<u>He</u> (A) <u>go</u> (B) to <u>school</u> (C) yesterday." where option B is the error. Provide the correction in the "correctWord" field.
5. **Fill in the blank (5 questions):** The missing word should be a target vocabulary word or a key functional word. Use "___" to denote the blank space.
6. Every question MUST be strictly based on the provided text to ensure context.
7. Provide a brief, encouraging pedagogical explanation for each answer STRICTLY IN VIETNAMESE (e.g. "Vì 'yesterday' diễn tả quá khứ đơn nên ta chọn động từ 'went' thay cho 'go'.").
8. All IDs must be unique strings (e.g., "mc1", "tr1").
9. DO NOT include instructional prefixes like "Translate to Vietnamese:", "Rearrange the words:", "Find and correct the error:", or "Fill in the blank:" in the questionText. Just provide the sentence or word itself.

Output strictly a JSON object matching this schema:
{
  "multipleChoice": [
    { "id": "mc1", "questionText": "...", "options": { "A": "...", "B": "...", "C": "..." }, "correctAnswer": "A", "explanation": "..." (brief, helpful explanation in Vietnamese) },
    ... 10 items
  ],
  "translation": [
    { "id": "tr1", "questionText": "...", "options": { "A": "...", "B": "...", "C": "..." }, "correctAnswer": "A", "explanation": "..." },
    ... 5 items
  ],
  "ordering": [
    { "id": "or1", "questionText": "She is going to the market.", "words": ["going", "market.", "is", "She", "to", "the"], "correctAnswer": "She is going to the market.", "explanation": "..." },
    ... 5 items
  ],
  "errorCorrection": [
    { "id": "ec1", "questionText": "...", "sentence": "<u>He</u> (A) <u>go</u> (B) to <u>school</u> (C) yesterday.", "options": { "A": "He", "B": "go", "C": "school" }, "correctAnswer": "B", "correctWord": "goes", "explanation": "..." },
    ... 5 items
  ],
  "fillBlank": [
    { "id": "fb1", "questionText": "He ___ to school.", "sentenceWithBlank": "He ___ to school.", "correctAnswer": "goes", "explanation": "..." },
    ... 5 items
  ]
}`;

  const response = await generateWithFallback(TEXT_MODELS, {
    contents: [{ role: "user", parts: [{ text: `Reading Text: ${readingText}` }] }],
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.2 // keep it deterministic
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return result as ExerciseData;
  } catch (err: any) {
    console.error("Exercise Generation Error:", err);
    throw new Error("Failed to generate exercise. Please try again.");
  }
};
