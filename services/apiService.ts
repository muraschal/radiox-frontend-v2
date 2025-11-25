
import { createClient } from '@supabase/supabase-js';
import { Show, Segment, TranscriptLine, Speaker } from '../types';

// Safely access env vars or fallbacks
const getEnv = (key: string, fallback: string) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
       // @ts-ignore
       return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  return fallback;
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://zwcvvbgkqhexfcldwuxq.supabase.co');
const SUPABASE_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3Y3Z2YmdrcWhleGZjbGR3dXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3Nzc4NDgsImV4cCI6MjA2NDM1Mzg0OH0.6T3hBRqn8tKQQKEnxEEG7p7NfjkytDKW1uCGqcBg-yU');

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * PARSES THE RAW TRANSCRIPT (Legacy Helper)
 */
const parseRawTranscriptLegacy = (segmentsJson: any): TranscriptLine[] => {
  if (!segmentsJson) return [];
  try {
    let rawSegments: any[] = [];
    if (Array.isArray(segmentsJson)) {
      rawSegments = segmentsJson;
    } else if (typeof segmentsJson === 'object' && segmentsJson !== null) {
       // Try to find a flat list in a structured object if possible
       if (Array.isArray(segmentsJson.segments)) return []; // Should be handled by new parser
    }
    return rawSegments.map((seg: any) => ({
      speaker: seg.speaker || 'Unknown',
      text: seg.display_text || seg.text || '',
      timestamp: Number(seg.start_time || 0) // Absolute Time
    })).filter(t => t.text && t.text.trim().length > 0);
  } catch (error) {
    return [];
  }
};

const getProperty = (obj: any, keys: string[]): any => {
    if (!obj) return null;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
    }
    return null;
};

