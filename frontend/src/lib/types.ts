export interface SongResult {
  id: string;
  title: string;
  album_title: string;
  track_number: number | null;
  tempo_bpm: number | null;
  key: string | null;
  energy: number | null;
  mood_energy: number | null;
  primary_topics: string[];
  secondary_tags: string[];
  spotify_track_id: string | null;
  score: number;
}

export interface LyricResult {
  song_id: string;
  song_title: string;
  album_title: string | null;
  text: string;
  chunk_type: string;
  section: string | null;
  mc: string | null;
  score: number;
}

export interface RhymeWord {
  word: string;
  start_char: number;
  end_char: number;
  group: string;
}

export interface BarTiming {
  bar_index: number;
  start_ms: number;
  end_ms: number;
}

export interface BarResult {
  id: string;
  song_id: string;
  song_title: string;
  text: string;
  section: string | null;
  mc: string | null;
  bar_index: number;
  annotations: string[];
  punchline_explanation: string | null;
  reference_target: string | null;
  rhyme_group: string | null;
  rhyme_words: RhymeWord[] | null;
  start_ms: number | null;
  end_ms: number | null;
}

export interface SongDetail {
  id: string;
  title: string;
  album_title: string;
  release_year: number | null;
  track_number: number | null;
  duration_seconds: number | null;
  tempo_bpm: number | null;
  key: string | null;
  energy: number | null;
  mood_energy: number | null;
  primary_topics: string[];
  secondary_tags: string[];
  spotify_track_id: string | null;
  lyrics_text: string | null;
  word_count: number | null;
  unique_word_count: number | null;
  lexical_diversity: number | null;
  bars: BarResult[];
  entities: EntityMention[];
  features: FeatureArtist[];
}

export interface EntityMention {
  entity_type: string;
  entity_name: string;
  context: string | null;
  stance: string | null;
}

export interface FeatureArtist {
  artist_name: string;
  role: string | null;
}

// --- Graph types ---

export interface GraphNodeData {
  id: string;
  type: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdgeData {
  source: string;
  target: string;
  type: string;
  metadata: Record<string, unknown>;
}

export interface GraphDataResponse {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  stats: Record<string, number>;
}

// --- Spotify types ---

export interface SpotifyTrack {
  spotify_id: string;
  name: string;
  artists: string[];
  album_name: string;
  album_art_url: string | null;
  preview_url: string | null;
  external_url: string;
  duration_ms: number;
}

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number; // timestamp ms
}

export interface BarDescription {
  bar_id: string;
  text: string;
  translation: string | null;
  meaning: string;
  wordplay: string | null;
  cultural_references: string[];
  flow_notes: string | null;
  song_context: string | null;
  tldr: string;
}
