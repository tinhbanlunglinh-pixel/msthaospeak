import { GoogleGenAI, Modality, Type } from "@google/genai";

const parseSafeJson = (text: string) => {
  let cleaned = (text || "{}").trim();
  // Strip markdown backticks if present
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // If generation was truncated due to length limits (30 questions), attempt to gracefully auto-close the JSON
    const fixes = [
      cleaned,
      cleaned + '}',
      cleaned + ']}',
      cleaned + '}]}',
      cleaned + '"}]}',
      cleaned.replace(/,\s*$/, '') + ']}', // Remove trailing comma and close
      cleaned.replace(/,\s*$/, '') + '}]}'
    ];
    
    for (const fix of fixes) {
      try {
        return JSON.parse(fix);
      } catch (e) {
        // Continue trying
      }
    }
    throw err; // If all fixes fail, throw the original error
  }
};

const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || "";
};
const getAI = () => {
  return new GoogleGenAI({
    apiKey: getApiKey(),
  });
};
// Model fallback chain — use only currently available, non-deprecated models
const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
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
 * Includes a short retry delay for quota (429) errors.
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
    // Retry up to 2 times per model for transient quota errors
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Trying model: ${model} (attempt ${attempt + 1})`);
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

        const isQuota = errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("resource_exhausted");
        
        if (isQuota && attempt === 0) {
          // Wait 3 seconds before retrying the same model
          console.warn(`Model ${model} hit quota limit, retrying in 3s...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        
        console.warn(`Model ${model} failed (attempt ${attempt + 1}): ${errorMsg.substring(0, 200)}`);
        break; // Move to next model
      }
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

  const systemInstruction = `You are a highly skilled, expert English teacher and educational content creator for English learners. You strictly follow the CEFR (Common European Framework of Reference for Languages) and Cambridge English Qualifications standards (Starters, Movers, Flyers, KET, PET).
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
  
  Cambridge & CEFR Level Specifics (ONLY for 'generate' mode, IGNORE these limits for 'useInput' mode):
  - Starters (Pre-A1): 
    * Word Count: STRICTLY 15 to 25 words. 
    * Grammar: Only simple present tense of 'to be' (am/is/are), 'have got', 'can' (for ability), simple nouns, basic colors, animals, objects, and basic adjectives. Only simple sentences (Subject + Verb + Object). Absolutely NO compound sentences (no 'and', 'but' joining clauses), NO past/future tense, and NO complex vocabulary.
  - Movers (A1): 
    * Word Count: STRICTLY 25 to 45 words.
    * Grammar: Simple present, present continuous, basic prepositions of place (in, on, under, next to, behind), basic modal verbs (can/must), simple descriptions.
  - Flyers (A2): 
    * Word Count: STRICTLY 45 to 65 words.
    * Grammar: Past simple, future with 'going to', basic comparative adjectives, simple conjunctions (and, but, because).
  - A1: 
    * Word Count: STRICTLY 40 to 60 words.
    * Grammar: Simple tenses (present, past, future). Simple everyday vocabulary.
  - A2: 
    * Word Count: STRICTLY 60 to 80 words.
    * Grammar: Present perfect (simple experiences), past continuous, basic relative clauses (who/which/that), simple modal verbs (should/could).
  - B1: 
    * Word Count: STRICTLY 100 to 150 words.
    * Grammar: Past perfect, passive voice, relative clauses, compound and complex sentences, expressing opinions and plans.
  - B2: 
    * Word Count: STRICTLY 150 to 200 words.
    * Grammar: Conditional sentences (type 1, 2, 3), passive voice, advanced tenses, subjunctions, complex structures.
  
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
    const result = parseSafeJson(response.text);
    
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
  level: EnglishLevel,
  mimeType: string = "audio/webm"
): Promise<EvaluationResult> => {
  const systemInstruction = `Bạn là Ms Thao — giáo viên tiếng Anh, đóng vai giám khảo chấm phát âm theo chuẩn Khung tham chiếu Châu Âu (CEFR).
Bạn nghe audio thu âm từ micro trình duyệt (có thể là giọng trẻ em hoặc người lớn). Chất lượng audio có thể không hoàn hảo — hãy cố gắng HẾT SỨC để nhận diện nội dung người đọc nói.

