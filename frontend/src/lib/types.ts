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
}

export interface SongDetail {
  id: string;
  title: string;
  album_title: string;
  track_number: number | null;
  duration_seconds: number | null;
  tempo_bpm: number | null;
  key: string | null;
  energy: number | null;
  mood_energy: number | null;
  primary_topics: string[];
  secondary_tags: string[];
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
