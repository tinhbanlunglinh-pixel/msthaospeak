import React from 'react';
import { Mic, Square, RefreshCw, Star, ThumbsUp, CheckCircle, AlertCircle, Zap, Trophy, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { EvaluationResult } from '../types';

interface SpeechEvaluatorProps {
  readingText: string | null;
  isRecording: boolean;
  isEvaluating: boolean;
  evaluation: EvaluationResult | null;
  studentName: string;
  teacherName: string;
  setStudentName: (name: string) => void;
  setTeacherName: (name: string) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  onShowCertificate: () => void;
  isExerciseCompleted?: boolean;
}

export const SpeechEvaluator: React.FC<SpeechEvaluatorProps> = ({
  readingText, isRecording, isEvaluating, evaluation,
  studentName, teacherName, setStudentName, setTeacherName,
  startRecording, stopRecording, onShowCertificate, isExerciseCompleted
}) => {
  if (!readingText) return null;

  return (
    <div className="w-full max-w-[600px] mt-1 space-y-2">
      <div className="flex flex-col items-center gap-2 p-3 bg-emerald-50/20 rounded-xl border border-emerald-100">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
          <Mic size={16} className="text-emerald-500" />
          <span>Ms Thao: Luyện nói cùng cô giáo</span>
        </div>
        
        {!evaluation && !isEvaluating && !isRecording && (
          <button
            onClick={startRecording}
            className="flex items-center gap-3 px-5 sm:px-6 py-3 rounded-2xl font-black text-white transition-all shadow-xl text-sm sm:text-base bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-1"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            <Mic size={20} />
            Bắt đầu luyện nói
          </button>
        )}

        {isRecording && !isEvaluating && (
          <>
            <button
              onClick={stopRecording}
              className="flex items-center gap-3 px-5 sm:px-6 py-3 rounded-2xl font-black text-white transition-all shadow-xl text-sm sm:text-base bg-red-500 hover:bg-red-600 animate-pulse scale-105"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              <Square size={20} fill="currentColor" />
              Đang nghe bé nói...
            </button>
            <p className="text-[10px] text-red-400 font-bold animate-pulse">
              Mẹo: Sau khi đọc xong, bé chờ 1 giây rồi hãy nhấn nút dừng nhé!
            </p>
          </>
        )}

        {isEvaluating && (
          <div className="flex flex-col items-center gap-3 py-4 animate-pulse">
            <RefreshCw className="animate-spin text-brand-green" size={32} />
            <div className="text-center">
              <p className="text-sm font-black text-brand-green">Cô Thảo đang nghe và chấm điểm cho con nhé...</p>
              <p className="text-[10px] text-slate-400 font-medium">Bé chờ cô một chút xíu thôi!</p>
            </div>
          </div>
        )}

        {evaluation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
            {!evaluation.isComplete ? (
              <IncompleteResult evaluation={evaluation} startRecording={startRecording} />
            ) : (
              <CompleteResult 
                evaluation={evaluation} startRecording={startRecording}
                studentName={studentName} teacherName={teacherName}
                setStudentName={setStudentName} setTeacherName={setTeacherName}
                onShowCertificate={onShowCertificate}
                isExerciseCompleted={!!isExerciseCompleted}
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const IncompleteResult: React.FC<{ evaluation: EvaluationResult; startRecording: () => Promise<void> }> = ({ evaluation, startRecording }) => (
  <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm space-y-3">
    <div className="flex items-center gap-3 text-red-600">
      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><RefreshCw size={20} /></div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider">Chưa hoàn thành</div>
        <div className="text-sm font-medium">Bé cần đọc lại đầy đủ nhé!</div>
      </div>
    </div>
    <p className="text-sm text-gray-700 leading-relaxed italic">"{evaluation.feedback}"</p>
    {evaluation.missingContent && (
      <div className="bg-white/50 p-2 rounded-lg border border-red-200 text-xs text-red-700">
        <span className="font-bold">Phần thiếu:</span> {evaluation.missingContent}
      </div>
    )}
    <button onClick={startRecording} className="w-full py-2 bg-red-500 text-white rounded-lg font-bold text-xs hover:bg-red-600 transition-colors">Đọc lại ngay</button>
  </div>
);

const CompleteResult: React.FC<{
  evaluation: EvaluationResult;
  startRecording: () => Promise<void>;
  studentName: string; teacherName: string;
  setStudentName: (n: string) => void; setTeacherName: (n: string) => void;
  onShowCertificate: () => void;
  isExerciseCompleted: boolean;
}> = ({ evaluation, startRecording, studentName, teacherName, setStudentName, setTeacherName, onShowCertificate, isExerciseCompleted }) => (
  <>
    {/* Score */}
    <div className="flex items-center justify-between bg-gradient-to-br from-white to-emerald-50 p-4 sm:p-6 rounded-2xl border-2 border-emerald-200 shadow-md">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-yellow rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-yellow/20 rotate-3">
          <Star size={28} fill="currentColor" />
        </div>
        <div>
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Điểm số & Xếp loại CEFR</div>
          <div className="flex items-center gap-3">
            <div className="text-3xl sm:text-4xl font-black text-emerald-700">{evaluation.score}</div>
            <div className="px-3 py-1 bg-brand-green text-white rounded-lg text-sm font-black shadow-sm">{evaluation.cefrLevel}</div>
          </div>
        </div>
      </div>
      <button onClick={startRecording} className="px-3 sm:px-4 py-2 bg-white text-emerald-600 border-2 border-emerald-100 rounded-xl font-bold text-xs sm:text-sm hover:border-brand-green transition-all shadow-sm active:scale-95">Thử lại</button>
    </div>

    {/* Criteria Scores */}
    {evaluation.criteriaScores && (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Tiêu chí chấm điểm</span>
          <span className="text-[9px] font-medium text-slate-400 italic">Điều kiện: Đọc đủ & đúng 100% nội dung</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 bg-white p-3 sm:p-4 rounded-2xl border-2 border-emerald-50 shadow-sm">
          {Object.entries(evaluation.criteriaScores).map(([key, score]) => (
            <div key={key} className="text-center p-2 sm:p-3 rounded-xl bg-emerald-50/30 border border-emerald-100">
              <div className="text-[8px] sm:text-[9px] font-bold text-emerald-400 uppercase leading-tight mb-1">
                {key === 'pronunciation' ? 'Phát âm' : key === 'stress' ? 'Trọng âm' : key === 'intonation' ? 'Ngữ điệu' : key === 'fluency' ? 'Trôi chảy' : 'Nối âm'}
              </div>
              <div className="text-lg font-black text-emerald-600">{score}</div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Feedback */}
    <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-emerald-100 shadow-md space-y-6">
      <div className="flex items-start gap-3 bg-green-50 p-3 sm:p-4 rounded-xl border border-green-100">
        <ThumbsUp size={24} className="text-green-500 mt-0.5 shrink-0" />
        <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed italic">"{evaluation.feedback}"</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center"><CheckCircle size={14} /></div>
            <div className="text-xs font-black uppercase tracking-wider">Ưu điểm nổi bật</div>
          </div>
          <div className="space-y-2">
            {evaluation.strengths.map((s, i) => (
              <div key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2 bg-green-50/30 p-2 rounded-lg">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 shrink-0" /> {s}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-orange-600">
            <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center"><AlertCircle size={14} /></div>
            <div className="text-xs font-black uppercase tracking-wider">Cần chú ý thêm</div>
          </div>
          <div className="space-y-2">
            {evaluation.improvements.map((imp, i) => (
              <div key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2 bg-orange-50/30 p-2 rounded-lg">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0" /> {imp}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* IPA Analysis */}
      {evaluation.ipaAnalysis && evaluation.ipaAnalysis.length > 0 && (
        <div className="pt-4 border-t-2 border-slate-50">
          <div className="flex items-center gap-2 text-indigo-600 mb-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Zap size={18} /></div>
            <div className="text-xs font-black uppercase tracking-widest">Phân tích âm học (IPA)</div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-2 sm:p-3 text-xs font-black text-slate-500 uppercase">Từ vựng</th>
                  <th className="p-2 sm:p-3 text-xs font-black text-green-600 uppercase">IPA Chuẩn</th>
                  <th className="p-2 sm:p-3 text-xs font-black text-red-500 uppercase">Bé đọc</th>
                  <th className="p-2 sm:p-3 text-xs font-black text-indigo-400 uppercase">Mẹo cho bé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {evaluation.ipaAnalysis.map((item, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="p-2 sm:p-3 text-sm font-black text-slate-700">{item.word}</td>
                    <td className="p-2 sm:p-3 text-sm sm:text-base font-serif font-bold text-green-600">{item.correctIpa}</td>
                    <td className="p-2 sm:p-3 text-sm sm:text-base font-serif font-bold text-red-500">{item.studentIpa}</td>
                    <td className="p-2 sm:p-3 text-xs text-slate-500 font-medium leading-relaxed">{item.tip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Practice Sentences */}
      {(evaluation.standardSentences?.length || 0) > 0 && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <div>
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Câu mẫu luyện tập</div>
            {evaluation.standardSentences?.map((sentence, idx) => (
              <p key={idx} className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 mb-1">{sentence}</p>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Bài tập đề xuất</div>
            <div className="flex flex-wrap gap-2">
              {evaluation.personalizedExercises?.map((ex, idx) => (
                <div key={idx} className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">{ex}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Certificate Inputs */}
      <div className="pt-4 border-t border-indigo-50 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tên học sinh</label>
            <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Nhập tên bé..."
              className="w-full px-3 py-2 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Tên giáo viên</label>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Tên giáo viên..."
              className="w-full px-3 py-2 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
        <button onClick={onShowCertificate}
          disabled={!isExerciseCompleted}
          className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg 
            ${isExerciseCompleted 
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 hover:shadow-orange-200 hover:-translate-y-1' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          {isExerciseCompleted ? (
            <><Trophy size={20} className="animate-bounce" /> NHẬN GIẤY CHỨNG NHẬN NGAY!</>
          ) : (
            <><Trophy size={20} /> HOÀN THÀNH BÀI TẬP ĐỂ NHẬN CHỨNG NHẬN</>
          )}
        </button>
      </div>
    </div>
  </>
);
