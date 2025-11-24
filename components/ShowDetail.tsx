
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ArrowLeft, Play, Share2, Heart, ListMusic, BarChart3, ExternalLink, Info, Maximize2, X, FileText, Newspaper, MessageSquare, Users, Link2, Clock } from 'lucide-react';
import { Show, Speaker } from '../types';
import { MatrixBackground } from './MatrixBackground';
import { SpeakerBlobs } from './SpeakerBlobs';

interface ShowDetailProps {
  show: Show;
  activeSegmentId: string | null;
  onBack: () => void;
  onPlay: (segmentIndex: number) => void;
  onSeek?: (time: number) => void;
  speakers?: Speaker[];
  currentTime?: number; // Passed from App.tsx
}

export const ShowDetail: React.FC<ShowDetailProps> = ({ show, activeSegmentId, onBack, onPlay, onSeek, speakers = [], currentTime = 0 }) => {
  
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

  // --- SEO & OPEN GRAPH METADATA UPDATE ---
  useEffect(() => {
    if (!show) return;

    // 1. Update Document Title
    const originalTitle = document.title;
    document.title = `${show.title} | RadioX`;

    // 2. Helper to set/update Meta Tags
    const setMetaTag = (attrName: string, attrValue: string, content: string) => {
        let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
        if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attrName, attrValue);
            document.head.appendChild(element);
        }
        element.setAttribute('content', content);
    };

    const descriptionText = show.description || "RadioX Show Details";

    // Standard SEO
    setMetaTag('name', 'description', descriptionText);

    // Open Graph / Facebook / LinkedIn
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:title', show.title);
    setMetaTag('property', 'og:description', descriptionText);
    setMetaTag('property', 'og:image', show.coverUrl);
    setMetaTag('property', 'og:site_name', 'RadioX');

    // Twitter
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', show.title);
    setMetaTag('name', 'twitter:description', descriptionText);
    setMetaTag('name', 'twitter:image', show.coverUrl);

    // Cleanup: Revert title when leaving view (optional, but good for SPA)
    return () => {
        document.title = originalTitle;
    };
  }, [show]);


  const safeIndex = displayedSegmentIndex >= 0 && displayedSegmentIndex < show.segments.length ? displayedSegmentIndex : 0;
  const displayedSegment = show.segments[safeIndex];
  const isPlayingThisShow = activeSegmentId === displayedSegment?.id;
  
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Scroll active line into view smoothly
  useEffect(() => {
      if (isPlayingThisShow && activeLineRef.current) {
          activeLineRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
          });
      }
  }, [currentTime, isPlayingThisShow]);

  const handleTranscriptClick = (relativeTimestamp: number) => {
      if (!isPlayingThisShow) {
          onPlay(safeIndex);
      }
      
      const audioEl = document.querySelector('audio');
      if (audioEl && displayedSegment.startTime !== undefined) {
          const absoluteTime = displayedSegment.startTime + relativeTimestamp;
          audioEl.currentTime = absoluteTime; 
          audioEl.play().catch(() => {});
      }
  };

  const handleOpenLink = (e: React.MouseEvent, url?: string) => {
      e.stopPropagation();
      if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
      }
  };

  // Helper to find avatar
  const getAvatarUrl = (speakerName: string) => {
      const found = speakers.find(s => s.name.toLowerCase() === speakerName.toLowerCase());
      return found?.avatarUrl;
  };

  // Helper to determine Layout & Theme based on Speaker
  // Memoized so it doesn't flicker on re-renders
  const speakerConfig = useMemo(() => {
      if (!displayedSegment?.transcript) return new Map();
      
      const uniqueSpeakers = Array.from(new Set(displayedSegment.transcript.map(l => l.speaker))) as string[];
      const config = new Map<string, { side: 'left' | 'right', theme: 'cyan' | 'pink' }>();

      uniqueSpeakers.forEach((name, index) => {
          const lower = name.toLowerCase();
          
          // GENDER / THEME DETECTION
          // Heuristic: Explicit names or keywords
          const isFemale = lower.includes('alexandra') || lower.includes('jessica') || lower.includes('sarah') || lower.includes('jane');
          const theme = isFemale ? 'pink' : 'cyan';

          // SIDE DETECTION
          // Alexandra (Host) -> Always Right
          // Declan (Host) -> Always Left
          // Others -> Alternate based on appearance order
          let side: 'left' | 'right' = index % 2 === 0 ? 'left' : 'right';
          
          if (lower.includes('alexandra')) side = 'right';
          else if (lower.includes('declan')) side = 'left';

          config.set(name, { side, theme });
      });

      return config;
  }, [displayedSegment?.id]);


  // Calculate Relative Time inside segment
  const relativeCurrentTime = isPlayingThisShow && displayedSegment.startTime !== undefined
      ? currentTime - displayedSegment.startTime
      : 0;

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
          <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col h-full pb-4 lg:pb-0 shrink-0 overflow-y-auto no-scrollbar lg:overflow-hidden order-2 lg:order-1 hidden lg:flex">
              
              {/* Show Header Info */}
              <div className="mb-6 px-1 w-full">
                  
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
                  <div className="hidden lg:flex flex-col items-center mb-6 w-full">
                      {/* LARGE COVER IMAGE - FULL WIDTH */}
                      <div 
                        className="relative w-full aspect-square mb-6 group cursor-pointer overflow-hidden rounded-3xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                        onClick={() => setIsLightboxOpen(true)}
                      >
                         <img 
                            src={show.coverUrl} 
                            alt={show.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                         />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg scale-150" />
                         </div>
                      </div>

                      <div className="text-center w-full px-4">
                          <h1 className="text-3xl font-bold text-white leading-tight mb-2">
                            {show.title}
                          </h1>
                          <p className="text-sm text-cyan-400 font-medium uppercase tracking-widest mb-4">{show.hosts}</p>
                      </div>
                  </div>

                  {/* ABOUT SECTION (Always Visible) */}
                  <div className="bg-[#111]/80 border border-white/5 rounded-2xl mb-6 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 text-gray-300 text-xs font-bold uppercase tracking-widest">
                           <Info size={14} className="text-cyan-500" /> 
                           About the Show
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">
                          {show.description || "No description available."}
                      </p>
                  </div>
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
                          // If there's a specific article image (different from generic show cover, or we trust apiService logic)
                          const hasThumbnail = !!segment.articleImageUrl;
                          
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
                                      <div 
                                          className="flex items-center gap-2 group/badge"
                                          onClick={(e) => hasLink && handleOpenLink(e, segment.sourceUrl)}
                                      >
                                          <div className={`p-1 rounded bg-white/5 ${isActivePlaying ? 'text-cyan-400' : 'text-gray-500'}`}>
                                            {isActivePlaying ? <BarChart3 size={12} className="animate-pulse"/> : <Newspaper size={12}/>}
                                          </div>
                                          <span className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[120px] ${hasLink ? 'text-cyan-200 group-hover/badge:text-cyan-400 group-hover/badge:underline decoration-cyan-500/50' : 'text-gray-400'}`}>
                                              {segment.sourceName || "Topic"}
                                          </span>
                                          {hasLink && <ExternalLink size={10} className="text-gray-600 group-hover/badge:text-cyan-400" />}
                                      </div>
                                      <div className="flex items-center gap-2">
                                         {segment.category && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 uppercase">
                                                {segment.category}
                                            </span>
                                         )}
                                      </div>
                                  </div>

                                  {/* CONTENT BODY: Title + Thumb */}
                                  <div className="flex gap-4">
                                      {/* Left: Text */}
                                      <div className="flex-1 min-w-0">
                                          {/* Title */}
                                          <h4 className={`text-sm font-bold leading-snug mb-2 ${isActivePlaying ? 'text-cyan-50' : 'text-gray-200 group-hover:text-white'}`}>
                                              {segment.title}
                                          </h4>

                                          {/* Summary - Only show if present */}
                                          {segment.articleDescription && segment.articleDescription.length > 0 && (
                                              <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-3">
                                                  {segment.articleDescription}
                                              </p>
                                          )}
                                      </div>

                                      {/* Right: Thumbnail */}
                                      {hasThumbnail && (
                                          <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10 mt-1">
                                              <img 
                                                src={segment.articleImageUrl} 
                                                alt="Article" 
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                              />
                                          </div>
                                      )}
                                  </div>

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

          {/* RIGHT: CHAT / TRANSCRIPT (Source: segments via apiService) */}
          <div className="flex-1 flex flex-col h-full relative min-w-0 pb-32 lg:pb-0 order-1 lg:order-2">
             
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
             <div className="flex-1 relative overflow-hidden rounded-3xl lg:border lg:border-white/5 bg-transparent lg:bg-[#0A0A0A]/50 lg:backdrop-blur-sm flex flex-col">
                 
                 {/* Transcript Header - Desktop Only */}
                 <div className="hidden lg:flex p-4 border-b border-white/5 items-center gap-2 sticky top-0 bg-[#0A0A0A]/90 z-10 backdrop-blur-md justify-between">
                     <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-cyan-500" />
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Conversation</span>
                     </div>
                     <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1">
                        <Play size={10} /> Click text to jump
                     </span>
                 </div>

                 {/* CHAT STREAM CONTAINER */}
                 <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth px-2 lg:px-8" ref={transcriptRef}>
                    <div className="flex flex-col gap-8 lg:gap-10 pb-[40vh] pt-4 lg:pt-8">
                        {displayedSegment.transcript && displayedSegment.transcript.length > 0 ? (
                             displayedSegment.transcript.map((line, idx) => {
                                 const avatarUrl = getAvatarUrl(line.speaker);
                                 
                                 // Determine if this line is active
                                 // We use relative time now (corrected in apiService)
                                 const nextLine = displayedSegment.transcript![idx + 1];
                                 const endTime = nextLine ? nextLine.timestamp : line.timestamp + 10;
                                 
                                 const isActive = isPlayingThisShow && relativeCurrentTime >= line.timestamp && relativeCurrentTime < endTime;
                                 
                                 // Style Configuration based on Speaker Map
                                 const conf = speakerConfig.get(line.speaker) || { side: 'left', theme: 'cyan' };
                                 const isRight = conf.side === 'right';
                                 const isPink = conf.theme === 'pink';

                                 // Dynamic Classes
                                 let containerClass = "opacity-40 scale-95 blur-[1px] grayscale";
                                 if (isActive) containerClass = "opacity-100 scale-100 blur-0 grayscale-0 z-10";
                                 if (!isPlayingThisShow) containerClass = "opacity-80 scale-100"; 

                                 // Directional Classes
                                 const directionClass = isRight ? "flex-row-reverse" : "flex-row";
                                 const bubbleRoundedClass = isRight ? "rounded-tr-none" : "rounded-tl-none";
                                 const alignClass = isRight ? "items-end" : "items-start";

                                 // Theme Colors
                                 const activeColor = isPink 
                                    ? "bg-fuchsia-900/30 border-fuchsia-500/40 text-white shadow-[0_0_20px_rgba(192,38,211,0.25)]" 
                                    : "bg-cyan-950/30 border-cyan-500/40 text-white shadow-[0_0_20px_rgba(8,145,178,0.25)]";
                                 
                                 const inactiveColor = "bg-[#111] border-white/5 text-gray-400";

                                 return (
                                    <div 
                                        key={idx} 
                                        ref={isActive ? activeLineRef : null}
                                        className={`
                                            flex gap-3 lg:gap-6 w-full max-w-4xl mx-auto transition-all duration-700 ease-out
                                            ${containerClass} ${directionClass}
                                            cursor-pointer group
                                        `}
                                        onClick={() => handleTranscriptClick(line.timestamp)}
                                    >
                                        {/* Avatar Column - HUGE ON DESKTOP */}
                                        <div className="shrink-0 flex flex-col">
                                            {avatarUrl ? (
                                                <div className={`
                                                    relative rounded-full p-0.5 transition-all duration-500
                                                    ${isActive ? (isPink ? 'bg-fuchsia-500 shadow-lg' : 'bg-cyan-500 shadow-lg') : 'bg-white/5'}
                                                `}>
                                                    <img 
                                                        src={avatarUrl} 
                                                        alt={line.speaker} 
                                                        className="w-10 h-10 lg:w-24 lg:h-24 rounded-full object-cover bg-gray-900"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={`
                                                    w-10 h-10 lg:w-24 lg:h-24 rounded-full flex items-center justify-center text-sm lg:text-3xl font-bold border-2 transition-all
                                                    ${isActive 
                                                        ? (isPink ? 'border-fuchsia-500 bg-fuchsia-900/50 text-fuchsia-200' : 'border-cyan-500 bg-cyan-900/50 text-cyan-200')
                                                        : 'border-white/10 bg-white/5 text-gray-500'}
                                                `}>
                                                    {line.speaker.charAt(0)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Chat Bubble Column */}
                                        <div className={`flex flex-col gap-2 pt-1 flex-1 min-w-0 ${alignClass}`}>
                                            
                                            {/* Name & Time Label */}
                                            <div className={`flex items-baseline gap-2 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-widest ${isActive ? (isPink ? 'text-fuchsia-400' : 'text-cyan-400') : 'text-gray-500'}`}>
                                                    {line.speaker}
                                                </span>
                                                <span className="text-[10px] text-gray-700 font-mono">
                                                    {Math.floor(line.timestamp / 60)}:{(Math.floor(line.timestamp) % 60).toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                            
                                            {/* Text Bubble */}
                                            <div className={`
                                                relative p-4 lg:p-6 rounded-3xl ${bubbleRoundedClass}
                                                transition-all duration-500
                                                border backdrop-blur-sm
                                                ${isActive ? activeColor : inactiveColor}
                                            `}>
                                                <p className="text-sm lg:text-xl leading-relaxed font-sans">
                                                    {line.text}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                 );
                             })
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