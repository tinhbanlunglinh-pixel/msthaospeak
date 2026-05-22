import React, { useState } from 'react';
import { Zap, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ApiKeyModalProps {
  show: boolean;
  currentApiKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
  hasEnvKey?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ show, currentApiKey, onSave, onClose, hasEnvKey }) => {
  // Use local state to avoid modifying the real apiKey on every keystroke (bug fix)
  const [localKey, setLocalKey] = useState(currentApiKey);

  // Sync when modal opens
  React.useEffect(() => {
    if (show) {
      setLocalKey(currentApiKey);
    }
  }, [show, currentApiKey]);

  const handleSave = () => {
    const trimmedKey = localKey.trim();
    if (!trimmedKey) return;
    onSave(trimmedKey);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border-4 border-emerald-100"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-brand-green shadow-inner">
                <Zap size={40} className="animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark uppercase tracking-tight">Cài đặt Gemini API Key</h2>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Để sử dụng ứng dụng, bạn cần nhập Gemini API Key cá nhân. Điều này giúp bạn có thể sử dụng không giới hạn và hoàn toàn miễn phí.
              </p>
              
              <div className="w-full space-y-4">
                <div className="text-left">
                  <label className="text-xs font-black text-brand-green uppercase tracking-widest block mb-2 px-1">Nhập API Key</label>
                  <input 
                    type="password"
                    placeholder="AIzaSyB..."
                    value={localKey}
                    onChange={(e) => setLocalKey(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-green/10 focus:border-brand-green transition-all font-mono text-sm"
                  />
                </div>

                <a 
                  href="https://aistudio.google.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-brand-green hover:text-brand-green-dark font-bold text-sm underline decoration-2 underline-offset-4 transition-all"
                >
                  <Languages size={16} />
                  Nhấn vào đây để lấy API Key miễn phí
                </a>

                <button
                  onClick={handleSave}
                  disabled={!localKey.trim()}
                  className="w-full py-4 bg-brand-green hover:bg-brand-green-dark text-white rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] uppercase tracking-widest mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lưu và Bắt đầu
                </button>
                
                {(currentApiKey || hasEnvKey) && (
                  <button 
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest mt-2"
                  >
                    Bỏ qua
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
