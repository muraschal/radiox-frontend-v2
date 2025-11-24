
export interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: number; // seconds relative to segment start
}

export interface Segment {
  id: string;
  title: string;
  category: string;
  duration: number; // seconds
  startTime?: number; // Start time in the main audio file (for chapters)
  sourceUrl?: string;
  sourceName?: string;
  // New metadata fields for the source article
  articleImageUrl?: string;
  articleDescription?: string;
  articleTitle?: string;
  sourcePublishedAt?: string;
  transcript?: TranscriptLine[];
  audioUrl?: string; // URL for the actual audio file
}

export interface Show {
  id: string;
  title: string;
  hosts: string;
  /**
   * Human-readable date string (e.g. 24.11.2025) for quick display.
   * Derived from createdAt.
   */
  date: string;
  /**
   * ISO timestamp of when the show was created/released.
   * Used for relative "vor X Minuten" labels and precise HH:MM formatting.
   */
  createdAt: string;
  coverUrl: string;
  description: string;
  longDescription?: string; // Detailed description for the "About" section
  tags?: string[]; // SEO tags
  totalDuration?: number;
  segments: Segment[];
}

export interface PlayerState {
  isPlaying: boolean;
  currentShowId: string | null;
  currentSegmentIndex: number;
  progress: number; // current time in segment
}

export interface Speaker {
  name: string;
  avatarUrl: string;
}
