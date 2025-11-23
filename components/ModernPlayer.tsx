
import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, User, Clock, Radio, Maximize2, ExternalLink } from 'lucide-react';
import { Show } from '../types';

interface ModernPlayerProps {
  show: Show;
  activeSegmentIndex: number;
  isPlaying: boolean;
  setIsPlaying: (val: boolean) => void;
  onSegmentChange: (index: number) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  onShowDetails: () => void; // New prop for navigation
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

  if (!segment) {
      return null;
  }

  // Calculate Global Duration for the Show (sum of all segments)
  // This ensures the scrubber works for the whole episode, not just the 30s topic
  const totalDuration = show.segments.reduce((acc, s) => acc + (s.duration || 0), 0);
  
  const displayTime = isDragging ? dragValue : currentTime;
  // Fallback to segment duration if total is 0 (shouldn't happen with valid data)
  const maxTime = totalDuration > 0 ? totalDuration : segment.duration;

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

  const progressPercent = maxTime > 0 ? Math.min((displayTime / maxTime) * 100, 100) : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60]">
      {/* 
        OPTIMIZED GLASS PLAYER
        Layout Structure:
        [ Info (Show + Segment) ] --- [ Controls ] --- [ Time/Status ]
      */}
      <div className="bg-[#050505]/95 backdrop-blur-2xl border-t border-white/10 pb-8 pt-6 px-6 md:px-8 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-8 pb-2 md:pb-0">
            
            {/* 1. Show & Segment Info (CLICKABLE) */}
            <div 
                className="flex items-center gap-5 w-full md:w-1/3 min-w-0 justify-start cursor-pointer group/info relative"
                onClick={onShowDetails}
                title="Open Show Details"
            >
                 {/* Thumbnail */}
                 <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 hidden sm:block shadow-lg">
                    <img src={show.coverUrl} alt={show.title} className="w-full h-full object-cover opacity-80 group-hover/info:opacity-100 transition-opacity" />
                    {/* Hover Overlay Icon */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/info:opacity-100 transition-opacity">
                        <Maximize2 size={20} className="text-white drop-shadow-lg" />
                    </div>
                 </div>

                 <div className="flex flex-col min-w-0 text-center md:text-left w-full md:w-auto">
                    {/* Top Row: Show Title & Host */}
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-0.5">
                        <h3 className="text-white font-bold text-base leading-tight truncate group-hover/info:text-cyan-300 transition-colors">
                           {show.title}
                        </h3>
                        <span className="hidden md:inline text-gray-600 text-xs">•</span>
                        <div className="hidden md:flex items-center gap-1 text-gray-400 text-xs font-medium uppercase tracking-wide">
                            <span className="truncate max-w-[120px]">{show.hosts}</span>
                        </div>
                    </div>

                    {/* Bottom Row: Segment Info */}
                    <div className="flex items-center justify-center md:justify-start gap-2 overflow-hidden">
                        {segment.category && segment.category !== 'General' && (
                             <span className="shrink-0 bg-cyan-900/40 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-cyan-500/20">
                                {segment.category}
                             </span>
                        )}
                        <span className="text-gray-300 text-sm truncate font-medium">
                           {segment.title}
                        </span>

                         {/* LINK INDICATOR - Shows if source URL is present */}
                         {segment.sourceUrl && (
                            <a 
                                href={segment.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/20 transition-colors ml-1"
                                title={segment.sourceName || "Read Source"}
                            >
                                <ExternalLink size={10} />
                                <span className="hidden xl:inline max-w-[80px] truncate">{segment.sourceName}</span>
                            </a>
                        )}
                    </div>
                 </div>
            </div>

            {/* 2. Controls (Center) */}
            <div className="flex items-center justify-center gap-8 flex-1 shrink-0 order-2 md:order-none">
                <button 
                    onClick={() => activeSegmentIndex > 0 && onSegmentChange(activeSegmentIndex - 1)}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 p-3 hover:bg-white/5 rounded-full"
                    disabled={activeSegmentIndex === 0}
                >
                    <SkipBack size={26} fill="currentColor" />
                </button>

                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                >
                    {isPlaying ? <Pause fill="currentColor" size={28} /> : <Play fill="currentColor" size={28} className="ml-1" />}
                </button>

                <button 
                    onClick={() => activeSegmentIndex < show.segments.length - 1 && onSegmentChange(activeSegmentIndex + 1)}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 p-3 hover:bg-white/5 rounded-full"
                    disabled={activeSegmentIndex === show.segments.length - 1}
                >
                    <SkipForward size={26} fill="currentColor" />
                </button>
            </div>

            {/* 3. Time & Scrubber (Right) */}
            <div className="flex flex-col justify-center w-full md:w-1/3 gap-3 order-3 md:order-none">
                
                {/* Time Labels */}
                <div className="flex items-end justify-between font-mono font-bold px-1 tracking-wide">
                     {/* Current Time */}
                     <div className="flex flex-col items-start">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Current</span>
                        <span className="text-xl text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] leading-none">
                            {formatTime(displayTime)}
                        </span>
                     </div>
                     
                     {/* Total Duration */}
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Total</span>
                        <span className="text-lg text-gray-400 leading-none">
                            {formatTime(maxTime)}
                        </span>
                     </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 w-full group cursor-pointer mt-1">
                    <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden transition-all group-hover:bg-white/15"></div>
                    <div 
                        className="absolute inset-y-0 left-0 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                    <input
                        type="range"
                        min={0}
                        max={maxTime}
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
