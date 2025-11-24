
import React, { useEffect, useState, useMemo } from 'react';
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

  // Release time information (for header)
  const createdAtDate = show.createdAt ? new Date(show.createdAt) : null;
  const hasValidCreatedAt = createdAtDate !== null && !isNaN(createdAtDate.getTime());

  const releaseTimeLabel =
    hasValidCreatedAt
      ? createdAtDate!.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  let relativeReleaseLabel = '';
  if (hasValidCreatedAt) {
    const diffMs = Date.now() - createdAtDate!.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      relativeReleaseLabel = 'gerade eben veröffentlicht';
    } else if (diffMinutes < 60) {
      relativeReleaseLabel =
        diffMinutes === 1 ? 'vor 1 Minute veröffentlicht' : `vor ${diffMinutes} Minuten veröffentlicht`;
    } else if (diffHours < 24) {
      relativeReleaseLabel =
        diffHours === 1 ? 'vor 1 Stunde veröffentlicht' : `vor ${diffHours} Stunden veröffentlicht`;
    } else if (diffDays === 1) {
      relativeReleaseLabel = 'vor 1 Tag veröffentlicht';
    } else {
      relativeReleaseLabel = `vor ${diffDays} Tagen veröffentlicht`;
    }
  }
  
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


  // Calculate Relative Time inside segment (purely based on timeline)
  const relativeCurrentTime =
    isPlayingThisShow && displayedSegment.startTime !== undefined
      ? Math.max(0, currentTime - displayedSegment.startTime)
      : 0;

  if (!displayedSegment) return null;

  const transcript = displayedSegment.transcript || [];

  // Determine active transcript line based on current playback time
  let activeLineIndex = 0;
  if (transcript.length > 0) {
    if (!isPlayingThisShow) {
      activeLineIndex = 0;
    } else {
      let idx = transcript.findIndex((line, idx) => {
        const nextLine = transcript[idx + 1];
        const endTime = nextLine ? nextLine.timestamp : line.timestamp + 10;
        return relativeCurrentTime >= line.timestamp && relativeCurrentTime < endTime;
      });
      if (idx === -1) {
        // If we're beyond the last known timestamp, pin to the last line
        if (relativeCurrentTime >= transcript[transcript.length - 1].timestamp) {
          idx = transcript.length - 1;
        } else {
          idx = 0;
        }
      }
      activeLineIndex = idx;
    }
  }

  // For teleprompter view we show at most 3 lines: previous, current, next
  const visibleLineIndices =
    transcript.length > 0
      ? Array.from(
          new Set([
            Math.max(activeLineIndex - 1, 0),
            activeLineIndex,
            Math.min(activeLineIndex + 1, transcript.length - 1),
          ]),
        )
      : [];

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
              
              {/* Show Header Info + About combined into a single card */}
              <div className="mb-6 px-1 w-full">
                  
                  {/* MOBILE VIEW */}
                  <div className="flex lg:hidden items-center gap-5 mb-4">
                      <img 
                        src={show.coverUrl} 
                        alt="Cover" 
                        onClick={() => setIsLightboxOpen(true)}
                        className="w-20 h-20 rounded-2xl object-cover shadow-2xl border border-white/10" 
                      />
                      <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                              {show.date}
                              {releaseTimeLabel && ` · ${releaseTimeLabel}`}
                          </span>
                          <h1 className="text-xl font-bold text-white leading-none mb-1">{show.title}</h1>
                          <p className="text-xs text-cyan-400">{show.hosts}</p>
                          {relativeReleaseLabel && (
                            <span className="text-[11px] text-gray-500 mt-1">
                              {relativeReleaseLabel}
                            </span>
                          )}
                      </div>
                  </div>

                  {/* DESKTOP VIEW: Unified header card with cover + about text */}
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

                      <div className="w-full px-4">
                          <div className="bg-[#111]/80 border border-white/5 rounded-2xl p-5 shadow-sm">
                              <div className="flex flex-col gap-2 text-center">
                                  <h1 className="text-3xl font-bold text-white leading-tight">
                                    {show.title}
                                  </h1>
                                  <p className="text-sm text-cyan-400 font-medium uppercase tracking-widest">
                                    {show.hosts}
                                  </p>
                                  <p className="text-xs text-gray-400 font-mono">
                                    {show.date}
                                    {releaseTimeLabel && ` · ${releaseTimeLabel}`}
                                  </p>
                                  {relativeReleaseLabel && (
                                    <p className="text-xs text-gray-500 mb-1">
                                      {relativeReleaseLabel}
                                    </p>
                                  )}

                                  <div className="mt-3 text-left md:text-center">
                                      <div className="flex items-center gap-2 mb-2 justify-center text-gray-300 text-[11px] font-bold uppercase tracking-widest">
                                           <Info size={14} className="text-cyan-500" /> 
                                           About the Show
                                      </div>
                                      <p className="text-sm text-gray-400 leading-relaxed max-w-2xl mx-auto">
                                          {show.description || "No description available."}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
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

                          // Treat first/last segments without article link as intro/outro meta segments
                          const isIntroSegment = idx === 0 && !hasLink;
                          const isOutroSegment = idx === show.segments.length - 1 && !hasLink && show.segments.length > 1;
                          const isMetaSegment = isIntroSegment || isOutroSegment;

                          const publishedAt = segment.sourcePublishedAt ? new Date(segment.sourcePublishedAt) : null;
                          const publishedDateTimeLabel =
                            publishedAt && !isNaN(publishedAt.getTime())
                              ? `${publishedAt.toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })} · ${publishedAt.toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`
                              : null;

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
                                    w-full group relative flex flex-col gap-2 p-4 rounded-xl cursor-pointer transition-all border
                                    ${isMetaSegment ? 'min-h-[80px]' : 'min-h-[110px] md:min-h-[130px]'}
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
                                              {isIntroSegment ? 'Intro' : isOutroSegment ? 'Outro' : (segment.sourceName || "Topic")}
                                          </span>
                                          {hasLink && <ExternalLink size={10} className="text-gray-600 group-hover/badge:text-cyan-400" />}
                                          {publishedDateTimeLabel && (
                                            <span className="text-[10px] text-gray-500 ml-2">
                                              {publishedDateTimeLabel}
                                            </span>
                                          )}
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
                                          {/* Show Topic as main title (clickable if article link exists) */}
                                          <button
                                            type="button"
                                            disabled={!hasLink}
                                            onClick={(e) => hasLink && handleOpenLink(e as any, segment.sourceUrl)}
                                            className={`text-left w-full ${isMetaSegment ? 'text-xs' : 'text-sm'} font-bold leading-snug mb-1 transition-colors ${
                                              hasLink
                                                ? isActivePlaying
                                                  ? 'text-cyan-50 hover:text-cyan-300'
                                                  : 'text-gray-200 group-hover:text-white hover:text-cyan-200'
                                                : isActivePlaying
                                                  ? 'text-cyan-50'
                                                  : 'text-gray-200'
                                            }`}
                                          >
                                            {isIntroSegment ? 'Intro' : isOutroSegment ? 'Outro' : segment.title}
                                          </button>

                                          {/* Summary - Only show if present */}
                                          {segment.articleDescription && segment.articleDescription.length > 0 && (
                                              <p className={`text-xs text-gray-500 line-clamp-3 leading-relaxed ${isMetaSegment ? 'opacity-70' : ''}`}>
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
                       <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Show Script</span>
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1">
                       <Play size={10} /> Läuft automatisch mit der Show
                    </span>
                </div>

                {/* SHOW SCRIPT VIEW (Teleprompter-style) */}
                <div className="flex-1 px-4 lg:px-10 flex items-center justify-center">
                    {transcript.length > 0 ? (
                        <div className="w-full max-w-4xl h-[150px] md:h-[180px] lg:h-[210px] flex items-center justify-center">
                            <div className="w-full flex flex-col items-stretch justify-center gap-2.5 lg:gap-3">
                              {visibleLineIndices.map((lineIndex) => {
                              const line = transcript[lineIndex];
                              const conf = speakerConfig.get(line.speaker) || {
                                side: 'left',
                                theme: 'cyan',
                              };
                              const isRight = conf.side === 'right';
                              const isCenter = lineIndex === activeLineIndex;
                              const isAbove = lineIndex < activeLineIndex;
                              const isPink = conf.theme === 'pink';

                              const opacityClass = isCenter ? 'opacity-100' : 'opacity-35';
                              const scaleClass = isCenter ? 'scale-100' : 'scale-95';
                              const translateClass = isCenter
                                ? 'translate-y-0'
                                : isAbove
                                  ? '-translate-y-1'
                                  : 'translate-y-1';

                              const accentColor = isPink ? 'text-fuchsia-400' : 'text-cyan-400';

                              const avatarUrl = getAvatarUrl(line.speaker);

                              const directionClass = isRight ? 'flex-row-reverse text-right' : 'flex-row text-left';
                              const alignMetaClass = isRight ? 'justify-end' : 'justify-start';

                              return (
                                <button
                                  key={lineIndex}
                                  type="button"
                                  onClick={() => handleTranscriptClick(line.timestamp)}
                                  className={`group flex ${directionClass} items-center gap-3 lg:gap-5 transition-all duration-700 ease-out ${opacityClass} ${scaleClass} ${translateClass}`}
                                >
                                  {/* Small Avatar / Speaker Icon */}
                                  <div className="shrink-0 flex flex-col">
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={line.speaker}
                                        className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full object-cover border ${
                                          isCenter
                                            ? 'border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)]'
                                            : 'border-white/10'
                                        }`}
                                      />
                                    ) : (
                                      <div
                                        className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center text-sm lg:text-2xl font-bold border ${
                                          isCenter
                                            ? 'border-cyan-400 bg-cyan-900/40 text-cyan-100'
                                            : 'border-white/10 bg-white/5 text-gray-400'
                                        }`}
                                      >
                                        {line.speaker.charAt(0)}
                                      </div>
                                    )}
                                  </div>

                                  {/* Text Column */}
                                  <div className={`flex-1 min-w-0 flex flex-col gap-2 ${alignMetaClass}`}>
                                    <div
                                      className={`flex items-baseline gap-2 ${
                                        isRight ? 'flex-row-reverse' : 'flex-row'
                                      }`}
                                    >
                                      <span
                                        className={`text-[10px] lg:text-xs font-bold uppercase tracking-widest ${accentColor}`}
                                      >
                                        {line.speaker}
                                      </span>
                                      <span className="text-[10px] text-gray-600 font-mono">
                                        {Math.floor(line.timestamp / 60)}:
                                        {(Math.floor(line.timestamp) % 60).toString().padStart(2, '0')}
                                      </span>
                                    </div>
                                    <p
                                      className={`text-base lg:text-2xl leading-relaxed font-sans transition-colors duration-500 ${
                                        isCenter ? 'text-white' : 'text-gray-400'
                                      }`}
                                    >
                                      {line.text}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                            </div>
                        </div>
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
  );
}