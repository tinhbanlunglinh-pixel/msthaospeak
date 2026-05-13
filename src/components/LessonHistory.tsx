import React from 'react';
import { Clock, Trash2, RotateCcw, X, BookOpen, Star, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LessonRecord } from '../hooks/useLessonHistory';

interface LessonHistoryProps {
  lessons: LessonRecord[];
  show: boolean;
  onClose: () => void;
  onLoadLesson: (lesson: LessonRecord) => void;
  onRemoveLesson: (id: string) => void;
  onClearAll: () => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(timestamp).toLocaleDateString('vi-VN');
}

export const LessonHistory: React.FC<LessonHistoryProps> = ({
  lessons, show, onClose, onLoadLesson, onRemoveLesson, onClearAll
}) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b-4 border-emerald-50 bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center text-white shadow-md">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-brand-green-dark uppercase tracking-wider">Lịch sử bài học</h3>
                  <p className="text-[10px] text-slate-400 font-bold">{lessons.length} bài đã học</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lessons.length > 0 && (
                  <button
                    onClick={() => { if (window.confirm('Xóa toàn bộ lịch sử?')) onClearAll(); }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Xóa tất cả"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Lesson List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <BookOpen size={36} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-500">Chưa có bài học nào</p>
                    <p className="text-sm text-slate-400 mt-1">Tạo bài học mới để bắt đầu!</p>
                  </div>
                </div>
              ) : (
                lessons.map((lesson, idx) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group bg-white border-2 border-emerald-100/60 rounded-2xl p-3 sm:p-4 hover:border-brand-green/40 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => { onLoadLesson(lesson); onClose(); }}
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        {lesson.generatedImage ? (
                          <img src={lesson.generatedImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <BookOpen size={24} />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-black text-sm text-slate-800 truncate leading-tight">
                            {lesson.topicName || 'Untitled Lesson'}
                          </h4>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-green shrink-0 mt-0.5 transition-colors" />
                        </div>
                        
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {lesson.readingText?.substring(0, 80)}...
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black">{lesson.level}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{timeAgo(lesson.createdAt)}</span>
                          {lesson.score !== undefined && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-[10px] font-black border border-yellow-200">
                              <Star size={10} fill="currentColor" /> {lesson.score}/10
                            </span>
                          )}
                          <span className="text-[10px] text-slate-300 font-medium">{lesson.vocabulary?.length || 0} từ</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex justify-end mt-2 pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveLesson(lesson.id); }}
                        className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold transition-all"
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
