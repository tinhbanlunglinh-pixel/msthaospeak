import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Volume2, Pause, RefreshCw, Target, Play } from 'lucide-react';
import { VocabularyItem, EnglishLevel } from '../types';

interface PosterPreviewProps {
  readingText: string | null;
  translationText: string | null;
  vocabulary: VocabularyItem[];
  generatedTopicName: string | null;
  topic: string;
  level: EnglishLevel;
  showTranslation: boolean;
  audioUrl: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  isAudioLoading: boolean;
  isBrowserTTS: boolean;
  setIsPlaying: (playing: boolean) => void;
  handlePlayAudio: () => Promise<void>;
  isDownloading: boolean;
  onDownloadPoster: () => void;
  onToggleTranslation: () => void;
  posterRef: React.RefObject<HTMLDivElement | null>;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

export const PosterPreview: React.FC<PosterPreviewProps> = ({
  readingText, translationText, vocabulary,
  generatedTopicName, topic, level, showTranslation,
  audioUrl, audioRef, isPlaying, isAudioLoading, isBrowserTTS,
  setIsPlaying, handlePlayAudio,
  isDownloading, onDownloadPoster, onToggleTranslation,
  posterRef
}) => {
  return (
    <div
      ref={posterRef}
      data-poster-container
      className="p-3 sm:p-4 flex flex-col gap-4 relative overflow-hidden"
      style={{
        fontFamily: "'Libre Baskerville', serif",
        backgroundColor: '#ffffff',
        backgroundImage: 'radial-gradient(#f1f5f9 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        color: '#1a1a1a',
        borderRadius: '24px',
        border: '2px solid #e2e8f0',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        width: '100%',
        maxWidth: '600px'
      }}
    >

      {/* Text Section */}
      <div className="flex-1 p-3" style={{ backgroundColor: '#ffffff', border: '3px solid #00a84d', borderRadius: '16px', boxShadow: '0 4px 0 #0d4023' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: '#00a84d' }} />
            <h2 className="text-base font-black" style={{ color: '#064e3b', margin: 0 }}>Ms Thao's English Class</h2>
          </div>
          <div className="flex items-center gap-2" data-html2canvas-ignore>
            <button
              onClick={(e) => { e.stopPropagation(); handlePlayAudio(); }}
              disabled={isAudioLoading && !audioUrl && !isBrowserTTS}
              className="p-2 rounded-full transition-all"
              style={{
                backgroundColor: isPlaying ? '#ecfdf5' : isAudioLoading ? '#f3f4f6' : '#f9fafb',
                color: isPlaying ? '#059669' : isAudioLoading ? '#d1d5db' : '#9ca3af'
              }}
              title={isPlaying ? "Dừng" : "Nghe bài đọc"}
            >
              {isAudioLoading && !audioUrl && !isBrowserTTS ? <RefreshCw size={18} className="animate-spin" /> : isPlaying ? <Pause size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>

        {/* Custom Audio Player */}
        {audioUrl && (
          <div data-html2canvas-ignore>
            <CustomAudioPlayer audioUrl={audioUrl} audioRef={audioRef} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
          </div>
        )}

        <div className="space-y-3">
          {(generatedTopicName || (topic && topic.length < 50)) && (
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight" style={{ color: '#0369a1', lineHeight: '1.1' }}>
                {generatedTopicName || topic}
              </h3>
            </div>
          )}
          <div className="bg-white/40 p-3 sm:p-4 md:p-8 rounded-[2rem] border-2 border-white shadow-lg backdrop-blur-sm mx-auto w-full max-w-[95%]">
            <div className="text-[11px] font-black uppercase tracking-[0.4em] mb-4 text-center" style={{ color: '#0369a1', opacity: 0.5 }}>READING PASSAGE</div>
            <div
              className="leading-[1.6] whitespace-pre-wrap font-bold text-left md:text-justify px-2"
              style={{
                color: '#1e293b',
                fontSize: readingText && readingText.length > 500 ? '18px' : readingText && readingText.length > 300 ? '22px' : readingText && readingText.length > 150 ? '26px' : '30px',
                fontFamily: '"Outfit", sans-serif'
              }}
            >
              {readingText}
            </div>
          </div>

          {showTranslation && translationText && (
            <div className="space-y-2 pt-3" style={{ borderTop: '2px solid #fef3c7' }}>
              <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#d97706' }}>Tiếng Việt</div>
              <div className="text-sm sm:text-lg leading-relaxed whitespace-pre-wrap font-bold italic" style={{ color: '#334155' }}>
                {translationText}
              </div>
            </div>
          )}
        </div>

        {/* Vocabulary */}
        {vocabulary && vocabulary.length > 0 && (
          <div className="mt-6 pt-5" style={{ borderTop: '3px dashed #e2e8f0' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Target size={18} /></div>
              <h3 className="text-base font-black uppercase tracking-widest" style={{ color: '#0369a1' }}>Word Bank</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vocabulary.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl flex flex-col transition-all hover:scale-[1.02] shadow-sm hover:shadow-indigo-100 bg-white border-2 border-indigo-100/50">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <span className="font-black text-xl leading-tight" style={{ color: '#0c4a6e' }}>{item.word}</span>
                    <span className="text-sm font-bold font-serif text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 shadow-sm shrink-0">{item.ipa}</span>
                  </div>
                  <span className="text-base font-medium italic text-slate-700 whitespace-normal leading-relaxed">{item.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9ca3af' }}>MS THAO'S ENGLISH CLASS</span>
        <span className="text-[10px] font-black" style={{ color: '#00a84d' }}>Level: {level}</span>
      </div>
    </div>
  );
};


// ====== CUSTOM AUDIO PLAYER ======
const CustomAudioPlayer: React.FC<{
  audioUrl: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
}> = ({ audioUrl, audioRef, isPlaying, setIsPlaying }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    // Set initial duration if already loaded
    if (audio.duration) setDuration(audio.duration);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [audioRef, setIsPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [audioRef, isPlaying]);

  const handleSpeedChange = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const currentIdx = SPEED_OPTIONS.indexOf(speed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIdx];
    audio.playbackRate = newSpeed;
    setSpeed(newSpeed);
  }, [audioRef, speed]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = ratio * duration;
  }, [audioRef, duration]);

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mb-3 px-1 space-y-2">
      {/* Hidden native audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Play/Pause Button */}
        <button onClick={togglePlay}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm"
          style={{
            background: isPlaying ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
            color: '#ffffff'
          }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        {/* Progress Bar */}
        <div className="flex-1 space-y-0.5">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="w-full h-2 bg-slate-100 rounded-full cursor-pointer group relative overflow-hidden"
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)' }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-indigo-500 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-slate-400 px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed Button */}
        <button
          onClick={handleSpeedChange}
          className="px-2 py-1 rounded-lg text-[10px] font-black transition-all shrink-0 border"
          style={{
            backgroundColor: speed !== 1 ? '#eef2ff' : '#f9fafb',
            borderColor: speed !== 1 ? '#c7d2fe' : '#e5e7eb',
            color: speed !== 1 ? '#4f46e5' : '#6b7280'
          }}
          title="Thay đổi tốc độ"
        >
          {speed}x
        </button>
      </div>
    </div>
  );
};
