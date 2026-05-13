import React, { useState } from 'react';
import { ExerciseData, ExerciseQuestion, MultipleChoiceQuestion, TranslationQuestion, OrderingQuestion, ErrorCorrectionQuestion, FillBlankQuestion } from '../types';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExerciseSectionProps {
  exerciseData: ExerciseData;
  onComplete: (score: number) => void;
  savedScore?: number | null;
}

export const ExerciseSection: React.FC<ExerciseSectionProps> = ({ exerciseData, onComplete, savedScore }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<boolean>(savedScore !== undefined && savedScore !== null);
  const [score, setScore] = useState<number | null>(savedScore || null);

  const allQuestions: { type: string; title: string; questions: ExerciseQuestion[] }[] = [
    { type: 'multiple-choice', title: 'I. Chọn đáp án đúng (A, B, C)', questions: exerciseData.multipleChoice || [] },
    { type: 'translation', title: 'II. Dịch sang tiếng Việt', questions: exerciseData.translation || [] },
    { type: 'ordering', title: 'III. Sắp xếp lại câu', questions: exerciseData.ordering || [] },
    { type: 'error-correction', title: 'IV. Chọn và sửa lỗi sai', questions: exerciseData.errorCorrection || [] },
    { type: 'fill-blank', title: 'V. Điền từ vào chỗ trống', questions: exerciseData.fillBlank || [] },
  ];

  const handleAnswerChange = (id: string, value: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    let correctCount = 0;
    let totalCount = 0;

    allQuestions.forEach(section => {
      section.questions.forEach(q => {
        totalCount++;
        const userAnswer = answers[q.id]?.trim().toLowerCase();

        let isCorrect = false;
        if (q.type === 'multiple-choice') {
          isCorrect = userAnswer === q.correctAnswer.toLowerCase();
        } else if (q.type === 'error-correction') {
          isCorrect = userAnswer === q.correctWord.toLowerCase();
        } else {
          const normalize = (s: string) => s.replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
          isCorrect = normalize(userAnswer || '') === normalize(q.correctAnswer);
        }

        if (isCorrect) correctCount++;
      });
    });

    const finalScore = Number(((correctCount / Math.max(totalCount, 1)) * 10).toFixed(1));
    setScore(finalScore);
    setSubmitted(true);
    onComplete(finalScore);
  };

  const getCorrectAnswer = (q: ExerciseQuestion): string => {
    if (q.type === 'error-correction') return (q as ErrorCorrectionQuestion).correctWord;
    return q.correctAnswer;
  };

  const checkCorrect = (q: ExerciseQuestion, answer: string): boolean => {
    if (!answer) return false;
    if (q.type === 'multiple-choice') {
      return answer.toLowerCase() === q.correctAnswer.toLowerCase();
    }
    if (q.type === 'error-correction') {
      return answer.trim().toLowerCase() === q.correctWord.toLowerCase();
    }
    const normalize = (s: string) => s.replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return normalize(answer) === normalize(q.correctAnswer);
  };

  const renderQuestion = (q: ExerciseQuestion, index: number) => {
    const userAnswer = answers[q.id] || '';
    const isCorrect = submitted ? checkCorrect(q, userAnswer) : false;

    const getLabelClass = (key: string) => {
      let base = 'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors';
      if (userAnswer === key) {
        base += ' border-brand-green bg-emerald-50/50';
      } else {
        base += ' border-slate-100 hover:border-emerald-200';
      }
      if (submitted && key === (q as MultipleChoiceQuestion).correctAnswer) {
        base += ' border-green-500 bg-green-50';
      }
      if (submitted && userAnswer === key && key !== (q as MultipleChoiceQuestion).correctAnswer) {
        base += ' border-red-500 bg-red-50';
      }
      return base;
    };

    const getInputClass = () => {
      let base = 'w-full p-3 rounded-lg border-2 focus:ring-2 focus:ring-brand-green/20 outline-none transition-colors';
      if (submitted) {
        base += isCorrect ? ' border-green-500 bg-green-50 text-green-700' : ' border-red-500 bg-red-50 text-red-700';
      } else {
        base += ' border-slate-200 focus:border-brand-green';
      }
      return base;
    };

    return (
      <div key={q.id} className="p-4 sm:p-5 bg-white rounded-xl border-2 border-emerald-50 shadow-sm mb-4">
        <div className="flex gap-3">
          <span className="font-black text-emerald-600 mt-0.5">{index + 1}.</span>
          <div className="flex-1 space-y-3">
            <p className="font-bold text-slate-800 text-sm sm:text-base leading-relaxed">
              {q.type === 'error-correction' ? (q as ErrorCorrectionQuestion).sentence : q.questionText}
            </p>

            {q.type === 'ordering' && (
              <div className="flex flex-wrap gap-2">
                {(q as OrderingQuestion).words.map((w, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-lg text-sm font-medium border border-slate-200">{w}</span>
                ))}
              </div>
            )}

            {q.type === 'fill-blank' && (
              <p className="font-medium text-slate-600 italic">{(q as FillBlankQuestion).sentenceWithBlank}</p>
            )}

            {q.type === 'multiple-choice' ? (
              <div className="space-y-2 mt-2">
                {Object.entries((q as MultipleChoiceQuestion).options).map(([key, val]) => (
                  <label key={key} className={getLabelClass(key)}>
                    <input type="radio" name={q.id} value={key} disabled={submitted}
                      checked={userAnswer === key} onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="w-4 h-4 text-brand-green border-slate-300 focus:ring-brand-green" />
                    <span className="font-black text-slate-500">{key}.</span>
                    <span className="font-medium text-slate-700">{val}</span>
                  </label>
                ))}
              </div>
            ) : (
              <input
                type="text"
                disabled={submitted}
                value={userAnswer}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder={q.type === 'error-correction' ? "Nhập từ đúng..." : "Nhập câu trả lời..."}
                className={getInputClass()}
              />
            )}

            {submitted && (
              <div className={"mt-3 p-3 rounded-lg flex items-start gap-3 " + (isCorrect ? 'bg-green-100' : 'bg-red-100')}>
                {isCorrect ? <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} /> : <XCircle className="text-red-600 shrink-0 mt-0.5" size={18} />}
                <div>
                  <p className={"text-sm font-bold " + (isCorrect ? 'text-green-800' : 'text-red-800')}>
                    {isCorrect ? 'Tuyệt vời!' : 'Sai rồi. Đáp án đúng: ' + getCorrectAnswer(q)}
                  </p>
                  <p className={"text-xs mt-1 " + (isCorrect ? 'text-green-700' : 'text-red-700')}>{q.explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[800px] mx-auto mt-8 space-y-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 sm:p-8 rounded-[2rem] shadow-xl text-white text-center">
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Bài tập củng cố kiến thức</h2>
        <p className="text-emerald-50 font-medium">Hoàn thành 30 câu hỏi để nhận Chứng nhận xuất sắc nhé!</p>

        {submitted && score !== null && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-6 bg-white/20 p-4 rounded-2xl border border-white/30 backdrop-blur-sm inline-block">
            <div className="flex items-center gap-3 justify-center mb-1">
              <Award className="text-brand-yellow" size={28} />
              <span className="text-sm font-black uppercase tracking-widest text-emerald-100">Điểm số của bạn</span>
            </div>
            <div className="text-5xl font-black text-white">{score} <span className="text-2xl text-emerald-200">/ 10</span></div>
          </motion.div>
        )}
      </div>

      <div className="space-y-8 bg-white/50 p-4 sm:p-6 rounded-[2rem] border-2 border-emerald-100 shadow-sm">
        {allQuestions.map((section) => {
          if (!section.questions || section.questions.length === 0) return null;
          return (
            <div key={section.type} className="space-y-4">
              <h3 className="text-lg font-black text-emerald-800 border-b-2 border-emerald-200 pb-2">{section.title}</h3>
              <div className="space-y-4">
                {section.questions.map((q, qIdx) => renderQuestion(q, qIdx))}
              </div>
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div className="sticky bottom-6 flex justify-center z-10">
          <button
            onClick={handleSubmit}
            className="px-8 py-4 bg-brand-green text-white rounded-full font-black text-lg shadow-2xl shadow-emerald-500/50 hover:-translate-y-1 hover:shadow-emerald-500/60 transition-all flex items-center gap-3"
          >
            <CheckCircle size={24} /> Nộp bài & Nhận chứng nhận
          </button>
        </div>
      )}
    </div>
  );
};