const mapShowToShowWithSegments = (row: any): Show => {
  // 1. BASIC METADATA
  const id = row.id?.toString() || `show-${Math.random()}`;
  const title = getProperty(row, ['title', 'show_name', 'name']) || "Untitled Show";

  // Use created_at (or date) as canonical release timestamp
  const createdAtSource = getProperty(row, ['created_at', 'date']) || new Date().toISOString();
  const createdAtDate = new Date(createdAtSource);
  const createdAt = createdAtDate.toISOString();

  // Human-readable local date (for quick label usage)
  const date = createdAtDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const coverUrl = getProperty(row, ['cover_url', 'image_url', 'thumbnail']) || "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800&auto=format&fit=crop&q=60";
  const audioUrl = getProperty(row, ['audio_url', 'file_url', 'url']);
  
  // HOSTS
  let hosts = "RadioX Host";
  const rawSpeakers = getProperty(row, ['speakers', 'hosts']);
  const metaSpeakers = row.metadata?.speakers;
  const finalSpeakers = rawSpeakers || metaSpeakers;
  if (Array.isArray(finalSpeakers) && finalSpeakers.length > 0) {
      hosts = finalSpeakers.join(' & ');
  } else if (typeof finalSpeakers === 'string') {
      hosts = finalSpeakers;
  }

  // DESCRIPTION (Prioritize SEO Description from Metadata)
  // We check row.metadata.seo_description first, then a flat seo_description column, then others.
  const description = row.metadata?.seo_description || 
                      getProperty(row, ['seo_description', 'description', 'summary', 'script_preview']) || 
                      "No description available.";

  // TAGS / FILTER METADATA (e.g. show key, categories)
  const tags: string[] = [];
  const showKey = row.metadata?.show_name || row.show_name || title;
  if (showKey) tags.push(String(showKey));
  const metaCategories = row.metadata?.categories;
  if (Array.isArray(metaCategories)) {
      metaCategories.forEach((c: any) => {
          if (c) tags.push(String(c));
      });
  }

  // 0. PREPARE IMAGE LOOKUP MAP (From used_news/raw metadata)
  // Structured segments often miss images, so we look them up from the raw input data
  const articleImages: Record<string, string> = {};
  const rawNewsData = getProperty(row, ['used_news', 'news', 'chapters']);
  let parsedNewsItems: any[] = [];
  
  if (Array.isArray(rawNewsData)) {
      parsedNewsItems = rawNewsData;
  } else if (typeof rawNewsData === 'string' && rawNewsData.trim()) {
      try {
         const parsed = JSON.parse(rawNewsData);
         if (Array.isArray(parsed)) parsedNewsItems = parsed;
         else if (parsed.news && Array.isArray(parsed.news)) parsedNewsItems = parsed.news;
         else if (parsed.chapters && Array.isArray(parsed.chapters)) parsedNewsItems = parsed.chapters;
      } catch(e) {}
  } else if (typeof rawNewsData === 'object' && rawNewsData !== null) {
      if (Array.isArray(rawNewsData.news)) parsedNewsItems = rawNewsData.news;
  }

  // Populate map
  parsedNewsItems.forEach(item => {
      const img = getProperty(item, ['image_url', 'image', 'thumbnail', 'url_to_image']);
      if (img) {
          const id = item.id || item.content_item_id;
          const url = getProperty(item, ['url', 'link', 'article_url']);
          if (id) articleImages[id] = img;
          if (url) articleImages[url] = img;
      }
  });


  // 2. SEGMENT & TRANSCRIPT PARSING
  let finalSegments: Segment[] = [];

  // Total audio duration (used for proper timing or as fallback when timestamps are missing)
  const rawDuration = getProperty(row, ['audio_duration_seconds', 'duration', 'metadata.total_duration_seconds']);
  const totalAudioDuration = rawDuration ? Number(rawDuration) : 0;
  
  // Parse 'segments' column if it is a JSON string
  let segmentsData = row.segments;
  if (typeof segmentsData === 'string') {
      try { segmentsData = JSON.parse(segmentsData); } catch (e) {}
  }

  // ---------------------------------------------------------
  // FORMAT A: STRUCTURED SHOW (New Supabase Format)
  // Check if it matches { segments: [{ topic, speaker_lines... }], metadata: ... }
  // ---------------------------------------------------------
  if (segmentsData && typeof segmentsData === 'object' && Array.isArray(segmentsData.segments)) {
      
      const segmentCount = segmentsData.segments.length || 1;
      
      finalSegments = segmentsData.segments.map((seg: any, index: number) => {
          // A. Speaker Lines (Transcript)
          const lines = Array.isArray(seg.speaker_lines) ? seg.speaker_lines : [];
          
          // B. Timing Calculation
          // Prefer real timestamps if present. If everything is null (current V3 shows),
          // synthesize a reasonable timeline based on totalAudioDuration and text length
          const hasStructuredTimestamps =
            (typeof seg.timestamp_start === 'number' && !isNaN(seg.timestamp_start)) ||
            (typeof seg.timestamp_end === 'number' && !isNaN(seg.timestamp_end)) ||
            lines.some((l: any) => typeof l.timestamp_start === 'number' && !isNaN(l.timestamp_start));

          let absStart = 0;
          let absEnd = 0;
          let duration = 0;

          if (hasStructuredTimestamps) {
              // Use absolute timestamps as provided by backend
              const firstLine = lines[0];
              const lastLine = lines[lines.length - 1];
              
              const startCandidate = typeof seg.timestamp_start === 'number'
                ? seg.timestamp_start
                : (firstLine && typeof firstLine.timestamp_start === 'number' ? firstLine.timestamp_start : 0);

              const endCandidate = typeof seg.timestamp_end === 'number'
                ? seg.timestamp_end
                : (lastLine && typeof lastLine.timestamp_end === 'number' ? lastLine.timestamp_end : startCandidate);

              absStart = Number(startCandidate) || 0;
              absEnd = Number(endCandidate) || absStart;
              duration = Math.max(0, absEnd - absStart);
          } else {
              // Fallback: distribute show duration evenly across segments
              const safeSegmentDuration =
                totalAudioDuration > 0 && segmentCount > 0
                  ? totalAudioDuration / segmentCount
                  : 60; // 60s per segment as hard fallback
              
              duration = safeSegmentDuration;
              absStart = index * safeSegmentDuration;
              absEnd = absStart + safeSegmentDuration;
          }

          // C. Transcript Normalization (Absolute -> Relative)
          // UI expects timestamps relative to the segment start (0...duration)
          const perLineDuration = lines.length > 0 ? duration / lines.length : duration;
          const transcript: TranscriptLine[] = lines.map((l: any, lineIndex: number) => {
              const baseTimestamp = hasStructuredTimestamps
                ? Math.max(0, Number(l.timestamp_start || 0) - absStart)
                : lineIndex * perLineDuration;
              
              return {
                speaker: l.speaker || 'Unknown',
                text: l.text || '',
                timestamp: baseTimestamp
              };
          });

          // D. Source Extraction & Image Lookup
          let sourceUrl = undefined;
          let sourceName = undefined;
          let articleTitle = undefined;
          let sourcePublishedAt = undefined;
          let articleImageUrl = getProperty(seg, ['image_url', 'image', 'thumbnail']);

          if (Array.isArray(seg.sources)) {
              // Flatten sources if it's an array of strings
              const sources = seg.sources;

              // Prefer the first structured source object (for metadata)
              const primarySource = sources.find((s: any) => s && typeof s === 'object');

              // Find first valid URL on any source entry
              const urlItem = sources.find((s: any) => {
                  if (typeof s === 'string' && s.startsWith('http')) return true;
                  if (s && typeof s === 'object') {
                      if (typeof s.url === 'string' && s.url.startsWith('http')) return true;
                      if (typeof s.link === 'string' && s.link.startsWith('http')) return true;
                      if (typeof s.article_url === 'string' && s.article_url.startsWith('http')) return true;
                      if (typeof s.web_link === 'string' && s.web_link.startsWith('http')) return true;
                      if (typeof s.content_item_id === 'string' && s.content_item_id.startsWith('http')) return true;
                  }
                  return false;
              });

              if (urlItem) {
                   if (typeof urlItem === 'string') sourceUrl = urlItem;
                   else sourceUrl = urlItem.url || urlItem.link || urlItem.article_url || urlItem.web_link || urlItem.content_item_id;
              }

              // Extract Source Name & Additional Metadata
              if (primarySource && typeof primarySource === 'object') {
                  articleTitle = getProperty(primarySource, ['title', 'headline']);
                  sourcePublishedAt = getProperty(primarySource, ['published_at', 'date']);
                  if (!sourceName) {
                      sourceName = getProperty(primarySource, ['source_name', 'source', 'publisher', 'outlet']);
                  }
                  // Fallback: derive URL from primarySource if we haven't found one yet
                  if (!sourceUrl) {
                      const candidateUrl = getProperty(primarySource, ['url', 'link', 'article_url', 'web_link', 'content_item_id']);
                      if (typeof candidateUrl === 'string' && candidateUrl.startsWith('http')) {
                          sourceUrl = candidateUrl;
                      }
                  }
              }

              if (sourceUrl && !sourceName) {
                  try {
                      const u = new URL(sourceUrl);
                      sourceName = u.hostname.replace('www.', '').split('.')[0];
                      sourceName = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
                  } catch (e) { sourceName = 'Source'; }
              }

              // Try to find image from sources if not already on segment
              if (!articleImageUrl) {
                  for (const s of sources) {
                      const id = typeof s === 'string' ? s : (s.content_item_id || s.id);
                      if (id && articleImages[id]) {
                          articleImageUrl = articleImages[id];
                          break;
                      }
                  }
              }
          }

          // Fallback: If no image found, check if sourceUrl matches anything in our image map
          if (!articleImageUrl && sourceUrl && articleImages[sourceUrl]) {
              articleImageUrl = articleImages[sourceUrl];
          }

          return {
              id: `${id}-seg-${index}`,
              title: seg.topic || `Segment ${index + 1}`,
              category: seg.category || 'Topic',
              duration: duration,
              startTime: absStart,
              sourceUrl,
              sourceName: sourceName || 'Topic',
              articleDescription: "", // Structured segments v1 usually don't have summaries per segment yet
              articleTitle,
              sourcePublishedAt,
              articleImageUrl: articleImageUrl, 
              transcript,
              audioUrl
          };
      });

  } 
  // ---------------------------------------------------------
  // FORMAT B: LEGACY (used_news + raw transcript list)
  // ---------------------------------------------------------
  else {
      // 1. Get Full Absolute Transcript
      const fullTranscript = parseRawTranscriptLegacy(segmentsData);
      
      // Use the already parsed news items from Step 0
      const newsItems = parsedNewsItems;

      if (newsItems.length > 0) {
          // Sort news by timestamp
          const sortedNews = [...newsItems].sort((a, b) => {
              const tA = parseFloat(getProperty(a, ['audio_timestamp', 'start', 'timestamp']) || "0");
              const tB = parseFloat(getProperty(b, ['audio_timestamp', 'start', 'timestamp']) || "0");
              return tA - tB;
          });

          finalSegments = sortedNews.map((news: any, index: number) => {
              const startTime = parseFloat(getProperty(news, ['audio_timestamp', 'start_time', 'start', 'timestamp']) || "0");
              
              // Determine Duration
              let duration = parseFloat(getProperty(news, ['duration', 'length']) || "0");
              if (duration === 0) {
                 const nextChapter = sortedNews[index + 1];
                 if (nextChapter) {
                     const nextStart = parseFloat(getProperty(nextChapter, ['audio_timestamp', 'start_time', 'start', 'timestamp']) || "0");
                     duration = Math.max(0, nextStart - startTime);
                 } else {
                     const totalAudioDuration = parseFloat(getProperty(row, ['audio_duration_seconds', 'duration']) || "0");
                     duration = Math.max(0, totalAudioDuration - startTime);
                 }
                 if (duration === 0) duration = 300; // Default fallback
              }
              const endTime = startTime + duration;

              // Filter & Normalize Transcript
              const chapterTranscript = fullTranscript
                  .filter(t => t.timestamp >= startTime && t.timestamp < endTime)
                  .map(t => ({
                      ...t,
                      timestamp: t.timestamp - startTime // NORMALIZE TO RELATIVE
                  }));

              return {
                  id: `${id}-topic-${index}`,
                  title: getProperty(news, ['title', 'headline']) || `Topic ${index + 1}`,
                  category: getProperty(news, ['category', 'topic']) || "News",
                  duration: duration,
                  startTime: startTime,
                  sourceUrl: getProperty(news, ['link', 'url', 'article_url', 'web_link']),
                  sourceName: getProperty(news, ['source', 'publisher', 'outlet']) || "Source",
              articleDescription: getProperty(news, ['summary', 'description', 'content']),
              articleTitle: getProperty(news, ['title', 'headline']),
              sourcePublishedAt: getProperty(news, ['published_at', 'date']),
                  articleImageUrl: getProperty(news, ['image_url', 'image', 'thumbnail', 'url_to_image']), 
                  audioUrl: audioUrl,
                  transcript: chapterTranscript
              };
          });
      }
  }

  // FALLBACK: If extraction failed or data is empty, create a single "Full Episode" segment
  if (finalSegments.length === 0) {
      const totalDuration = parseFloat(getProperty(row, ['audio_duration_seconds', 'duration']) || "0");
      // For fallback, we need to parse transcript again if we were in Format A path but failed, 
      // but usually Format A failure means empty transcript anyway.
      // Use parseRawTranscriptLegacy just in case.
      const rawTrans = parseRawTranscriptLegacy(row.segments);
      
      finalSegments = [{
          id: `${id}-full`,
          title: "Full Episode",
          category: "Podcast",
          duration: totalDuration > 0 ? totalDuration : 1800,
          startTime: 0,
          sourceName: "RadioX Archive",
          articleDescription: description,
          audioUrl: audioUrl,
          transcript: rawTrans // Already absolute/relative (same since start is 0)
      }];
  }

  return {
    id,
    title,
    hosts,
    date,
    createdAt,
    coverUrl,
    description,
    longDescription: description,
    totalDuration: totalAudioDuration > 0 ? totalAudioDuration : undefined,
    tags: tags.length > 0 ? tags : undefined,
    segments: finalSegments
  };
};

export const api = {
  async getShows(): Promise<Show[]> {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Supabase credentials missing.");
      throw new Error("Configuration Error: Missing Supabase Credentials.");
    }

    const { data: shows, error } = await supabase
      .from('shows')
      .select('*') 
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error("Supabase Shows Error:", error);
      throw new Error(error.message);
    }

    return (shows || []).map(row => mapShowToShowWithSegments(row));
  },

  async getShowById(id: string): Promise<Show | null> {
    const { data, error } = await supabase
      .from('shows')
      .select('*') 
      .or(`id.eq.${id}`)
      .single();

    if (error || !data) return null;

    return mapShowToShowWithSegments(data);
  },

  async getSpeakers(): Promise<Speaker[]> {
    const { data, error } = await supabase
      .from('speaker_profiles')
      .select('speaker_name, avatar_url');
    
    if (error || !data) return [];

    return data.map(s => ({
      name: s.speaker_name,
      avatarUrl: s.avatar_url
    }));
  }
};