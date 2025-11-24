
import React, { useState, useRef, useEffect } from 'react';
import { ModernPlayer } from './components/ModernPlayer';
import { ShowCard } from './components/ShowCard';
import { ShowDetail } from './components/ShowDetail';
import { Show, Speaker } from './types';
import { Search, Loader2, RefreshCw, Radio, PlayCircle, Calendar, Clock, Sparkles } from 'lucide-react';
import { api } from './services/apiService';
import { MatrixBackground } from './components/MatrixBackground';

type ViewState = 'dashboard' | 'detail';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  
  // Data State
  const [shows, setShows] = useState<Show[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player State
  const [currentShow, setCurrentShow] = useState<Show | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Real Audio Logic
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastPlayedUrlRef = useRef<string | null>(null);
  
  // Helper to safely get current segment
  const currentSegment = currentShow?.segments?.[activeSegmentIndex];

  // Detail View State
  const [detailShow, setDetailShow] = useState<Show | null>(null);
  const hasSyncedInitialRouteRef = useRef(false);

  // Hero slider state (for the latest shows)
  const [heroIndex, setHeroIndex] = useState(0);

  // --- TIME & DATE HELPERS ---
  const getRelativeReleaseLabel = (show: Show) => {
    if (!show.createdAt) return '';
    const created = new Date(show.createdAt);
    if (isNaN(created.getTime())) return '';

    const diffMs = Date.now() - created.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'gerade eben veröffentlicht';
    if (diffMinutes < 60) {
      if (diffMinutes === 1) return 'vor 1 Minute veröffentlicht';
      return `vor ${diffMinutes} Minuten veröffentlicht`;
    }
    if (diffHours < 24) {
      if (diffHours === 1) return 'vor 1 Stunde veröffentlicht';
      return `vor ${diffHours} Stunden veröffentlicht`;
    }
    if (diffDays === 1) return 'vor 1 Tag veröffentlicht';
    return `vor ${diffDays} Tagen veröffentlicht`;
  };

  // --- SEO-FRIENDLY URL HELPERS ---
  const createShowSlug = (show: Show) => {
    // e.g. "Zürich - Night" + "24.11.2025" -> "zurich-night-24-11-2025"
    const base = `${show.title}-${show.date}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // remove accents

    return base
      .replace(/[^a-z0-9]+/g, '-') // non alphanumerics -> "-"
      .replace(/^-+|-+$/g, ''); // trim dashes
  };

  const parseShowRoute = (path: string) => {
    // Expected pattern: /shows/:slug/:id
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 3 && parts[0] === 'shows') {
      return {
        slug: parts[1],
        id: parts[2],
      };
    }
    return null;
  };

  const openShowDetailRoute = (show: Show) => {
    const slug = createShowSlug(show);
    const targetPath = `/shows/${slug}/${show.id}`;

    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }

    setDetailShow(show);
    setView('detail');

    // If the global player is not yet bound to a show, attach it to this one (paused)
    if (!currentShow) {
      setCurrentShow(show);
      setActiveSegmentIndex(0);
      setIsPlaying(false);
    }
  };

  const openDashboardRoute = () => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
    setView('dashboard');
    setDetailShow(null);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch Shows and Speakers in parallel
      const [showsData, speakersData] = await Promise.all([
          api.getShows(),
          api.getSpeakers()
      ]);
      
      if (showsData && showsData.length > 0) {
          // Filter out broken shows (no segments/audio) to ensure the UI looks good
          const validShows = showsData.filter(s => s.segments.length > 0);
          setShows(validShows);
      } else {
          setShows([]);
      }

      setSpeakers(speakersData || []);

    } catch (err: any) {
      console.error("API Error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Could not load shows due to an unknown error.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    loadData();
  }, []);

  // --- INITIAL ROUTE SYNC (DEEPLINK HANDLING) ---
  useEffect(() => {
    if (hasSyncedInitialRouteRef.current || isLoading) return;
    hasSyncedInitialRouteRef.current = true;

    if (typeof window === 'undefined') return;

    const route = parseShowRoute(window.location.pathname);
    if (!route) {
      return;
    }

    const sync = async () => {
      let targetShow = shows.find((s) => s.id === route.id) || null;
      if (!targetShow) {
        try {
          const fetched = await api.getShowById(route.id);
          targetShow = fetched;
        } catch {
          targetShow = null;
        }
      }

      if (targetShow) {
        setDetailShow(targetShow);
        setView('detail');
        if (!currentShow) {
          setCurrentShow(targetShow);
          setActiveSegmentIndex(0);
          setIsPlaying(false);
        }
      } else {
        // Fallback: go to dashboard if show id is unknown
        openDashboardRoute();
      }
    };

    sync();
  }, [isLoading, shows, currentShow]);

  // --- POPSTATE HANDLING (BACK/FORWARD BUTTONS) ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      const route = parseShowRoute(window.location.pathname);
      if (!route) {
        openDashboardRoute();
        return;
      }

      let targetShow = shows.find((s) => s.id === route.id) || null;

      const applyShow = (show: Show | null) => {
        if (!show) {
          openDashboardRoute();
          return;
        }
        setDetailShow(show);
        setView('detail');
        if (!currentShow) {
          setCurrentShow(show);
          setActiveSegmentIndex(0);
          setIsPlaying(false);
        }
      };

      if (targetShow) {
        applyShow(targetShow);
      } else {
        api.getShowById(route.id).then((fetched) => applyShow(fetched));
      }
    };

    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [shows, currentShow]);

  // --- HERO SLIDER AUTO-ADVANCE (TOP 3 SHOWS) ---
  const heroCount = Math.min(shows.length, 3);

  // Keep current slide index in range when show list changes
  useEffect(() => {
    if (heroCount === 0) {
      if (heroIndex !== 0) setHeroIndex(0);
      return;
    }
    if (heroIndex >= heroCount) {
      setHeroIndex(0);
    }
  }, [heroCount, heroIndex]);

  // Auto-rotate between the latest shows
  useEffect(() => {
    if (heroCount <= 1 || typeof window === 'undefined') return;

    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroCount);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [heroCount]);

  // --- AUDIO EFFECT LOGIC ---
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle Audio Source & Seeking for Chapters
  useEffect(() => {
    if (audioRef.current && currentSegment) {
        const source = currentSegment.audioUrl;
        const startTime = currentSegment.startTime || 0;

        if (source) {
            // Check if we are staying on the same file (Chapter Navigation)
            if (lastPlayedUrlRef.current === source) {
                // Just seek to the chapter start
                // Only seek if the current time is significantly different (to prevent loops)
                if (Math.abs(audioRef.current.currentTime - startTime) > 2) {
                     audioRef.current.currentTime = startTime;
                     setCurrentTime(startTime);
                }
            } else {
                // New File (New Show)
                audioRef.current.src = source;
                audioRef.current.currentTime = startTime;
                setCurrentTime(startTime);
                lastPlayedUrlRef.current = source;
            }
            
            if (isPlaying) {
                audioRef.current.play().catch(e => console.log("Playback failed:", e));
            }
        }
    }
  }, [currentSegment?.id, currentShow?.id]); 

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      // Auto-advance segment logic based on time
      // If we drift into the next segment's time window, update the UI
      if (currentShow && isPlaying) {
          const actualTime = audioRef.current.currentTime;
          // Find which segment we are actually in based on timestamp
          const correctSegmentIndex = currentShow.segments.findIndex(seg => {
             const start = seg.startTime || 0;
             const end = start + seg.duration;
             return actualTime >= start && actualTime < end;
          });

          // Only update if different and valid
          if (correctSegmentIndex !== -1 && correctSegmentIndex !== activeSegmentIndex) {
              setActiveSegmentIndex(correctSegmentIndex);
          }
      }
    }
  };

  const handleAudioEnded = () => {
    // For single file shows, 'ended' means the whole show is done
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveSegmentIndex(0);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  // --- UI HANDLERS ---

  const handleCardClick = (show: Show) => {
    openShowDetailRoute(show);
  };

  const handlePlayShow = (show: Show, segmentIndex = 0) => {
    if (!show.segments || show.segments.length === 0) {
        return;
    }

    if (currentShow && show.id === currentShow.id && segmentIndex === activeSegmentIndex) {
        setIsPlaying(!isPlaying);
        return;
    }

    setCurrentShow(show);
    setActiveSegmentIndex(segmentIndex);
    setIsPlaying(true);
  };

  const handleSegmentChange = (index: number) => {
    setActiveSegmentIndex(index);
    setIsPlaying(true); 
    
    // Explicitly seek if clicking next/prev
    // The useEffect will handle the seek, but we ensure state is set first
    const targetSegment = currentShow?.segments[index];
    if (targetSegment && audioRef.current) {
        audioRef.current.currentTime = targetSegment.startTime || 0;
    }
  };

  const handleBackToDashboard = () => {
    openDashboardRoute();
  };
  
  const handlePlayerDetailsClick = () => {
      if (currentShow) {
          openShowDetailRoute(currentShow);
      }
  };

  // --- SHOW SPLITTING FOR LAYOUT & HERO SLIDER ---
  const heroShows = shows.slice(0, heroCount);
  const heroShow =
    heroShows.length > 0 ? heroShows[Math.min(heroIndex, heroShows.length - 1)] : null;

  // After the top 3 (slider), show the next 2 as "Just In", rest goes to Archive
  const recentShows = shows.length > heroCount ? shows.slice(heroCount, heroCount + 2) : [];
  const archiveStartIndex = heroCount + recentShows.length;
  const archiveShows = shows.length > archiveStartIndex ? shows.slice(archiveStartIndex) : [];

  // --- LOADING SCREEN ---
  if (isLoading && shows.length === 0) {
    return (
        <div className="h-[100dvh] w-full bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden">
            <MatrixBackground />
            <div className="z-10 flex flex-col items-center gap-6">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <div className="flex flex-col items-center gap-1">
                    <h2 className="text-xl font-bold tracking-widest uppercase">RadioX Cloud</h2>
                    <p className="text-xs text-gray-500 font-mono">Loading Latest Shows...</p>
                </div>
            </div>
        </div>
    );
  }

  // --- ERROR STATE ---
  if (error) {
      return (
        <div className="h-[100dvh] w-full bg-[#050505] text-white flex flex-col items-center justify-center relative">
            <MatrixBackground />
            <div className="z-10 flex flex-col items-center gap-4 max-w-md text-center px-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                    <Radio className="text-red-500 w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold">Connection Error</h2>
                <div className="bg-white/5 p-4 rounded-lg w-full overflow-hidden">
                    <p className="text-red-400 font-mono text-xs break-all">{error}</p>
                </div>
                <button 
                    onClick={loadData}
                    className="mt-4 px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                    <RefreshCw size={16} /> Retry
                </button>
            </div>
        </div>
      )
  }

  return (
    <div className="h-[100dvh] w-full bg-[#050505] text-white selection:bg-cyan-500/30 flex flex-col overflow-hidden">
      
      {/* HIDDEN AUDIO ELEMENT */}
      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />

      {/* FIXED HEADER */}
      <header className="shrink-0 z-40 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-6 max-w-[1920px] mx-auto">
          
          <div 
            className="flex items-center gap-12 cursor-pointer" 
            onClick={handleBackToDashboard}
          >
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Radio<span className="text-cyan-400">X</span>
              </h1>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={handleBackToDashboard} className={`text-sm font-medium transition-colors ${view === 'dashboard' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>Discover</button>
              <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Library</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
              <Search size={20} />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-900 to-blue-900 flex items-center justify-center text-[10px] font-bold text-cyan-100 border border-white/10">
               RX
            </div>
          </div>
        </div>
      </header>

      {/* SCROLLABLE MAIN CONTENT AREA */}
      {/* Added min-h-0 to fix overflow issues in flex containers */}
      <main className="flex-1 overflow-y-auto min-h-0 no-scrollbar relative w-full pb-32">
        
        {view === 'dashboard' && (
          <div className="max-w-[1920px] mx-auto pb-20">
            
            {heroShow ? (
              <>
                {/* --- 1. HERO SLIDER (Latest 3 Shows) --- */}
                <div className="relative w-full aspect-[4/3] md:aspect-[21/9] lg:max-h-[60vh] overflow-hidden">
                  {heroShows.map((show, index) => {
                    const isActive = index === heroIndex;
                    return (
                      <div
                        key={show.id}
                        className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
                          isActive ? 'opacity-100 z-20' : 'opacity-0 z-10 pointer-events-none'
                        }`}
                      >
                        <div className="relative w-full h-full group">
                          <img
                            src={show.coverUrl}
                            alt={show.title}
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2000ms]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent" />

                          <div className="absolute bottom-0 left-0 p-6 md:p-12 lg:p-16 w-full md:w-2/3 lg:w-1/2 flex flex-col items-start gap-4">
                            <span className="flex items-center gap-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                              <Sparkles size={12} /> {index === 0 ? 'Premiering Now' : 'Latest Show'}
                            </span>

                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-none shadow-black drop-shadow-lg">
                              {show.title}
                            </h1>

                            <div className="flex flex-col gap-1 text-gray-300 text-sm md:text-base font-medium">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-2">
                                  <Calendar size={16} /> {show.date}
                                </span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                <span>{show.hosts}</span>
                              </div>
                              <span className="text-xs md:text-sm text-gray-400">
                                {getRelativeReleaseLabel(show)}
                              </span>
                            </div>

                            <p className="text-gray-400 text-sm md:text-lg line-clamp-2 md:line-clamp-3 max-w-xl">
                              {show.description}
                            </p>

                            <div className="flex items-center gap-4 mt-4">
                              <button
                                onClick={() => handlePlayShow(show)}
                                className="bg-cyan-400 hover:bg-cyan-300 text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                              >
                                <PlayCircle size={20} fill="black" />
                                Listen Now
                              </button>
                              <button
                                onClick={() => handleCardClick(show)}
                                className="bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white px-8 py-3 rounded-full font-bold transition-all"
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Slider Controls */}
                  {heroShows.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setHeroIndex((prev) =>
                            heroShows.length ? (prev - 1 + heroShows.length) % heroShows.length : 0
                          )
                        }
                        className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10 backdrop-blur-md"
                        aria-label="Previous show"
                      >
                        <span aria-hidden="true" className="text-lg leading-none">
                          ‹
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHeroIndex((prev) =>
                            heroShows.length ? (prev + 1) % heroShows.length : 0
                          )
                        }
                        className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10 backdrop-blur-md"
                        aria-label="Next show"
                      >
                        <span aria-hidden="true" className="text-lg leading-none">
                          ›
                        </span>
                      </button>

                      <div className="absolute inset-x-0 bottom-4 md:bottom-6 flex items-center justify-center gap-2 z-30">
                        {heroShows.map((show, index) => (
                          <button
                            key={`${show.id}-${index}`}
                            type="button"
                            onClick={() => setHeroIndex(index)}
                            className={`h-1.5 rounded-full transition-all ${
                              index === heroIndex
                                ? 'w-8 bg-white'
                                : 'w-3 bg-white/40 hover:bg-white/80'
                            }`}
                            aria-label={`Show ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* --- 2. JUST IN (Shows 2 & 3) --- */}
                {recentShows.length > 0 && (
                  <div className="px-6 md:px-12 mt-12">
                     <div className="flex items-center gap-2 mb-6">
                        <Clock className="text-cyan-400" size={20} />
                        <h3 className="text-xl font-bold text-white uppercase tracking-widest">Just In</h3>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {recentShows.map((show) => (
                          <div 
                             key={show.id}
                             className="bg-[#111] border border-white/5 rounded-2xl p-4 flex gap-4 hover:border-white/10 transition-all cursor-pointer group"
                             onClick={() => handleCardClick(show)}
                          >
                             <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden shrink-0 relative">
                                <img src={show.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold">
                                   {show.date}
                                </div>
                             </div>
                             <div className="flex flex-col justify-center min-w-0">
                                <h4 className="text-lg font-bold text-white leading-tight mb-1 truncate group-hover:text-cyan-300 transition-colors">{show.title}</h4>
                                <p className="text-sm text-cyan-500 font-medium mb-2">{show.hosts}</p>
                                <p className="text-xs text-gray-500 line-clamp-2">{show.description}</p>
                                <button 
                                   onClick={(e) => { e.stopPropagation(); handlePlayShow(show); }}
                                   className="mt-3 flex items-center gap-2 text-xs font-bold text-white bg-white/10 w-fit px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors"
                                >
                                   <PlayCircle size={14} /> Play Episode
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                )}

                {/* --- 3. ARCHIVE (The rest) --- */}
                {archiveShows.length > 0 && (
                  <div className="px-6 md:px-12 mt-16">
                     <div className="flex items-center gap-4 mb-8">
                        <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest">Archive</h3>
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                     </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                      {archiveShows.map((show) => (
                          <ShowCard 
                          key={show.id} 
                          data={show} 
                          isActive={currentShow?.id === show.id}
                          onClick={() => handleCardClick(show)}
                          />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
                <div className="flex flex-col items-center justify-center py-40 text-gray-500">
                    <p>No shows found currently.</p>
                </div>
            )}
          </div>
        )}

        {view === 'detail' && detailShow && (
          <div className="pb-20">
             <ShowDetail 
                show={detailShow} 
                activeSegmentId={currentShow?.id === detailShow.id && currentSegment ? currentSegment.id : null}
                onBack={handleBackToDashboard}
                onPlay={(segmentIndex) => handlePlayShow(detailShow, segmentIndex)}
                speakers={speakers}
                currentTime={currentTime}
            />
          </div>
        )}

      </main>

      {/* Global Player - Fixed at Bottom */}
      {currentShow && (
          <ModernPlayer 
            show={currentShow} 
            activeSegmentIndex={activeSegmentIndex}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onSegmentChange={handleSegmentChange}
            currentTime={currentTime} // Now reflects absolute time in audio file
            onSeek={handleSeek}
            onShowDetails={handlePlayerDetailsClick}
          />
      )}
    </div>
  );
};

export default App;
