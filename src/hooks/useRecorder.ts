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
            resolve(base64);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => {
          reject(new Error("Failed to read audio file"));
        };
        reader.readAsDataURL(audioBlob);
      });

      const result = await evaluateSpeech(currentText, base64Audio, currentLevel, mimeType);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
          
          if (audioBlob.size < 100) {
            console.error("Audio blob is too small:", audioBlob.size);
            setError("Không thu được âm thanh. Vui lòng kiểm tra micro và thử lại.");
            setIsEvaluating(false);
            return;
          }

          await handleEvaluate(audioBlob, mimeType);
        } catch (err: any) {
          console.error("Error in onstop handler:", err);
          setError("Có lỗi xảy ra khi xử lý audio. Vui lòng thử lại.");
          setIsEvaluating(false);
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setEvaluation(null);
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
    // Use ref instead of state to avoid stale closure issues
    if (mediaRecorderRef.current && isRecordingRef.current) {
      // Set evaluating immediately so UI transitions smoothly from "recording" to "evaluating"
      // instead of briefly flashing the "start recording" button
      setIsEvaluating(true);
      
      setTimeout(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder) {
          if (recorder.state === 'recording') {
            recorder.stop();
          } else if (recorder.state === 'paused') {
            // Resume then stop to trigger onstop properly
            recorder.resume();
            recorder.stop();
          } else {
            // Already inactive - reset evaluating state since onstop won't fire
            console.warn("MediaRecorder already inactive, state:", recorder.state);
            setIsEvaluating(false);
          }
        } else {
          // No recorder ref - reset evaluating state
          setIsEvaluating(false);
        }
        isRecordingRef.current = false;
        setIsRecording(false);
      }, 500);
    }
  }, []); // No dependencies needed - uses refs only

  return {
    isRecording,
    isEvaluating,
    evaluation,
    setEvaluation,
    startRecording,
    stopRecording,
  };
}
