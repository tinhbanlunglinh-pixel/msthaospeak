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

  const handleEvaluate = useCallback(async (audioBlob: Blob, mimeType: string) => {
    if (!readingText) return;

    setIsEvaluating(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          const result = await evaluateSpeech(readingText, base64Audio, level, mimeType);
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
      };
    } catch (err: any) {
      console.error("Reader error:", err);
      setError("Có lỗi xảy ra khi xử lý audio.");
      setIsEvaluating(false);
    }
  }, [readingText, level, setError]);

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
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleEvaluate(audioBlob, mimeType);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
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
    if (mediaRecorderRef.current && isRecording) {
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 500);
    }
  }, [isRecording]);

  return {
    isRecording,
    isEvaluating,
    evaluation,
    setEvaluation,
    startRecording,
    stopRecording,
  };
}
