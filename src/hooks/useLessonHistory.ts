import { useState, useEffect, useCallback } from 'react';
import { VocabularyItem, EnglishLevel, ExerciseData } from '../types';

export interface LessonRecord {
  id: string;
  topicName: string;
  level: EnglishLevel;
  readingText: string;
  translationText: string;
  vocabulary: VocabularyItem[];
  generatedImage: string | null;
  generatedPrompt: string | null;
  score?: number; // speaking score
  exerciseData?: ExerciseData | null;
  exerciseScore?: number | null;
  createdAt: number; // timestamp
}

const STORAGE_KEY = 'mrs_dung_lesson_history';
const MAX_LESSONS = 30;

function loadLessons(): LessonRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLessons(lessons: LessonRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons.slice(0, MAX_LESSONS)));
  } catch (e) {
    console.warn('Failed to save lesson history:', e);
  }
}

export function useLessonHistory() {
  const [lessons, setLessons] = useState<LessonRecord[]>(() => loadLessons());

  // Sync to localStorage whenever lessons change
  useEffect(() => {
    saveLessons(lessons);
  }, [lessons]);

  const addLesson = useCallback((lesson: Omit<LessonRecord, 'id' | 'createdAt'>) => {
    const newLesson: LessonRecord = {
      ...lesson,
      id: `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    setLessons(prev => [newLesson, ...prev].slice(0, MAX_LESSONS));
    return newLesson.id;
  }, []);

  const removeLesson = useCallback((id: string) => {
    setLessons(prev => prev.filter(l => l.id !== id));
  }, []);

  const updateScore = useCallback((id: string, score: number) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, score } : l));
  }, []);

  const updateExerciseScore = useCallback((id: string, exerciseScore: number) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, exerciseScore } : l));
  }, []);

  const updateExerciseData = useCallback((id: string, exerciseData: ExerciseData) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, exerciseData } : l));
  }, []);

  const clearAll = useCallback(() => {
    setLessons([]);
  }, []);

  return {
    lessons,
    addLesson,
    removeLesson,
    updateScore,
    updateExerciseScore,
    updateExerciseData,
    clearAll,
  };
}
