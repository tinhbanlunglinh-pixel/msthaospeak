import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateAudio, BROWSER_TTS_SIGNAL, speakWithBrowser, stopBrowserTTS } from '../services/geminiService';
import { EnglishLevel } from '../types';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isAudioLoading: boolean;
  audioUrl: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isBrowserTTS: boolean;
  setIsPlaying: (playing: boolean) => void;
  setIsAudioLoading: (loading: boolean) => void;
  setAudioUrl: (url: string | null) => void;
  handlePlayAudio: () => Promise<void>;
  cleanup: () => void;
}

export function useAudioPlayer(
  readingText: string | null,
  level: EnglishLevel,
  setError: (error: string | null) => void
): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isBrowserTTS, setIsBrowserTTS] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousAudioUrlRef = useRef<string | null>(null);

  // Revoke previous audio URL to prevent memory leaks
  const setAudioUrlSafe = useCallback((url: string | null) => {
    // Don't revoke the BROWSER_TTS_SIGNAL (it's not a blob URL)
    if (previousAudioUrlRef.current && previousAudioUrlRef.current !== url && previousAudioUrlRef.current !== BROWSER_TTS_SIGNAL) {
      URL.revokeObjectURL(previousAudioUrlRef.current);
    }
    previousAudioUrlRef.current = url;
    
    if (url === BROWSER_TTS_SIGNAL) {
      setIsBrowserTTS(true);
      setAudioUrl(null); // Don't set the signal as audioUrl for the <audio> element
    } else {
      setIsBrowserTTS(false);
      setAudioUrl(url);
    }
  }, []);

  // Handle auto-play when audioUrl is first generated (for Gemini TTS)
  useEffect(() => {
    if (audioUrl && audioRef.current && isPlaying) {
      const audio = audioRef.current;
      audio.load();
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Auto-play error:", err);
          setIsPlaying(false);
        });
      }
    }
  }, [audioUrl]);

  // Preload browser voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Voices may load async. Trigger load.
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Listen for browser TTS end
  useEffect(() => {
    if (!isBrowserTTS) return;
    
    // Wait a brief moment for speechSynthesis to actually start before checking
    let started = false;
    const checkSpeaking = setInterval(() => {
      if (!('speechSynthesis' in window)) return;
      
      const isSpeaking = window.speechSynthesis.speaking;
      
      // Track when speech actually starts
      if (isSpeaking) {
        started = true;
      }
      
      // Only mark as stopped if speech had started and is now done
      if (started && !isSpeaking && isPlaying) {
        setIsPlaying(false);
      }
    }, 200);
    
    return () => clearInterval(checkSpeaking);
  }, [isBrowserTTS, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousAudioUrlRef.current && previousAudioUrlRef.current !== BROWSER_TTS_SIGNAL) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
      }
      stopBrowserTTS();
    };
  }, []);

  const handlePlayAudio = async () => {
    if (!readingText) return;

    // --- Case 1: Browser TTS mode (fallback) ---
    if (isBrowserTTS) {
      if (isPlaying) {
        stopBrowserTTS();
        setIsPlaying(false);
      } else {
        speakWithBrowser(readingText, level);
        setIsPlaying(true);
      }
      return;
    }
    
    // --- Case 2: Gemini TTS audio already loaded ---
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(err => {
          console.error("Playback error:", err);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
      return;
    }

    // --- Case 3: No audio yet — generate it ---
    if (isAudioLoading) return;

    setIsPlaying(true);
    setIsAudioLoading(true);
    try {
      const url = await generateAudio(readingText, level);
      
      if (url === BROWSER_TTS_SIGNAL) {
        // Gemini failed, use browser TTS
        setAudioUrlSafe(BROWSER_TTS_SIGNAL);
        speakWithBrowser(readingText, level);
        // No error shown — browser TTS works silently as fallback
      } else {
        setAudioUrlSafe(url);
      }
    } catch (err) {
      console.error("Failed to generate audio", err);
      // Last resort: try browser TTS even on exception
      setAudioUrlSafe(BROWSER_TTS_SIGNAL);
      speakWithBrowser(readingText, level);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const cleanup = () => {
    if (previousAudioUrlRef.current && previousAudioUrlRef.current !== BROWSER_TTS_SIGNAL) {
      URL.revokeObjectURL(previousAudioUrlRef.current);
      previousAudioUrlRef.current = null;
    }
    stopBrowserTTS();
    setAudioUrl(null);
    setIsBrowserTTS(false);
    setIsPlaying(false);
  };

  return {
    isPlaying,
    isAudioLoading,
    audioUrl,
    audioRef,
    isBrowserTTS,
    setIsPlaying,
    setIsAudioLoading,
    setAudioUrl: setAudioUrlSafe,
    handlePlayAudio,
    cleanup,
  };
}
