
import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Play, Share2, Heart, ListMusic, BarChart3, ExternalLink, Info, Maximize2, X, FileText, Newspaper, MessageSquare, Users, Link2, Clock } from 'lucide-react';
import { Show } from '../types';
import { MatrixBackground } from './MatrixBackground';
import { SpeakerBlobs } from './SpeakerBlobs';

interface ShowDetailProps {
  show: Show;
  activeSegmentId: string | null;
  onBack: () => void;
  onPlay: (segmentIndex: number) => void;
  onSeek?: (time: number) => void; 
}

export const ShowDetail: React.FC<ShowDetailProps> = ({ show, activeSegmentId, onBack, onPlay, onSeek }) => {
  
  // Navigation & Player Logic
  const activeIndex = activeSegmentId 
    ? show.segments.findIndex(s => s.id === activeSegmentId) 
    : 0;
  
  const [displayedSegmentIndex, setDisplayedSegmentIndex] = useState(activeIndex !== -1 ? activeIndex : 0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Sync displayed segment with active playing segment ONLY if user hasn't manually selected one recently
  useEffect(() => {
    if (activeSegmentId) {
      const idx = show.segments.findIndex(s => s.id === activeSegmentId);
      if (idx !== -1) {
          setDisplayedSegmentIndex(idx);
      }
    }
  }, [activeSegmentId, show.segments]);

  const safeIndex = displayedSegmentIndex >= 0 && displayedSegmentIndex < show.segments.length ? displayedSegmentIndex : 0;
  const displayedSegment = show.segments[safeIndex];
  const isPlayingThisShow = activeSegmentId === displayedSegment?.id;
  
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (transcriptRef.current) {
          transcriptRef.current.scrollTop = 0;
      }
  }, [displayedSegment]);

  // Handle clicking a transcript line
  const handleTranscriptClick = (relativeTimestamp: number) => {
      if (!isPlayingThisShow) {
          onPlay(safeIndex);
      }
      
      const audioEl = document.querySelector('audio');
      if (audioEl) {
          // Add a small buffer or just set time
          audioEl.currentTime = relativeTimestamp; 
          audioEl.play().catch(() => {});
      }
  };

  const handleOpenLink = (e: React.MouseEvent, url?: string) => {
      e.stopPropagation();
      if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
      }
  };

  if (!displayedSegment) return null;

  return (
    <div className="min-h-screen w-full bg-black relative overflow-hidden">
      
      {/* --- BACKGROUND VISUALS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#050505]">
         <SpeakerBlobs isDeclanActive={isPlayingThisShow} isAlexandraActive={false} />
         <MatrixBackground />
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black pointer-events-none"></div>
      </div>

      {/* --- LIGHTBOX OVERLAY --- */}
      {isLightboxOpen && (
        <div 
            className="fixed inset-0 z-[50] flex items-center justify-center p-4 md:p-12"
        >
            <div 
                className="absolute inset-0 bg-black/95" 
                onClick={() => setIsLightboxOpen(false)}
            ></div>
            <div className="relative w-full max-w-5xl aspect-square md:aspect-video flex items-center justify-center pointer-events-none">
                <img 
                    src={show.coverUrl} 
                    alt="Cover Fullscreen" 
                    className="
                        relative z-10 w-auto h-auto max-w-full max-h-[70vh] 
                        rounded-sm shadow-none border border-white/10
                        pointer-events-auto
                    "
                />
                <button 
                    onClick={() => setIsLightboxOpen(false)}
                    className="absolute top-4 right-4 z-20 p-3 bg-black/50 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all pointer-events-auto"
                >
                    <X size={24} />
                </button>
            </div>
        </div>
      )}

      {/* --- NAV --- */}
      <div className="relative z-20 flex items-center justify-between px-6 py-6 max-w-[1920px] mx-auto">
         <button onClick={onBack} className="flex items-center gap-3 group text-gray-400 hover:text-white transition-colors">
            <div className="p-2.5 rounded-full bg-white/5 border border-white/5 group-hover:bg-white/10 transition-all">
              <ArrowLeft size={20} />
            </div>
            <span className="font-medium text-sm tracking-widest uppercase">Back to Dashboard</span>
         </button>
      </div>

      {/* --- CONTENT --- */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 mt-2 lg:mt-8 flex flex-col lg:flex-row gap-8 lg:gap-12 h-[calc(100vh-180px)]">
          
          {/* LEFT: TOPICS & NEWS (Source: used_news via apiService) */}
          <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col h-full pb-32 lg:pb-0 shrink-0 overflow-y-auto no-scrollbar lg:overflow-hidden">
              
              {/* Show Header Info */}
              <div className="mb-6 px-1">
                  
                  {/* MOBILE VIEW */}
                  <div className="flex lg:hidden items-center gap-5 mb-6">
                      <img 
                        src={show.coverUrl} 
                        alt="Cover" 
                        onClick={() => setIsLightboxOpen(true)}
                        className="w-20 h-20 rounded-2xl object-cover shadow-2xl border border-white/10" 
                      />
                      <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{show.date}</span>
                          <h1 className="text-xl font-bold text-white leading-none mb-1">{show.title}</h1>
                          <p className="text-xs text-cyan-400">{show.hosts}</p>
                      </div>
                  </div>

                  {/* DESKTOP VIEW: Large Card */}
                  <div className="hidden lg:flex flex-col items-center mb-6">
                      <div className="text-center w-full px-4">
                          <h1 className="text-3xl font-bold text-white leading-tight mb-2">
                            {show.title}
                          </h1>
                          <p className="text-sm text-cyan-400 font-medium uppercase tracking-widest mb-4">{show.hosts}</p>
                      </div>
                  </div>

                  {/* ABOUT TOGGLE */}
                  <details className="bg-[#111]/80 border border-white/5 rounded-2xl mb-6 shadow-none group">
                      <summary className="flex items-center justify-between p-4 cursor-pointer text-gray-300 hover:text-white text-xs font-bold uppercase tracking-widest list-none">
                          <div className="flex items-center gap-2">
                              <Info size={14} /> About the Show
                          </div>
                          <span className="group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="px-4 pb-4 pt-0">
                          <p className="text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3">
                              {show.longDescription || show.description || "No description available."}
                          </p>
                      </div>
                  </details>
              </div>

              {/* NEWS TOPICS LIST */}
              <div className="flex-1 flex flex-col min-h-0 bg-black/20 border border-white/5 rounded-3xl overflow-hidden lg:mb-0 mb-8 shadow-none">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0A0A0A] z-10 shrink-0">
                      <div className="flex items-center gap-2">
                          <ListMusic size={16} className="text-cyan-500" />
                          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Topics & News</span>
                      </div>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400">{show.segments.length}</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 no-scrollbar min-h-0 space-y-3">
                      {show.segments.map((segment, idx) => {
                          const isSelected = idx === safeIndex;
                          const isActivePlaying = activeSegmentId === segment.id;
                          const hasLink = segment.sourceUrl && segment.sourceUrl.length > 0;
                          
                          return (
                              <div 
                                key={segment.id}
                                onClick={() => {
                                    setDisplayedSegmentIndex(idx);
                                    if (segment.id !== activeSegmentId) {
                                        // Seek to audio timestamp
                                        const audioEl = document.querySelector('audio');
                                        if (audioEl && segment.startTime !== undefined) {
                                            audioEl.currentTime = segment.startTime;
                                        }
                                        onPlay(idx);
                                    }
                                }}
                                className={`
                                    group relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border
                                    ${isSelected ? 'bg-white/10 border-white/20' : 'bg-[#111]/40 border-white/5 hover:bg-white/5'}
                                `}
                              >
                                  {/* Header: Source Badge & Time */}
                                  <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                          <div className={`p-1 rounded bg-white/5 ${isActivePlaying ? 'text-cyan-400' : 'text-gray-500'}`}>
                                            {isActivePlaying ? <BarChart3 size={12} className="animate-pulse"/> : <Newspaper size={12}/>}
                                          </div>
                                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate max-w-[120px]">
                                              {segment.sourceName || "Topic"}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                         {segment.category && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 uppercase">
                                                {segment.category}
                                            </span>
                                         )}
                                      </div>
                                  </div>

                                  {/* Title */}
                                  <h4 className={`text-sm font-bold leading-snug mb-2 ${isActivePlaying ? 'text-cyan-50' : 'text-gray-200 group-hover:text-white'}`}>
                                      {segment.title}
                                  </h4>

                                  {/* Summary */}
                                  {segment.articleDescription && (
                                      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-3">
                                          {segment.articleDescription}
                                      </p>
                                  )}

                                  {/* Footer: Time & Actions */}
                                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                                      <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1">
                                            <Clock size={10} />
                                            {Math.floor(segment.startTime! / 60)}:{(Math.floor(segment.startTime!) % 60).toString().padStart(2, '0')}
                                      </span>

                                      <div className="flex items-center gap-2">
                                          {/* READ ARTICLE BUTTON */}
                                          {hasLink && (
                                              <button 
                                                onClick={(e) => handleOpenLink(e, segment.sourceUrl)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-wide rounded border border-blue-500/20 transition-all"
                                              >
                                                  <span>Read</span>
                                                  <ExternalLink size={10} />
                                              </button>
                                          )}
                                          
                                          {!isActivePlaying && (
                                              <button className="text-[10px] font-bold text-gray-500 group-hover:text-cyan-400 flex items-center gap-1 transition-colors px-2 py-1">
                                                  <Play size={10} fill="currentColor"/> Play
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>

          {/* RIGHT: TRANSCRIPT (Source: segments via apiService) */}
          <div className="flex-1 flex flex-col h-full relative min-w-0 pb-32 lg:pb-0">
             
             {/* Header for Transcript Context */}
             <div className="mb-4 hidden lg:block">
                 <div className="flex items-center gap-2 mb-2">
                     <span className="text-cyan-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                        Live Transcript
                     </span>
                 </div>
                 <h2 className="text-xl font-bold text-white leading-tight opacity-50">
                     {displayedSegment.title}
                 </h2>
             </div>

             {/* Transcript Scroll Area */}
             <div className="flex-1 relative overflow-hidden rounded-3xl border border-white/5 bg-[#0A0A0A]/50 shadow-none backdrop-blur-sm flex flex-col">
                 <div className="p-4 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#0A0A0A]/90 z-10 backdrop-blur-md justify-between">
                     <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-cyan-500" />
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Conversation</span>
                     </div>
                     <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1">
                        <Play size={10} /> Click text to jump
                     </span>
                 </div>

                 <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-6 md:p-8" ref={transcriptRef}>
                    <div className="flex flex-col gap-6 max-w-3xl">
                        {displayedSegment.transcript && displayedSegment.transcript.length > 0 ? (
                             displayedSegment.transcript.map((line, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex flex-col gap-1.5 group cursor-pointer hover:bg-white/5 p-2 rounded-lg -mx-2 transition-colors"
                                    onClick={() => handleTranscriptClick(line.timestamp)}
                                >
                                    <div className="flex items-baseline gap-3">
                                        <span className={`text-xs font-bold uppercase tracking-widest min-w-[60px] ${line.speaker.toLowerCase().includes('declan') ? 'text-cyan-600' : 'text-fuchsia-600'}`}>
                                            {line.speaker}
                                        </span>
                                        <span className="text-[10px] text-gray-700 font-mono group-hover:text-cyan-500 transition-colors">
                                            {Math.floor(line.timestamp / 60)}:{(Math.floor(line.timestamp) % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                    <p className="text-lg text-gray-300 leading-relaxed font-sans pl-0 group-hover:text-white transition-colors">
                                        {line.text}
                                    </p>
                                </div>
                             ))
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 text-center py-20">
                                 <FileText size={48} strokeWidth={1} />
                                 <p className="text-sm font-bold text-gray-400">Audio Only Segment</p>
                                 <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
                                     This segment contains music, intro/outro, or the transcript has not been processed yet.
                                 </p>
                             </div>
                        )}
                    </div>
                 </div>
             </div>

          </div>

      </div>
    </div>
  );
}
