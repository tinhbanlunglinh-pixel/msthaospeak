import React, { useState, useEffect } from 'react';
import { ExerciseData, ExerciseQuestion, MultipleChoiceQuestion, TranslationQuestion, OrderingQuestion, ErrorCorrectionQuestion, FillBlankQuestion } from '../types';
import { CheckCircle, XCircle, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface ExerciseSectionProps {
  exerciseData: ExerciseData;
  onComplete: (score: number) => void;
  savedScore?: number | null;
}

// Helper function to dynamically shuffle multiple-choice options (A, B, C)
function shuffleSingleQuestionOptions<T extends { options: Record<string, string>; correctAnswer: string }>(q: T): T {
  const optionEntries = Object.entries(q.options); // e.g. [['A', 'option1'], ['B', 'option2'], ['C', 'option3']]
  const correctText = q.options[q.correctAnswer];
  
  // Scramble the options array randomly
  const shuffledEntries = [...optionEntries].sort(() => Math.random() - 0.5);
  
  const keys = ['A', 'B', 'C'];
  const newOptions: Record<string, string> = {};
  let newCorrectAnswer = '';
  
  shuffledEntries.forEach((entry, idx) => {
    const key = keys[idx];
    newOptions[key] = entry[1];
    if (entry[1] === correctText) {
      newCorrectAnswer = key;
    }
  });
  
  return {
    ...q,
    options: newOptions,
    correctAnswer: newCorrectAnswer
  };
}

export const ExerciseSection: React.FC<ExerciseSectionProps> = ({ exerciseData, onComplete, savedScore }) => {
  const [currentExerciseData, setCurrentExerciseData] = useState<ExerciseData>(exerciseData);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<boolean>(savedScore !== undefined && savedScore !== null);
  const [score, setScore] = useState<number | null>(savedScore || null);
  
  // Track selected word indices for Ordering questions
  const [orderingIndices, setOrderingIndices] = useState<Record<string, number[]>>({});

  // Track shown results per question ID (for immediate feedback)
  const [shownResults, setShownResults] = useState<Record<string, boolean>>({});

  // Scramble option positions on mount / when exerciseData changes to ensure visual variety
  useEffect(() => {
    if (!exerciseData) return;
    
    const shuffled: ExerciseData = {
      ...exerciseData,
      multipleChoice: (exerciseData.multipleChoice || []).map(q => shuffleSingleQuestionOptions(q)),
      translation: (exerciseData.translation || []).map(q => shuffleSingleQuestionOptions(q)),
      fillBlank: (exerciseData.fillBlank || []).map(q => shuffleSingleQuestionOptions(q)),
      // errorCorrection options match specific underlined labels in the sentence, so we do not scramble them programmatically.
    };
    
    setCurrentExerciseData(shuffled);
    setAnswers({});
    setShownResults({});
    setOrderingIndices({});
    setScore(savedScore || null);
    setSubmitted(savedScore !== undefined && savedScore !== null);
  }, [exerciseData, savedScore]);

  const allQuestions: { type: string; title: string; questions: ExerciseQuestion[] }[] = [
    { type: 'multiple-choice', title: 'I. Chọn đáp án đúng (A, B, C)', questions: (currentExerciseData.multipleChoice || []).map(q => ({ ...q, type: 'multiple-choice' })) },
    { type: 'translation', title: 'II. Chọn bản dịch đúng nhất (A, B, C)', questions: (currentExerciseData.translation || []).map(q => ({ ...q, type: 'translation' })) },
    { type: 'ordering', title: 'III. Bấm vào chữ để sắp xếp lại câu', questions: (currentExerciseData.ordering || []).map(q => ({ ...q, type: 'ordering' })) },
    { type: 'error-correction', title: 'IV. Tìm từ có lỗi sai (A, B, C)', questions: (currentExerciseData.errorCorrection || []).map(q => ({ ...q, type: 'error-correction' })) },
    { type: 'fill-blank', title: 'V. Điền từ vào chỗ trống', questions: (currentExerciseData.fillBlank || []).map(q => ({ ...q, type: 'fill-blank' })) },
  ];

  // Initialize ordering indices for completed/submitted exercises
  useEffect(() => {
    if (submitted && currentExerciseData?.ordering) {
      const initialIndices: Record<string, number[]> = {};
      currentExerciseData.ordering.forEach(q => {
        const correctWords = q.correctAnswer.split(' ');
        const indices: number[] = [];
        const used = new Set<number>();
        
        correctWords.forEach(word => {
          const idx = q.words.findIndex((w, i) => w === word && !used.has(i));
          if (idx !== -1) {
            indices.push(idx);
            used.add(idx);
          }
        });
        
        initialIndices[q.id] = indices;
      });
      setOrderingIndices(initialIndices);
    }
  }, [submitted, currentExerciseData]);

  const handleAnswerChange = (id: string, value: string) => {
    // Only allow selecting ONCE. Once the answer is selected and result is shown, prevent modification.
    if (submitted || shownResults[id]) return;
    
    setAnswers(prev => ({ ...prev, [id]: value }));
    setShownResults(prev => ({ ...prev, [id]: true }));
  };

  // Add word to Ordering answer
  const handleAddWordToAnswer = (qId: string, wordIdx: number) => {
    if (submitted || shownResults[qId]) return;
    const currentIndices = orderingIndices[qId] || [];
    if (currentIndices.includes(wordIdx)) return;

    const newIndices = [...currentIndices, wordIdx];
    setOrderingIndices(prev => ({ ...prev, [qId]: newIndices }));

    const question = currentExerciseData.ordering.find(q => q.id === qId);
    if (question) {
      const answerString = newIndices.map(idx => question.words[idx]).join(' ');
      setAnswers(prev => ({ ...prev, [qId]: answerString }));
      if (newIndices.length === question.words.length) {
        setShownResults(prev => ({ ...prev, [qId]: true }));
      } else {
        setShownResults(prev => ({ ...prev, [qId]: false }));
      }
    }
  };

  // Remove word from Ordering answer
  const handleRemoveWordFromAnswer = (qId: string, itemIndexInAnswer: number) => {
    if (submitted || shownResults[qId]) return;
    const currentIndices = orderingIndices[qId] || [];
    const newIndices = currentIndices.filter((_, idx) => idx !== itemIndexInAnswer);
    setOrderingIndices(prev => ({ ...prev, [qId]: newIndices }));

    const question = currentExerciseData.ordering.find(q => q.id === qId);
    if (question) {
      const answerString = newIndices.map(idx => question.words[idx]).join(' ');
      setAnswers(prev => ({ ...prev, [qId]: answerString }));
      setShownResults(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleSubmit = () => {
    let correctCount = 0;
    let totalCount = 0;

    allQuestions.forEach(section => {
      section.questions.forEach(q => {
        totalCount++;
        const userAnswer = answers[q.id]?.trim().toLowerCase();

        let isCorrect = false;
        if (q.type === 'multiple-choice' || q.type === 'translation' || q.type === 'error-correction') {
          isCorrect = userAnswer === q.correctAnswer.toLowerCase();
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
    if (q.type === 'multiple-choice' || q.type === 'translation' || q.type === 'fill-blank') {
      const mc = q as MultipleChoiceQuestion | TranslationQuestion | FillBlankQuestion;
      return `${mc.correctAnswer}. ${mc.options[mc.correctAnswer]}`;
    }
    if (q.type === 'error-correction') {
      const ec = q as ErrorCorrectionQuestion;
      return `${ec.correctAnswer} (${ec.options[ec.correctAnswer]} → ${ec.correctWord})`;
    }
    return q.correctAnswer;
  };

  const checkCorrect = (q: ExerciseQuestion, answer: string): boolean => {
    if (!answer) return false;
    if (q.type === 'multiple-choice' || q.type === 'translation' || q.type === 'error-correction' || q.type === 'fill-blank') {
      return answer.toLowerCase() === q.correctAnswer.toLowerCase();
    }
    const normalize = (s: string) => s.replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return normalize(answer) === normalize(q.correctAnswer);
  };

  const renderQuestion = (q: ExerciseQuestion, index: number) => {
    const userAnswer = answers[q.id] || '';
    const isCorrect = checkCorrect(q, userAnswer);
    const isShown = submitted || shownResults[q.id];

    const getLabelClass = (key: string) => {
      let base = 'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 select-none';
      const qMC = q as MultipleChoiceQuestion | TranslationQuestion | ErrorCorrectionQuestion;

      if (userAnswer === key) {
        base += ' border-brand-green bg-emerald-50/50 shadow-sm';
      } else {
        base += ' border-slate-100 hover:border-emerald-200 hover:bg-slate-50/50';
      }
      
      if (isShown && key === qMC.correctAnswer) {
        base = 'flex items-center gap-3 p-3 rounded-lg border-2 select-none border-green-500 bg-green-50/70 text-green-950 font-semibold cursor-not-allowed';
      } else if (isShown && userAnswer === key && key !== qMC.correctAnswer) {
        base = 'flex items-center gap-3 p-3 rounded-lg border-2 select-none border-red-400 bg-red-50/70 text-red-950 cursor-not-allowed';
      } else if (submitted || isShown) {
        base += ' opacity-60 cursor-not-allowed';
      }
      
      return base;
    };

    return (
      <div key={q.id} className="p-4 sm:p-5 bg-white rounded-xl border border-slate-100 shadow-sm mb-4">
        {/* Style injection for beautiful interactive error underlines */}
        <style dangerouslySetInnerHTML={{ __html: `
          .error-correction-sentence u {
            text-decoration: none;
            border-bottom: 2px dashed #10b981;
            font-weight: 800;
            color: #047857;
            padding: 0 4px;
            display: inline-block;
          }
        `}} />

        <div className="flex gap-3">
          <span className="font-black text-emerald-600 mt-0.5">{index + 1}.</span>
          <div className="flex-1 space-y-3">
            {q.type === 'error-correction' ? (
              <div 
                className="font-bold text-slate-800 text-sm sm:text-base leading-relaxed error-correction-sentence"
                dangerouslySetInnerHTML={{ __html: (q as ErrorCorrectionQuestion).sentence.replace(/^(Find and correct the error|Correct the error)[\s:]*/i, '') }}
              />
            ) : q.type === 'fill-blank' ? (
              <p className="font-bold text-slate-800 text-sm sm:text-base leading-relaxed flex items-start gap-2">
                <span className="text-xl leading-none mt-0.5 shrink-0" title="Gợi ý">{(q as FillBlankQuestion).hintEmoji || '📝'}</span>
                <span>{(q as FillBlankQuestion).sentenceWithBlank.replace(/^(Fill in the blank)[\s:]*/i, '')}</span>
              </p>
            ) : (
              <p className="font-bold text-slate-800 text-sm sm:text-base leading-relaxed">
                {q.questionText.replace(/^(Translate to Vietnamese|Rearrange the words|Fill in the blank|Translate into Vietnamese|Rearrange these words)[\s:]*/i, '')}
              </p>
            )}

            {/* Ordering Question Interface */}
            {q.type === 'ordering' && (
              <div className="space-y-3">
                {/* Result Answer Box */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 min-h-[56px] flex flex-wrap gap-2 items-center">
                  {(orderingIndices[q.id] || []).length === 0 ? (
                    <span className="text-slate-400 text-xs sm:text-sm italic">Bấm vào các từ bên dưới để sắp xếp...</span>
                  ) : (
                    (orderingIndices[q.id] || []).map((idx, itemIndex) => (
                      <motion.button
                        key={`${idx}-${itemIndex}`}
                        layoutId={`word-${q.id}-${idx}`}
                        disabled={submitted || shownResults[q.id]}
                        onClick={() => handleRemoveWordFromAnswer(q.id, itemIndex)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1 transition-all"
                        whileTap={submitted || shownResults[q.id] ? {} : { scale: 0.95 }}
                      >
                        {(q as OrderingQuestion).words[idx]}
                        {!(submitted || shownResults[q.id]) && <span className="text-[10px] opacity-75 font-black ml-1">✕</span>}
                      </motion.button>
                    ))
                  )}
                </div>

                {/* Available Word Pool */}
                {!(submitted || shownResults[q.id]) && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Từ gợi ý:</span>
                    <div className="flex flex-wrap gap-2">
                      {(q as OrderingQuestion).words.map((w, idx) => {
                        const isSelected = (orderingIndices[q.id] || []).includes(idx);
                        return (
                          <div key={idx} className="min-w-[40px] min-h-[30px] flex items-center justify-center">
                            {!isSelected && (
                              <motion.button
                                layoutId={`word-${q.id}-${idx}`}
                                onClick={() => handleAddWordToAnswer(q.id, idx)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-all"
                                whileTap={{ scale: 0.95 }}
                              >
                                {w}
                              </motion.button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multiple Choice Options (for multiple-choice, translation, error-correction, fill-blank) */}
            {(q.type === 'multiple-choice' || q.type === 'translation' || q.type === 'error-correction' || q.type === 'fill-blank') ? (
              <div className="space-y-2 mt-2">
                {Object.entries((q as MultipleChoiceQuestion | TranslationQuestion | ErrorCorrectionQuestion | FillBlankQuestion).options).map(([key, val]) => (
                  <label key={key} className={getLabelClass(key)}>
                    <input 
                      type="radio" 
                      name={q.id} 
                      value={key} 
                      disabled={submitted || shownResults[q.id]}
                      checked={userAnswer === key} 
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="w-4 h-4 text-brand-green border-slate-300 focus:ring-brand-green shrink-0" 
                    />
                    <span className="font-black text-slate-400 shrink-0">{key}.</span>
                    <span className="font-medium text-slate-700">{val}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {isShown && userAnswer && (
              <div className={"mt-3 p-3 rounded-lg flex items-start gap-3 " + (isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
                {isCorrect ? <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} /> : <XCircle className="text-red-500 shrink-0 mt-0.5" size={18} />}
                <div>
                  <p className={"text-sm font-bold " + (isCorrect ? 'text-green-800' : 'text-red-800')}>
                    {isCorrect ? 'Tuyệt vời!' : 'Chưa đúng rồi. Đáp án đúng: ' + getCorrectAnswer(q)}
                  </p>
                  <p className={"text-xs mt-1 leading-relaxed " + (isCorrect ? 'text-green-700/80' : 'text-red-700/80')}>{q.explanation}</p>
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
