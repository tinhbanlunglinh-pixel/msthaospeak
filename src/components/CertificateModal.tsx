import React, { useRef } from 'react';
import { X, Download, RefreshCw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { EvaluationResult, EnglishLevel } from '../types';

interface CertificateModalProps {
  show: boolean;
  onClose: () => void;
  evaluation: EvaluationResult | null;
  studentName: string;
  teacherName: string;
  generatedTopicName: string | null;
  topic: string;
  level: EnglishLevel;
  isDownloading: boolean;
  setIsDownloading: (d: boolean) => void;
  setError: (err: string | null) => void;
  exerciseScore: number | null;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  show, onClose, evaluation, studentName, teacherName,
  generatedTopicName, topic, level, isDownloading, setIsDownloading, setError, exerciseScore
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const downloadCertificate = async () => {
    if (!certificateRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(certificateRef.current, {
        useCORS: true, allowTaint: true, scale: 2,
        backgroundColor: '#ffffff', logging: true, imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const container = clonedDoc.querySelector('[data-certificate-container]') as HTMLElement;
          if (container) { container.style.backgroundImage = 'none'; container.style.boxShadow = 'none'; container.style.transform = 'none'; }
          const blurredElements = clonedDoc.querySelectorAll('.backdrop-blur-sm, .backdrop-blur-md, .backdrop-blur-lg');
          blurredElements.forEach((el: any) => { el.style.backdropFilter = 'none'; });
        },
        ignoreElements: (element) => element.hasAttribute('data-html2canvas-ignore'),
      });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.style.display = 'none'; link.href = dataUrl;
      link.download = `Certificate_${studentName.replace(/\s+/g, '_') || 'Student'}.png`;
      document.body.appendChild(link); link.click();
      setTimeout(() => { if (link.parentNode) document.body.removeChild(link); }, 500);
    } catch (err) {
      console.error("Failed to download certificate", err);
      setError("Không thể tải giấy chứng nhận. Vui lòng thử lại hoặc chụp màn hình.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && evaluation && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors z-10">
              <X size={20} />
            </button>

            <div className="p-4 sm:p-8 overflow-auto max-h-[80vh]">
              <div 
                ref={certificateRef} data-certificate-container
                className="relative w-full aspect-[1.414/1] bg-white p-6 sm:p-12 flex flex-col items-center justify-between text-center font-serif"
                style={{ border: '16px double #10b981', backgroundImage: 'radial-gradient(circle at 2px 2px, #ecfdf5 1px, transparent 0)', backgroundSize: '32px 32px', backgroundColor: '#ffffff' }}
              >
                {/* Corners */}
                <div className="absolute top-4 left-4 w-16 sm:w-20 h-16 sm:h-20 rounded-tl-lg" style={{ borderTop: '8px solid #34d399', borderLeft: '8px solid #34d399' }} />
                <div className="absolute top-4 right-4 w-16 sm:w-20 h-16 sm:h-20 rounded-tr-lg" style={{ borderTop: '8px solid #34d399', borderRight: '8px solid #34d399' }} />
                <div className="absolute bottom-4 left-4 w-16 sm:w-20 h-16 sm:h-20 rounded-bl-lg" style={{ borderBottom: '8px solid #34d399', borderLeft: '8px solid #34d399' }} />
                <div className="absolute bottom-4 right-4 w-16 sm:w-20 h-16 sm:h-20 rounded-br-lg" style={{ borderBottom: '8px solid #34d399', borderRight: '8px solid #34d399' }} />

                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #0d4023, #00a84d)', border: '4px solid #ffffff', color: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                      <Trophy size={48} style={{ color: '#ffffff' }} />
                    </div>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-widest" style={{ color: '#0d4023', textShadow: '2px 2px 0 rgba(13,64,35,0.1)' }}>Certificate of Excellence</h1>
                  <p className="text-base sm:text-xl italic font-medium" style={{ color: '#059669' }}>This award is proudly presented to</p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl sm:text-6xl font-black pb-4 min-w-[200px] sm:min-w-[400px] font-serif italic" style={{ color: '#0d4023', borderBottom: '4px solid #d1fae5' }}>
                    {studentName || "Little Star"}
                  </h2>
                  <div className="space-y-1">
                    <p className="text-base sm:text-xl font-medium" style={{ color: '#4B5563' }}>For outstanding performance in English Speaking</p>
                    <p className="text-sm sm:text-lg font-bold italic" style={{ color: '#6B7280' }}>Topic: {generatedTopicName || topic || "General English"}</p>
                  </div>
                  <div className="inline-block px-4 sm:px-6 py-2 rounded-full text-lg sm:text-2xl font-black uppercase tracking-widest" style={{ backgroundColor: '#f0fdf4', color: '#065f46', border: '2px solid #d1fae5' }}>
                    Level: {level}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center">
                  <div className="px-6 sm:px-10 py-4 sm:py-6 rounded-[2rem]" style={{ background: 'linear-gradient(to bottom right, #f0fdf4, #d1fae5)', border: '4px solid #ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                    <p className="text-[10px] sm:text-xs uppercase font-black tracking-[0.2em] mb-2" style={{ color: '#059669' }}>Speaking Score</p>
                    <p className="text-3xl sm:text-5xl font-black" style={{ color: '#065f46', textShadow: '2px 2px 0 white' }}>{evaluation.score}<span className="text-lg sm:text-xl" style={{ color: '#34d399' }}>/10</span></p>
                  </div>
                  {exerciseScore !== null && (
                    <div className="px-6 sm:px-10 py-4 sm:py-6 rounded-[2rem]" style={{ background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)', border: '4px solid #ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                      <p className="text-[10px] sm:text-xs uppercase font-black tracking-[0.2em] mb-2" style={{ color: '#2563eb' }}>Exercise Score</p>
                      <p className="text-3xl sm:text-5xl font-black" style={{ color: '#1e40af', textShadow: '2px 2px 0 white' }}>{exerciseScore}<span className="text-lg sm:text-xl" style={{ color: '#60a5fa' }}>/10</span></p>
                    </div>
                  )}
                </div>

                <div className="w-full flex justify-between items-end pt-8 sm:pt-12 px-4 sm:px-8">
                  <div className="text-left space-y-2">
                    <p className="text-xs sm:text-sm font-black" style={{ color: '#0d4023' }}>{new Date().toLocaleDateString('vi-VN')}</p>
                    <div className="w-32 sm:w-48" style={{ borderBottom: '2px solid #d1fae5' }} />
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest" style={{ color: '#059669' }}>Date of Issue</p>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-base sm:text-xl font-black font-serif italic" style={{ color: '#0d4023' }}>{teacherName}</p>
                    <div className="w-32 sm:w-48" style={{ borderBottom: '2px solid #d1fae5' }} />
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest" style={{ color: '#059669' }}>Head Teacher</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
              <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-colors">Đóng</button>
              <button onClick={downloadCertificate} disabled={isDownloading}
                className="flex-[2] py-3 bg-brand-green text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg disabled:opacity-50"
              >
                {isDownloading ? <RefreshCw size={20} className="animate-spin" /> : <Download size={20} />}
                Tải Giấy Chứng Nhận (PNG)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