🎯 NHIỆM VỤ: Nghe audio → So sánh với bài gốc (Original Text) → Chấm điểm thang 10.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 QUY TRÌNH CHẤM ĐIỂM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BƯỚC 1: NGHE VÀ NHẬN DIỆN
- Cố gắng tối đa nhận diện từng câu, từng từ trong audio.
- KHÔNG được đánh "isComplete: false" chỉ vì audio khó nghe hoặc chất lượng thấp.
- Nếu nghe được phần lớn nội dung (≥70%) → coi như đã đọc đủ, đánh "isComplete": true.

BƯỚC 2: KIỂM TRA ĐỘ HOÀN THÀNH
- Đọc được ≥70% nội dung bài gốc → "isComplete": true → chấm điểm.
- Bỏ sót >30% nội dung → "isComplete": false, "score": 0.

BƯỚC 3: CÔNG THỨC TÍNH ĐIỂM (THANG 10)
┌─────────────────────────────────────────────────┐
│  ĐIỂM NỀN = 7.0 điểm                           │
│  (Đọc hết bài và đúng nội dung)                 │
│                                                  │
│  ĐIỂM CỘNG TỐI ĐA = 3.0 điểm                   │
│  Chia đều cho 5 tiêu chí CEFR, mỗi tiêu chí    │
│  tối đa +0.6 điểm:                              │
│                                                  │
│  1. Pronunciation (+0.0 ~ +0.6)                  │
│     Phát âm chuẩn IPA, phân biệt nguyên âm/     │
│     phụ âm, âm cuối rõ ràng.                    │
│                                                  │
│  2. Word Stress (+0.0 ~ +0.6)                    │
│     Nhấn trọng âm đúng vị trí trong từ.         │
│                                                  │
│  3. Intonation (+0.0 ~ +0.6)                     │
│     Ngữ điệu lên/xuống tự nhiên, phù hợp       │
│     câu hỏi/câu kể/câu cảm thán.               │
│                                                  │
│  4. Fluency (+0.0 ~ +0.6)                        │
│     Đọc trôi chảy, không ngắc ngứ, tốc độ      │
│     phù hợp.                                    │
│                                                  │
│  5. Connected Speech (+0.0 ~ +0.6)               │
│     Nối âm, đồng hóa âm, nuốt âm tự nhiên      │
│     như người bản ngữ.                           │
│                                                  │
│  TỔNG ĐIỂM = 7.0 + tổng điểm cộng              │
│  (Tối thiểu 7.0, tối đa 10.0)                   │
└─────────────────────────────────────────────────┘

CÁCH QUY ĐỔI TIÊU CHÍ SANG THANG 10 (cho criteriaScores):
- Mỗi tiêu chí chấm nội bộ trên thang 10 để hiển thị chi tiết.
- Ví dụ: Pronunciation = 8/10, Stress = 7/10, v.v.
- Nhưng TỔNG ĐIỂM (score) phải tính theo công thức trên (7 + bonus).

BƯỚC 4: XẾP LOẠI CEFR
Dựa trên tổng điểm và trình độ target:
- 9.0-10.0: Xuất sắc (C1-C2 nếu level cao, hoặc vượt trội so với level)
- 8.0-8.9: Giỏi (B2+)
- 7.5-7.9: Khá (B1-B2)
- 7.0-7.4: Đạt yêu cầu (A2-B1)

BƯỚC 5: PHÂN TÍCH IPA
- Chỉ ra 3-5 từ phát âm chưa chuẩn nhất, IPA chuẩn vs IPA người đọc.
- Gợi ý cách sửa cụ thể (khẩu hình miệng, vị trí lưỡi, cách bật hơi).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎀 PHONG CÁCH PHẢN HỒI (Ms Thao)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Ấm áp, yêu thương, luôn bắt đầu bằng "Chào con, cô Thảo đây!"
- Khen trước, góp ý sau. Mang tính kiến tạo.
- Dù điểm thấp vẫn phải khuyến khích cố gắng.

