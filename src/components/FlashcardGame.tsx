import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { RotateCcw, Shuffle, CheckCircle, XCircle, Trophy, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VocabularyItem } from '../types';

type GameMode = 'flashcards' | 'matching' | null;

interface FlashcardGameProps {
  vocabulary: VocabularyItem[];
}

export const FlashcardGame: React.FC<FlashcardGameProps> = ({ vocabulary }) => {
  const [gameMode, setGameMode] = useState<GameMode>(null);

  if (!vocabulary || vocabulary.length === 0) return null;

  return (
    <div className="w-full max-w-[600px] mt-2">
      <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl border-2 border-indigo-100/60 overflow-hidden shadow-lg">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-indigo-100/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">Mini Game Từ Vựng</h3>
              <p className="text-[10px] text-indigo-400 font-medium">{vocabulary.length} từ để ôn tập</p>
            </div>
          </div>
          {gameMode && (
            <button onClick={() => setGameMode(null)} className="px-3 py-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:bg-white rounded-lg transition-all">
              ← Quay lại
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          <AnimatePresence mode="wait">
            {!gameMode ? (
              <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
                <button onClick={() => setGameMode('flashcards')}
                  className="group p-4 sm:p-5 bg-white rounded-2xl border-2 border-indigo-100 hover:border-indigo-300 hover:shadow-xl transition-all text-center space-y-3 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-indigo-200 transition-colors">
                    <BookOpen size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-indigo-900">Lật Thẻ</p>
                    <p className="text-[10px] text-indigo-400 font-medium mt-1">Lật để xem nghĩa</p>
                  </div>
                </button>
                <button onClick={() => setGameMode('matching')}
                  className="group p-4 sm:p-5 bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-300 hover:shadow-xl transition-all text-center space-y-3 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-purple-200 transition-colors">
                    <Shuffle size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-purple-900">Ghép Từ</p>
                    <p className="text-[10px] text-purple-400 font-medium mt-1">Ghép từ với nghĩa</p>
                  </div>
                </button>
              </motion.div>
            ) : gameMode === 'flashcards' ? (
              <motion.div key="flashcards" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <FlashcardMode vocabulary={vocabulary} />
              </motion.div>
            ) : (
              <motion.div key="matching" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <MatchingMode vocabulary={vocabulary} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ====== FLASHCARD MODE ======
const FlashcardMode: React.FC<{ vocabulary: VocabularyItem[] }> = ({ vocabulary }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = vocabulary[currentIndex];

  const handleNext = (known: boolean) => {
    if (known) setKnownCount(prev => prev + 1);
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex + 1 >= vocabulary.length) {
        setFinished(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 200);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCount(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
          <Trophy size={32} className="text-yellow-500" />
        </div>
        <div>
          <p className="text-lg font-black text-indigo-900">Hoàn thành! 🎉</p>
          <p className="text-sm text-slate-500 mt-1">
            Bé nhớ <span className="font-black text-brand-green">{knownCount}</span> / <span className="font-black">{vocabulary.length}</span> từ
          </p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-brand-green rounded-full transition-all" style={{ width: `${(knownCount / vocabulary.length) * 100}%` }} />
        </div>
        <button onClick={handleRestart} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm mx-auto hover:bg-indigo-700 transition-colors shadow-lg">
          <RotateCcw size={16} /> Chơi lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-[10px] font-bold text-indigo-400">
        <span>{currentIndex + 1} / {vocabulary.length}</span>
        <span className="text-emerald-500">{knownCount} đã thuộc ✓</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${((currentIndex) / vocabulary.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="flex justify-center">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative w-full max-w-[260px] sm:max-w-[300px] aspect-[3/4] cursor-pointer perspective-1000"
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full h-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <div className={`absolute inset-0 bg-white rounded-3xl border-[6px] border-indigo-50 shadow-xl p-6 flex flex-col items-center justify-center text-center ${isFlipped ? 'invisible' : ''}`}
              style={{ backfaceVisibility: 'hidden' }}
            >
              {current.emoji ? (
                <div className="text-6xl sm:text-7xl mb-6 drop-shadow-md">{current.emoji}</div>
              ) : (
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                  <BookOpen size={36} className="text-indigo-300" />
                </div>
              )}
              <p className="text-3xl sm:text-4xl font-black text-indigo-900 mb-3 leading-tight">{current.word}</p>
              <p className="text-lg font-bold font-serif text-indigo-500 bg-indigo-50 px-4 py-1.5 rounded-xl">{current.ipa}</p>
              
              <div className="absolute bottom-6 w-full px-6 left-0">
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest border-t border-slate-100 pt-3">Nhấn để lật xem nghĩa</p>
              </div>
            </div>

            {/* Back */}
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl border-[6px] border-indigo-400 shadow-xl p-6 flex flex-col items-center justify-center text-center text-white ${!isFlipped ? 'invisible' : ''}`}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {current.emoji && <div className="text-4xl sm:text-5xl mb-4 opacity-90 drop-shadow-md">{current.emoji}</div>}
              <p className="text-sm font-bold uppercase tracking-widest text-indigo-200 mb-3 opacity-80">{current.word}</p>
              <p className="text-2xl sm:text-3xl font-black leading-snug">{current.meaning}</p>
              
              <div className="absolute bottom-6 w-full px-6 left-0">
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest border-t border-indigo-400/50 pt-3">Nhấn để lật lại</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Actions */}
      {isFlipped && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
          <button onClick={() => handleNext(false)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 border-2 border-red-100 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
          >
            <XCircle size={18} /> Chưa thuộc
          </button>
          <button onClick={() => handleNext(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 border-2 border-emerald-100 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors"
          >
            <CheckCircle size={18} /> Đã thuộc!
          </button>
        </motion.div>
      )}
    </div>
  );
};

// ====== MATCHING MODE ======
interface MatchItem {
  id: string;
  text: string;
  pairId: string;
  type: 'word' | 'meaning';
}

const MatchingMode: React.FC<{ vocabulary: VocabularyItem[] }> = ({ vocabulary }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [attempts, setAttempts] = useState(0);

  const items = useMemo(() => {
    const words: MatchItem[] = vocabulary.map((v, i) => ({
      id: `w_${i}`,
      text: v.word,
      pairId: `pair_${i}`,
      type: 'word' as const,
    }));
    const meanings: MatchItem[] = vocabulary.map((v, i) => ({
      id: `m_${i}`,
      text: v.meaning,
      pairId: `pair_${i}`,
      type: 'meaning' as const,
    }));
    // Shuffle meanings
    const shuffled = [...meanings].sort(() => Math.random() - 0.5);
    return { words, meanings: shuffled };
  }, [vocabulary]);

  const allMatched = matched.size === vocabulary.length;

  const handleSelect = useCallback((item: MatchItem) => {
    if (matched.has(item.pairId)) return;
    if (wrongPair) return;

    if (!selected) {
      setSelected(item.id);
      return;
    }

    // Find the first selected item
    const allItems = [...items.words, ...items.meanings];
    const first = allItems.find(i => i.id === selected);
    if (!first || first.id === item.id) {
      setSelected(item.id);
      return;
    }

    // Must be different types
    if (first.type === item.type) {
      setSelected(item.id);
      return;
    }

    setAttempts(prev => prev + 1);

    // Check if they match
    if (first.pairId === item.pairId) {
      setMatched(prev => new Set(prev).add(first.pairId));
      setSelected(null);
    } else {
      setWrongPair([first.id, item.id]);
      setTimeout(() => {
        setWrongPair(null);
        setSelected(null);
      }, 600);
    }
  }, [selected, matched, items, wrongPair]);

  const handleRestart = () => {
    setSelected(null);
    setMatched(new Set());
    setWrongPair(null);
    setAttempts(0);
  };

  if (allMatched) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
          <Trophy size={32} className="text-purple-500" />
        </div>
        <div>
          <p className="text-lg font-black text-purple-900">Tuyệt vời! 🎊</p>
          <p className="text-sm text-slate-500 mt-1">
            Bé ghép đúng hết trong <span className="font-black text-purple-600">{attempts}</span> lượt!
          </p>
        </div>
        <button onClick={handleRestart} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm mx-auto hover:bg-purple-700 transition-colors shadow-lg">
          <RotateCcw size={16} /> Chơi lại
        </button>
      </div>
    );
  }

  const getItemStyle = (item: MatchItem): string => {
    if (matched.has(item.pairId)) return 'bg-emerald-50 border-emerald-200 text-emerald-600 opacity-60 scale-95';
    if (wrongPair?.includes(item.id)) return 'bg-red-50 border-red-300 text-red-600 animate-shake';
    if (selected === item.id) return 'bg-indigo-100 border-indigo-400 text-indigo-700 shadow-lg scale-[1.02]';
    return 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="text-purple-400">{matched.size} / {vocabulary.length} cặp đã ghép</span>
        <span className="text-slate-400">{attempts} lượt thử</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${(matched.size / vocabulary.length) * 100}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Words column */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider text-center mb-1">Tiếng Anh</p>
          {items.words.map(item => (
            <button key={item.id} onClick={() => handleSelect(item)} disabled={matched.has(item.pairId)}
              className={`w-full p-2.5 sm:p-3 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all duration-200 ${getItemStyle(item)}`}
            >
              {item.text}
            </button>
          ))}
        </div>
        {/* Meanings column */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider text-center mb-1">Tiếng Việt</p>
          {items.meanings.map(item => (
            <button key={item.id} onClick={() => handleSelect(item)} disabled={matched.has(item.pairId)}
              className={`w-full p-2.5 sm:p-3 rounded-xl border-2 font-medium text-xs sm:text-sm transition-all duration-200 italic ${getItemStyle(item)}`}
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
