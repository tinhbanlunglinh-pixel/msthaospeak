import { useState, useRef, useCallback } from 'react';
import { evaluateSpeech } from '../services/geminiService';
import { EnglishLevel, EvaluationResult } from '../types';

interface UseRecorderReturn {
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  setEvaluation: (evaluation: EvaluationResult | null) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

// ─── WAV Conversion Utilities ────────────────────────────────────────
// Convert recorded audio (webm/opus) → WAV PCM 16-bit mono 16kHz
// WAV is the most universally compatible format for speech recognition.

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);       // SubChunk1Size (PCM = 16)
  view.setUint16(20, 1, true);        // AudioFormat (PCM = 1)
  view.setUint16(22, 1, true);        // NumChannels (mono = 1)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);        // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true);       // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Convert Float32 [-1.0, 1.0] → Int16 [-32768, 32767]
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Convert a recorded audio Blob (any format) to WAV PCM 16kHz mono.
 * This ensures maximum compatibility with Gemini's speech recognition.
 */
async function convertToWav(blob: Blob): Promise<Blob> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioCtx();

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Resample to 16kHz mono — optimal for speech recognition
    const TARGET_SAMPLE_RATE = 16000;
    const duration = audioBuffer.duration;
    const offlineCtx = new OfflineAudioContext(
      1, // mono
      Math.ceil(duration * TARGET_SAMPLE_RATE),
      TARGET_SAMPLE_RATE
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const channelData = renderedBuffer.getChannelData(0);

    console.log(`[WAV Convert] ${blob.size} bytes ${blob.type} → WAV PCM 16kHz mono, ${channelData.length} samples, ${duration.toFixed(1)}s`);

    const wavBuffer = encodeWAV(channelData, TARGET_SAMPLE_RATE);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    await audioContext.close();
  }
}

// ─── Main Hook ───────────────────────────────────────────────────────

