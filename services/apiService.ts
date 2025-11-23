
import { createClient } from '@supabase/supabase-js';
import { Show, Segment, TranscriptLine } from '../types';

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
 * PARSES THE RAW TRANSCRIPT
 * This comes from 'show.segments' in Supabase.
 * It contains strictly speaker, text, and timestamps.
 */
const parseRawTranscript = (segmentsJson: any): TranscriptLine[] => {
  if (!segmentsJson) return [];
  
  try {
    let rawSegments: any[] = [];

    // CASE 1: Legacy Array (Simple list of segments)
    if (Array.isArray(segmentsJson)) {
      rawSegments = segmentsJson;
    } 
    // CASE 2: New Structured Object (contains 'segments' array with 'speaker_lines')
    else if (typeof segmentsJson === 'object' && segmentsJson !== null) {
       if (Array.isArray(segmentsJson.segments)) {
          rawSegments = segmentsJson.segments.flatMap((structuredSeg: any) => {
            // If speaker_lines exists, flatten it
            if (Array.isArray(structuredSeg.speaker_lines)) {
                return structuredSeg.speaker_lines.map((line: any) => ({
                  speaker: line.speaker,
                  text: line.text,
                  display_text: line.text,
                  start_time: line.timestamp_start ?? 0,
                  end_time: line.timestamp_end ?? 0,
                  duration_estimate: line.duration_seconds ?? 0,
                }));
            }
            // Fallback if no speaker_lines (unlikely in structured)
            return [];
          });
       }
    }

    // Map to our TranscriptLine interface
    return rawSegments.map((seg: any) => ({
      speaker: seg.speaker || 'Unknown',
      text: seg.display_text || seg.text || '',
      timestamp: Number(seg.start_time || 0)
    })).filter(t => t.text && t.text.trim().length > 0);

  } catch (error) {
    console.error('Error parsing segments JSON:', error);
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
  // 1. Basic Metadata
  const id = row.id?.toString() || `show-${Math.random()}`;
  const title = getProperty(row, ['title', 'show_name', 'name']) || "Untitled Show";
  
  // DEBUG LOGGING START
  // console.log(`[RadioX Debug] Processing Show: ${title} (${id})`);
  const rawNewsData = getProperty(row, ['used_news', 'news', 'chapters']);
  // console.log(`[RadioX Debug] used_news found?`, !!rawNewsData, rawNewsData);
  // DEBUG LOGGING END

  const date = getProperty(row, ['date', 'created_at']) ? new Date(getProperty(row, ['date', 'created_at'])).toLocaleDateString() : new Date().toISOString().split('T')[0];
  const coverUrl = getProperty(row, ['cover_url', 'image_url', 'thumbnail']) || "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800&auto=format&fit=crop&q=60";
  const audioUrl = getProperty(row, ['audio_url', 'file_url', 'url']);
  
  // Hosts
  let hosts = "RadioX Host";
  const rawSpeakers = getProperty(row, ['speakers', 'hosts']);
  const metaSpeakers = row.metadata?.speakers;
  const finalSpeakers = rawSpeakers || metaSpeakers;

  if (Array.isArray(finalSpeakers) && finalSpeakers.length > 0) {
      hosts = finalSpeakers.join(' & ');
  } else if (typeof finalSpeakers === 'string') {
      hosts = finalSpeakers;
  }

  // Description
  const description = getProperty(row, ['script_preview', 'description', 'summary']) || "No description available.";
  const longDescription = getProperty(row, ['long_description', 'full_description']) || description;

  // 2. GET RAW TRANSCRIPT (Right Column Data)
  const rawTranscriptData = getProperty(row, ['segments', 'structured_segments', 'transcript']);
  const fullTranscript = parseRawTranscript(rawTranscriptData);

  // 3. GET TOPICS / CHAPTERS (Left Column Data)
  const newsItems = Array.isArray(rawNewsData) ? rawNewsData : [];
  let finalSegments: Segment[] = [];

  if (newsItems.length > 0) {
      // Sort news by timestamp to ensure correct order
      const sortedNews = [...newsItems].sort((a, b) => {
          const tA = parseFloat(getProperty(a, ['audio_timestamp', 'start', 'timestamp']) || "0");
          const tB = parseFloat(getProperty(b, ['audio_timestamp', 'start', 'timestamp']) || "0");
          return tA - tB;
      });

      finalSegments = sortedNews.map((news: any, index: number) => {
          const startTime = parseFloat(getProperty(news, ['audio_timestamp', 'start_time', 'start', 'timestamp']) || "0");
          
          // Calculate Duration
          let duration = parseFloat(getProperty(news, ['duration', 'length']) || "0");
          
          if (duration === 0) {
             const nextChapter = sortedNews[index + 1];
             if (nextChapter) {
                 const nextStart = parseFloat(getProperty(nextChapter, ['audio_timestamp', 'start_time', 'start', 'timestamp']) || "0");
                 if (nextStart > startTime) {
                     duration = nextStart - startTime;
                 }
             } else {
                 const totalAudioDuration = parseFloat(getProperty(row, ['audio_duration_seconds', 'duration']) || "0");
                 if (totalAudioDuration > startTime) {
                     duration = totalAudioDuration - startTime;
                 } else {
                     duration = 300; // Default fallback
                 }
             }
          }
          
          const endTime = startTime + duration;

          // Attach relevant Transcript Slice
          // This links the "Topic" (news) to the "Text" (segments)
          const chapterTranscript = fullTranscript.filter(t => 
              t.timestamp >= startTime && t.timestamp < endTime
          );

          return {
              id: `${id}-topic-${index}`,
              title: getProperty(news, ['title', 'headline']) || `Topic ${index + 1}`,
              category: getProperty(news, ['category', 'topic']) || "News",
              duration: duration,
              startTime: startTime,
              // IMPORTANT: Map 'link' from used_news to 'sourceUrl'
              sourceUrl: getProperty(news, ['link', 'url', 'article_url', 'web_link']),
              sourceName: getProperty(news, ['source', 'publisher', 'outlet']) || "Source",
              // IMPORTANT: Map 'summary' from used_news to 'articleDescription'
              articleDescription: getProperty(news, ['summary', 'description', 'content']),
              articleImageUrl: coverUrl, 
              audioUrl: audioUrl,
              transcript: chapterTranscript
          };
      });
  } else {
      // FALLBACK: No 'used_news' found
      // Log this event so developer knows why topics are missing
      // console.warn(`[RadioX] No used_news found for show ${id}. Using fallback.`);
      
      const totalDuration = parseFloat(getProperty(row, ['audio_duration_seconds', 'duration']) || "0");
      
      finalSegments = [{
          id: `${id}-full`,
          title: "Full Episode",
          category: "Podcast",
          duration: totalDuration > 0 ? totalDuration : 1800,
          startTime: 0,
          sourceName: "RadioX Archive",
          articleDescription: description,
          audioUrl: audioUrl,
          transcript: fullTranscript
      }];
  }

  return {
    id,
    title,
    hosts,
    date,
    coverUrl,
    description,
    longDescription,
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
  }
};
