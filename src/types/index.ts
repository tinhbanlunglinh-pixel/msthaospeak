import { EvaluationResult, EnglishLevel, VocabularyItem } from '../services/geminiService';

export type { EvaluationResult, EnglishLevel, VocabularyItem };

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ContentMode = "generate" | "useInput" | "image";

export interface BaseQuestion {
  id: string;
  questionText: string;
  explanation: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: { A: string; B: string; C: string };
  correctAnswer: 'A' | 'B' | 'C';
}

export interface TranslationQuestion extends BaseQuestion {
  type: 'translation';
  options: { A: string; B: string; C: string };
  correctAnswer: 'A' | 'B' | 'C';
}

export interface OrderingQuestion extends BaseQuestion {
  type: 'ordering';
  words: string[];
  correctAnswer: string;
}

export interface ErrorCorrectionQuestion extends BaseQuestion {
  type: 'error-correction';
  sentence: string; // The sentence with underlined/highlighted parts, e.g. "<u>He</u> (A) <u>go</u> (B) to <u>school</u> (C)."
  options: { A: string; B: string; C: string };
  correctAnswer: 'A' | 'B' | 'C';
  correctWord: string; // The correct word that should replace the error
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill-blank';
  sentenceWithBlank: string; // Use "___" to denote the blank
  hintEmoji?: string; // An emoji representing the correct answer to act as a hint
  options: { A: string; B: string; C: string };
  correctAnswer: 'A' | 'B' | 'C';
}

export type ExerciseQuestion = 
  | MultipleChoiceQuestion 
  | TranslationQuestion 
  | OrderingQuestion 
  | ErrorCorrectionQuestion 
  | FillBlankQuestion;

export interface ExerciseData {
  multipleChoice: MultipleChoiceQuestion[]; // 10 questions
  translation: TranslationQuestion[]; // 5 questions
  ordering: OrderingQuestion[]; // 5 questions
  errorCorrection: ErrorCorrectionQuestion[]; // 5 questions
  fillBlank: FillBlankQuestion[]; // 5 questions
}

export interface AppState {
  topic: string;
  level: EnglishLevel;
  apiKey: string;
  showApiKeyModal: boolean;
  imagePreview: string | null;
  aspectRatio: AspectRatio;
  isGenerating: boolean;
  isAudioLoading: boolean;
  generatedImage: string | null;
  generatedPrompt: string | null;
  readingText: string | null;
  translationText: string | null;
  vocabulary: VocabularyItem[];
  showTranslation: boolean;
  generatedTopicName: string | null;
  error: string | null;
  contentMode: ContentMode;
  exerciseData: ExerciseData | null;
  exerciseScore: number | null;
  isDragging: boolean;
  isProcessingFile: boolean;
  isDownloading: boolean;
  isPlaying: boolean;
  audioUrl: string | null;
  // Recording
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  studentName: string;
  teacherName: string;
  showCertificate: boolean;
}
