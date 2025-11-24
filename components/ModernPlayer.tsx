
import React, { useState, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2 } from 'lucide-react';
import { Show } from '../types';

interface ModernPlayerProps {
  show: Show;
  activeSegmentIndex: number;
  isPlaying: boolean;
  setIsPlaying: (val: boolean) => void;
  onSegmentChange: (index: number) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  onShowDetails: () => void;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ModernPlayer: React.FC<ModernPlayerProps> = ({ 
  show, 
  activeSegmentIndex, 
  isPlaying, 
  setIsPlaying,
  onSegmentChange,
  currentTime,
  onSeek,
  onShowDetails
}) => {
  
  const segment = show.segments[activeSegmentIndex];
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const totalShowDuration = useMemo(() => {
     // Prefer explicit total show duration from backend if available
     if (show.totalDuration && !isNaN(show.totalDuration)) {
       return show.totalDuration;
     }
     // Fallback: derive from segments (legacy shows)
     if (!show.segments || show.segments.length === 0) return 0;
     const lastSeg = show.segments[show.segments.length - 1];
     if (lastSeg.startTime !== undefined) {
         return lastSeg.startTime + lastSeg.duration;
     }
     return show.segments.reduce((acc, s) => acc + s.duration, 0);
  }, [show.totalDuration, show.segments]);

  if (!segment) {
      return null;
  }

  const displayTime = isDragging ? dragValue : currentTime;
  const duration = totalShowDuration > 0 ? totalShowDuration : segment.duration; 

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragValue(Number(e.target.value));
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
    onSeek(dragValue);
  };

  const handleSeekStart = () => {
    setIsDragging(true);
    setDragValue(currentTime);
  };

  const progressPercent = duration > 0 ? Math.min((displayTime / duration) * 100, 100) : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60]">
      {/* 
        OPTIMIZED PLAYER
        Focus: Show Title, Moderator, Total Duration, Current Seconds
      */}
      <div className="bg-[#050505]/95 backdrop-blur-2xl border-t border-white/10 pb-8 pt-6 px-6 md:px-8 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-8 pb-2 md:pb-0">
            
            {/* 1. Show & Host Info (CLICKABLE) */}
            <div 
                className="flex items-center gap-5 w-full md:w-1/3 min-w-0 justify-start cursor-pointer group/info relative"
                onClick={onShowDetails}
                title="Open Show Details"
            >
                 {/* Cover Art */}
                 <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 hidden sm:block shadow-lg">
                    <img src={show.coverUrl} alt={show.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/info:opacity-100 transition-opacity">
                        <Maximize2 size={20} className="text-white drop-shadow-lg" />
                    </div>
                 </div>

                 <div className="flex flex-col min-w-0 text-center md:text-left w-full md:w-auto">
                    {/* TITLE */}
                    <h3 className="text-white font-bold text-lg leading-tight truncate mb-1 group-hover/info:text-cyan-300 transition-colors">
                       {show.title}
                    </h3>
                    
                    {/* HOST */}
                    <div className="flex items-center justify-center md:justify-start gap-2">
                         <span className="text-cyan-400 text-sm font-medium uppercase tracking-wide truncate">
                            {show.hosts}
                        </span>
                    </div>
                 </div>
            </div>

            {/* 2. Controls */}
            <div className="flex items-center justify-center gap-8 flex-1 shrink-0 order-2 md:order-none">
                <button 
                    onClick={() => activeSegmentIndex > 0 && onSegmentChange(activeSegmentIndex - 1)}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-20 p-3"
                    disabled={activeSegmentIndex === 0}
                >
                    <SkipBack size={24} fill="currentColor" />
                </button>

                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                >
                    {isPlaying ? <Pause fill="currentColor" size={28} /> : <Play fill="currentColor" size={28} className="ml-1" />}
                </button>

                <button 
                    onClick={() => activeSegmentIndex < show.segments.length - 1 && onSegmentChange(activeSegmentIndex + 1)}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-20 p-3"
                    disabled={activeSegmentIndex === show.segments.length - 1}
                >
                    <SkipForward size={24} fill="currentColor" />
                </button>
            </div>

            {/* 3. Time & Duration */}
            <div className="flex flex-col justify-center w-full md:w-1/3 gap-2 order-3 md:order-none">
                
                {/* Time Labels */}
                <div className="flex items-end justify-between font-mono font-bold px-1 tracking-wide text-sm">
                     <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                        {formatTime(displayTime)}
                     </span>
                     <span className="text-gray-500">
                        {formatTime(duration)}
                     </span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-1.5 w-full group cursor-pointer mt-1">
                    <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden"></div>
                    <div 
                        className="absolute inset-y-0 left-0 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        value={displayTime}
                        onChange={handleSeekChange}
                        onMouseDown={handleSeekStart}
                        onMouseUp={handleSeekEnd}
                        onTouchStart={handleSeekStart}
                        onTouchEnd={handleSeekEnd}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