export function useRecorder(
  readingText: string | null,
  level: EnglishLevel,
  setError: (error: string | null) => void
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Use refs to avoid stale closures in callbacks
  const isRecordingRef = useRef(false);
  const readingTextRef = useRef(readingText);
  const levelRef = useRef(level);

  // Keep refs in sync with props/state
  readingTextRef.current = readingText;
  levelRef.current = level;

  const handleEvaluate = useCallback(async (audioBlob: Blob, mimeType: string) => {
    const currentText = readingTextRef.current;
    const currentLevel = levelRef.current;

    if (!currentText) {
      console.error("handleEvaluate: readingText is null, cannot evaluate");
      setIsEvaluating(false);
      setError("Không có nội dung bài đọc để chấm điểm. Vui lòng tạo bài đọc trước.");
      return;
    }

    setIsEvaluating(true);
    try {
      // ── Step 1: Convert to WAV for best Gemini compatibility ──
      let finalBlob = audioBlob;
      let finalMimeType = mimeType;

      try {
        console.log(`[Recorder] Converting ${mimeType} (${audioBlob.size} bytes) to WAV...`);
        finalBlob = await convertToWav(audioBlob);
        finalMimeType = 'audio/wav';
        console.log(`[Recorder] WAV conversion OK: ${finalBlob.size} bytes`);
      } catch (convErr) {
        // Fallback: use original format if WAV conversion fails
        console.warn('[Recorder] WAV conversion failed, using original format:', convErr);
        finalMimeType = mimeType.split(';')[0] || 'audio/webm';
      }

      // ── Step 2: Convert to base64 ──
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            if (!base64 || base64.length < 100) {
              reject(new Error("Audio data is empty or too small. Please try recording again."));
              return;
            }
            console.log(`[Recorder] Base64 ready: ${base64.length} chars, mimeType=${finalMimeType}`);
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read audio file"));
        reader.readAsDataURL(finalBlob);
      });

      // ── Step 3: Send to Gemini for evaluation ──
      const result = await evaluateSpeech(currentText, base64Audio, currentLevel, finalMimeType);
      setEvaluation(result);
      setIsEvaluating(false);
    } catch (err: any) {
      console.error("Evaluation error:", err);
      const errorMessage = err?.message || String(err);
      
      if (errorMessage === "QUOTA_EXCEEDED") {
        setError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới hoặc thử lại sau.");
      } else if (errorMessage === "INVALID_KEY") {
        setError("API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình trong 'Cài đặt API Key'.");
      } else {
        let treatedAsQuota = false;
        try {
          const parsedError = JSON.parse(errorMessage);
          if (parsedError?.error?.code === 429 || parsedError?.status === 429) {
            setError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới.");
            treatedAsQuota = true;
          }
        } catch (e) { 
          if (errorMessage.includes('"code":429') || errorMessage.includes('"code": 429')) {
            setError("Bạn đã hết hạn mức sử dụng (Quota) của API Key này. Vui lòng nhấn vào nút 'Cài đặt API Key' để đổi key mới.");
            treatedAsQuota = true;
          }
        }

        if (!treatedAsQuota) {
          setError(`Lỗi chấm điểm: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}. (Vui lòng thử lại)`);
        }
      }
      setIsEvaluating(false);
    }
  }, [setError]);

  const startRecording = useCallback(async () => {
    try {
      // Request audio with noise reduction for better speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: { ideal: 1 },
        } 
      });

      // Choose the best MIME type supported by this browser
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
      ];
      const supportedType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
      console.log('[Recorder] MediaRecorder MIME type:', supportedType || 'browser default');

      const recorderOptions: MediaRecorderOptions = {};
      if (supportedType) {
        recorderOptions.mimeType = supportedType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          console.log(`[Recorder] Recording stopped: ${audioBlob.size} bytes, ${mimeType}, ${audioChunksRef.current.length} chunks`);

          if (audioBlob.size < 100) {
            console.error("[Recorder] Audio blob is too small:", audioBlob.size);
            setError("Không thu được âm thanh. Vui lòng kiểm tra micro và thử lại.");
            setIsEvaluating(false);
            return;
          }

          await handleEvaluate(audioBlob, mimeType);
        } catch (err: any) {
          console.error("[Recorder] Error in onstop handler:", err);
          setError("Có lỗi xảy ra khi xử lý audio. Vui lòng thử lại.");
          setIsEvaluating(false);
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(1000); // Capture data every 1 second for reliability
      isRecordingRef.current = true;
      setIsRecording(true);
      setEvaluation(null);
      setError(null);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      const isPermissionError = 
        err.name === 'NotAllowedError' || 
        err.name === 'PermissionDeniedError' || 
        (err.message && err.message.toLowerCase().includes('permission denied'));

      if (isPermissionError) {
        setError("Không thể truy cập micro. Bạn vui lòng: \n1. Nhấn 'Cho phép' khi trình duyệt yêu cầu.\n2. Kiểm tra cài đặt quyền truy cập micro của trình duyệt.\n3. Nhấn nút 'Mở trong tab mới' (góc trên bên phải) để ứng dụng hoạt động tốt nhất.");
      } else {
        setError(`Lỗi micro: ${err.message || "Vui lòng kiểm tra lại thiết bị của bạn."}`);
      }
    }
  }, [handleEvaluate, setError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      // Set evaluating immediately so UI transitions smoothly
      setIsEvaluating(true);
      
      setTimeout(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder) {
          if (recorder.state === 'recording') {
            recorder.stop();
          } else if (recorder.state === 'paused') {
            recorder.resume();
            recorder.stop();
          } else {
            console.warn("[Recorder] MediaRecorder already inactive, state:", recorder.state);
            setIsEvaluating(false);
          }
        } else {
          setIsEvaluating(false);
        }
        isRecordingRef.current = false;
        setIsRecording(false);
      }, 500);
    }
  }, []);

  return {
    isRecording,
    isEvaluating,
    evaluation,
    setEvaluation,
    startRecording,
    stopRecording,
  };
}