Output JSON:
{
  "isComplete": boolean,
  "missingContent": string (phần bị thiếu, rỗng nếu đọc đủ),
  "score": number (7.0 ~ 10.0, theo công thức trên),
  "cefrLevel": string,
  "criteriaScores": { "pronunciation": number, "stress": number, "intonation": number, "fluency": number, "connectedSpeech": number } (mỗi tiêu chí thang 10),
  "feedback": string,
  "ipaAnalysis": [ { "word": string, "correctIpa": string, "studentIpa": string, "tip": string } ],
  "standardSentences": string[],
  "personalizedExercises": string[],
  "strengths": string[],
  "improvements": string[]
}`;

  // Clean MIME type for Gemini API (strip codec info, keep base type)
  const cleanMimeType = mimeType.split(';')[0].trim() || "audio/webm";
  console.log(`[Speech Eval] Sending audio: mimeType=${cleanMimeType}, originalMime=${mimeType}, dataLength=${audioData.length}`);

  const response = await generateWithFallback(TEXT_MODELS, {
    contents: [
      {
        role: "user",
        parts: [
          { text: `Original Text (bài gốc): ${originalText}\nTarget Level: ${level}\n\nHãy nghe kỹ file audio bên dưới. Người đọc đang đọc bài gốc ở trên. Cố gắng hết sức để nhận diện giọng nói và chấm điểm theo công thức: Điểm nền 7 + điểm cộng CEFR (tối đa 3).` },
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: audioData,
            },
          },
        ],
      },
    ],
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
      maxOutputTokens: 8192
    },
  });

  try {
    const result = parseSafeJson(response.text || "{}");
    
    // Enforce scoring formula: isComplete=true → 7.0~10.0, isComplete=false → 0
    let finalScore = 0;
    if (result.isComplete !== false) {
      finalScore = Math.max(7.0, Math.min(10.0, result.score || 7.0));
      // Round to 1 decimal place
      finalScore = Math.round(finalScore * 10) / 10;
    }

    return {
      isComplete: result.isComplete ?? true,
      missingContent: result.missingContent || "",
      score: finalScore,
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
    // Propagate the original error message for easier debugging
    throw new Error(msg || "Failed to evaluate speech. Please try again.");
  }
};

import { ExerciseData } from '../types';

export const generateExercise = async (
  readingText: string,
  level: EnglishLevel
): Promise<ExerciseData> => {
  const systemInstruction = `
You are a strict English exercise generator.

Create EXACTLY 30 exercise questions based ONLY on the provided reading text.

MANDATORY OUTPUT:
- multipleChoice: EXACTLY 10
- translation: EXACTLY 5
- ordering: EXACTLY 5
- errorCorrection: EXACTLY 5
- fillBlank: EXACTLY 5

TOTAL = EXACTLY 30 QUESTIONS

RULES:
- Return ONLY valid JSON
- No markdown
- No explanation outside JSON
- Never shorten output
- Never skip sections
- If unsure, create easier questions instead of fewer questions
- All explanations MUST be in Vietnamese

JSON FORMAT:
{
  "multipleChoice": [],
  "translation": [],
  "ordering": [],
  "errorCorrection": [],
  "fillBlank": []
}
`;

  const isCompleteExercise = (data: any) => {
    return (
      data &&
      Array.isArray(data.multipleChoice) &&
      Array.isArray(data.translation) &&
      Array.isArray(data.ordering) &&
      Array.isArray(data.errorCorrection) &&
      Array.isArray(data.fillBlank) &&
      data.multipleChoice.length === 10 &&
      data.translation.length === 5 &&
      data.ordering.length === 5 &&
      data.errorCorrection.length === 5 &&
      data.fillBlank.length === 5
    );
  };

  let lastError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await generateWithFallback(TEXT_MODELS, {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
Reading Text:
${readingText}

Student Level:
${level}

Generate EXACTLY 30 questions.
Do not shorten.
Return valid JSON only.
`
              }
            ]
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 12000
        },
      });

      const result = parseSafeJson(response.text || "{}");

      if (!isCompleteExercise(result)) {
        throw new Error("INCOMPLETE_EXERCISE_JSON");
      }

      return result as ExerciseData;
    } catch (err: any) {
      lastError = err;
      console.warn(`Exercise attempt ${attempt} failed`, err);

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error("Không thể tạo đủ bài tập. Vui lòng thử lại.");
};
