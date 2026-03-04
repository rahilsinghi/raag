# Raag — Artist Intelligence Engine
### *A multimodal music retrieval and analysis platform*

> **"Raag"** (राग) — a melodic framework in Indian classical music that evokes a specific mood. Fits perfectly for a mood-driven music intelligence app rooted in Indian hip-hop.

---

## 1. What This Is

Raag is a self-hosted music intelligence platform that ingests an artist's entire discography — audio, lyrics, metadata — builds rich multimodal embeddings, and exposes everything through a conversational AI interface powered by MCP tools. Think of it as a "second brain" for an artist's body of work.

You chat with it naturally ("find me that Seedhe Maut song where they talk about the grind on Nayaab"), and it retrieves songs, builds playlists, visualizes mood maps, traces lyrical themes across albums, and surfaces connections you'd never notice manually.

**Starting artist:** Seedhe Maut (Encore ABJ + Calm)
**Architecture:** Multi-artist from day one — SM is just the first dataset.

---

## 2. Core Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                        │
│                                                          │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│   │  Chat UI    │  │  Mood Map    │  │  Analytics   │   │
│   │  (Next.js)  │  │  (D3/Three)  │  │  Dashboards  │   │
│   └──────┬──────┘  └──────┬───────┘  └──────┬───────┘   │
│          │                │                  │           │
│          └────────────────┼──────────────────┘           │
│                           │                              │
│                      REST / WebSocket                    │
└───────────────────────────┼──────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────┐
│                    ORCHESTRATION LAYER                    │
│                           │                              │
│   ┌───────────────────────▼───────────────────────┐      │
│   │           MCP Server (Python/FastAPI)          │      │
│   │                                                │      │
│   │  Tools:                                        │      │
│   │  ├── search_by_mood                            │      │
│   │  ├── search_by_lyrics                          │      │
│   │  ├── search_by_sound                           │      │
│   │  ├── get_song_context                          │      │
│   │  ├── build_playlist                            │      │
│   │  ├── get_mood_map_data                         │      │
│   │  ├── get_artist_graph                          │      │
│   │  ├── get_album_analytics                       │      │
│   │  ├── get_mc_comparison                         │      │
│   │  ├── search_bars                               │      │
│   │  └── ingest_album                              │      │
│   └───────────────────────┬───────────────────────┘      │
│                           │                              │
│   ┌───────────────────────▼───────────────────────┐      │
│   │           LLM Layer (Claude API → later OSS)   │      │
│   │           Handles reasoning + tool selection    │      │
│   └───────────────────────┬───────────────────────┘      │
│                           │                              │
└───────────────────────────┼──────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────┐
│                    INTELLIGENCE LAYER                     │
│                           │                              │
│   ┌───────────────────────▼───────────────────────┐      │
│   │          Embedding & Analysis Engine            │      │
│   │                                                │      │
│   │  ├── Audio Pipeline (CLAP + librosa)           │      │
│   │  ├── Lyrics Pipeline (sentence-transformers)   │      │
│   │  ├── NLP Pipeline (topic, entity, sentiment)   │      │
│   │  ├── Bar Annotator (punchlines, callbacks)     │      │
│   │  └── MC Splitter (verse attribution)           │      │
│   └───────────────────────┬───────────────────────┘      │
│                           │                              │
│   ┌───────────────────────▼───────────────────────┐      │
│   │              Storage Layer                      │      │
│   │                                                │      │
│   │  ├── Qdrant (vector DB — embeddings)           │      │
│   │  ├── PostgreSQL (structured metadata, tags)    │      │
│   │  └── Local filesystem (audio files)            │      │
│   └────────────────────────────────────────────────┘      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Why This Architecture?

- **MCP Server as the brain:** The LLM never touches raw data. It reasons about what tool to call. This is the agentic pattern that's extremely relevant to your target roles — the LLM is an orchestrator, not a database.
- **Separation of embedding engine from serving layer:** You run heavy ML pipelines (CLAP, transformers) during ingestion, not at query time. Queries hit pre-computed vectors and structured data — fast and cheap.
- **Multi-artist by design:** Every table, every vector collection is namespaced by `artist_id`. Adding a new artist is just running the ingestion pipeline on new data.

---

## 3. The Intelligence Layer — Deep Dive

This is where the technical weight lives and what'll make recruiters pay attention.

### 3.1 Audio Embedding Pipeline

**Model:** Microsoft CLAP (Contrastive Language-Audio Pretraining)

Why CLAP specifically: it maps audio AND text into the same embedding space. This means you can search for songs using natural language ("aggressive beat with heavy bass") and it'll match against audio features directly — no manual tagging needed. This is the key insight that makes the whole "chat with your music" thing work beyond just lyrics.

**Pipeline per song:**
```
audio file (.mp3/.flac)
    │
    ├──► CLAP encoder ──► 512-dim audio embedding ──► Qdrant
    │
    ├──► librosa feature extraction:
    │       ├── tempo (BPM)
    │       ├── key (estimated via chroma features)
    │       ├── energy (RMS energy curve)
    │       ├── spectral centroid (brightness)
    │       ├── onset density (rhythmic complexity)
    │       └── loudness contour (LUFS over time)
    │    ──► PostgreSQL (structured, filterable)
    │
    └──► Beat-aligned segmentation:
            ├── intro / verse / chorus / bridge / outro detection
            └── per-segment embeddings for fine-grained matching
```

**Segment detection approach:** Use `librosa.segment.agglomerative` for initial structural segmentation, then refine with a simple classifier trained on a small labeled set (you manually label ~20 songs' structures, train a lightweight model to generalize). This gives you the ability to say "find songs with hard-hitting choruses" — you're matching against chorus embeddings specifically, not the whole track.

**What makes this resume-strong:** You're doing multimodal contrastive retrieval (CLAP), structural audio analysis, and segment-level indexing. This is research-grade work packaged into a product.

### 3.2 Lyrics Embedding Pipeline

**Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` as the base, fine-tuned on Hindi rap lyrics.

Why this specific model: It already handles Hindi and English, which is critical for Seedhe Maut's code-switching. Fine-tuning on rap lyrics teaches it that "scene" in a DHH context means the hip-hop scene, not a movie scene.

**Pipeline per song:**
```
raw lyrics (from Genius API)
    │
    ├──► Language detection + normalization
    │       ├── Handle Devanagari + Romanized Hindi + English
    │       ├── Normalize transliterations
    │       └── Preserve original script alongside romanized
    │
    ├──► Chunking strategy:
    │       ├── Verse-level chunks (primary)
    │       ├── Bar-level chunks (individual lines)
    │       └── Full-song aggregate
    │
    ├──► Per-chunk embedding ──► Qdrant (separate collection)
    │
    └──► Metadata extraction (detailed in NLP pipeline below)
```

**Fine-tuning approach:**
- Collect ~500 lyric pairs with similarity labels (you create these — "these two verses are about the same theme" vs "these are unrelated")
- Use contrastive fine-tuning (MultipleNegativesRankingLoss from sentence-transformers)
- This is a small but impactful training task that shows you understand when and why to fine-tune vs use off-the-shelf

**Handling Hindi-English code-switching:**
This is the genuinely hard NLP problem here and worth calling out specifically in interviews. Seedhe Maut switches languages mid-sentence, uses Hindi slang, English rap terminology, and Hinglish constructions. Your approach:
1. Keep the multilingual model as base (it handles both scripts)
2. Build a custom vocabulary augmentation for DHH-specific slang
3. During fine-tuning, include code-switched pairs so the model learns that "bhai ne scene badal diya" and "they changed the game" are semantically similar

### 3.3 NLP Analysis Pipeline (Topic, Entity, Sentiment)

This runs once during ingestion and produces structured data stored in PostgreSQL.

#### Topic Classification

**Approach:** Zero-shot classification using `facebook/bart-large-mnli` bootstrapped, then fine-tuned on manual labels.

**Taxonomy (Seedhe Maut-specific, extensible per artist):**

```
PRIMARY TOPICS:
├── Hustle & Grind (coming up, working hard, studio life)
├── Flex & Braggadocio (skill claims, success, competition)
├── Introspection (self-doubt, growth, mental health)
├── Social Commentary (system, politics, inequality)
├── Storytelling (narrative-driven, character sketches)
├── Diss / Competition (direct or indirect shots)
├── Crew & Brotherhood (Azadi, SM bond, loyalty)
├── Street / Reality (life experiences, struggles)
├── Love / Relationships (rare for SM but exists)
└── Experimental / Abstract (wordplay-heavy, conceptual)

SECONDARY TAGS (multi-label):
├── Aggressive, Chill, Hype, Dark, Triumphant
├── Punchline-heavy, Flow-focused, Message-driven
└── Hindi-dominant, English-dominant, Balanced
```

Each song gets 1-2 primary topics and multiple secondary tags. You start with zero-shot to bootstrap labels for the full discography, manually review and correct ~30-40% of them, then train a classifier on the corrected set.

#### Named Entity Extraction (The Relationship Graph Data)

This is the most novel part of the project. Standard NER (spaCy, etc.) won't work well for Hindi rap lyrics — too much slang, indirect references, wordplay.

**Approach:** Use Claude API for entity extraction during ingestion.

For each song, you send the lyrics to Claude with a structured prompt:
```
Given these rap lyrics by Seedhe Maut, extract:
1. Direct artist mentions (name the artist, is it diss/shoutout/neutral)
2. Indirect references to other artists (subliminal disses, callbacks)
3. Self-references and alter-ego usage
4. Place references (cities, venues, neighborhoods)
5. Cultural references (movies, shows, events, brands)
6. Callbacks to their own older songs (bar references, recurring metaphors)

Return as structured JSON.
```

This is smart because:
- Claude handles Hindi-English code-switching natively
- You get structured output without training a custom NER model
- The cost is one-time during ingestion (not per query)
- You manually verify the output and store corrections, building a training set for a future local model

**Estimated cost for SM discography:** ~60-80 songs × ~$0.02-0.05 per extraction call = under $5 total. Negligible.

#### Sentiment & Stance Detection

For each entity mention, classify the stance:
- **Positive:** Shoutout, respect, collaboration reference
- **Negative:** Diss, criticism, mockery
- **Neutral:** Simple mention, storytelling reference
- **Ambiguous:** Could be read either way (subliminal)

Store with confidence scores. Let the user override in the UI — this human-in-the-loop element is both good UX and good ML practice.

### 3.4 Bar Annotator

This is the "lyric deep-dive" feature. For each song, you produce line-level annotations:

**Annotation types:**
- **Punchline:** A bar that hits hard — wordplay, double entendre, clever flip
- **Callback:** References their own older material
- **Cultural reference:** Allusion to film, music, current events
- **Rhyme scheme marker:** Map the rhyme patterns (AABB, ABAB, internal rhymes, multisyllabic)
- **Flow switch:** Points where the delivery pattern changes significantly
- **Key bar:** The most quotable/significant line in a verse

**Approach:** Again, use Claude API during ingestion with a detailed prompt. For ~60-80 songs, the cost is minimal, and the quality will be much better than any rule-based approach.

Store annotations as:
```json
{
  "song_id": "nayaab-01",
  "bars": [
    {
      "line_number": 1,
      "text": "...",
      "mc": "encore",
      "annotations": ["punchline", "cultural_reference"],
      "punchline_explanation": "...",
      "reference_target": "...",
      "rhyme_group": "A"
    }
  ]
}
```

### 3.5 MC Splitter (Encore ABJ vs Calm)

**Approach — pragmatic, not overengineered:**

1. **Primary method:** Genius API often has verse attributions (e.g., "[Verse 1: Encore ABJ]"). Parse these headers.
2. **Fallback:** For songs without clear attribution, use speaker diarization on the audio (`pyannote/speaker-diarization-3.1`). Since SM is a duo, the model just needs to learn two voices — train on a few manually labeled songs and it'll generalize.
3. **Final fallback:** Manual annotation through the UI (you label who raps which verse).

Once you have per-MC verse splits, you can compute individual analytics for everything — topic preferences, vocabulary, flow patterns, feature frequency.

---

## 4. The MCP Server — Tool Design

The MCP server is the centerpiece of the agentic architecture. Here's every tool defined:

### 4.1 Retrieval Tools

```python
@mcp.tool()
async def search_by_mood(
    description: str,          # Natural language mood description
    artist_id: str = None,     # Filter by artist (multi-artist support)
    album_id: str = None,      # Filter by album
    limit: int = 10,
    energy_range: tuple = None,  # Optional acoustic filters
    tempo_range: tuple = None
) -> list[SongResult]:
    """
    Embeds the mood description using CLAP's text encoder,
    then does cosine similarity search against audio embeddings.
    Optionally filters by structured acoustic features.
    """

@mcp.tool()
async def search_by_lyrics(
    query: str,               # "that song about grinding in the studio"
    search_level: str = "verse",  # "verse", "bar", or "song"
    artist_id: str = None,
    album_id: str = None,
    limit: int = 10
) -> list[LyricResult]:
    """
    Embeds query using the fine-tuned sentence transformer,
    searches against lyric chunk embeddings at specified granularity.
    Returns matched chunks with surrounding context.
    """

@mcp.tool()
async def search_by_sound(
    reference_song_id: str,    # "find songs that sound like this"
    same_artist: bool = True,
    limit: int = 10
) -> list[SongResult]:
    """
    Takes a song's audio embedding, finds nearest neighbors.
    Useful for "more like this" functionality.
    """

@mcp.tool()
async def search_bars(
    query: str,                # "best punchlines about competition"
    annotation_type: str = None,  # "punchline", "callback", "cultural_ref"
    mc: str = None,            # "encore" or "calm"
    limit: int = 20
) -> list[BarResult]:
    """
    Searches at the individual bar level.
    Combines semantic search with annotation filters.
    """
```

### 4.2 Context Tools

```python
@mcp.tool()
async def get_song_context(
    song_id: str
) -> SongDetail:
    """
    Returns everything about a song: full lyrics with annotations,
    all tags, acoustic features, which album, featured artists,
    entity mentions, MC splits, and its position in the mood map.
    """

@mcp.tool()
async def get_album_context(
    album_id: str
) -> AlbumDetail:
    """
    Album-level aggregate: track listing, mood distribution,
    topic breakdown, key stats, production info.
    """

@mcp.tool()
async def get_mc_comparison(
    artist_id: str,
    album_id: str = None   # Compare across one album or full discography
) -> MCComparison:
    """
    Returns side-by-side analytics for each MC:
    vocabulary stats, topic preferences, flow metrics,
    verse counts, feature frequency.
    """
```

### 4.3 Generation Tools

```python
@mcp.tool()
async def build_playlist(
    description: str,         # "a 30-min set that starts hype and ends chill"
    constraints: dict = None, # {"min_songs": 5, "max_songs": 12, "albums": [...]}
    mood_arc: list = None,    # ["hype", "aggressive", "transitional", "chill"]
    artist_id: str = None
) -> Playlist:
    """
    Builds an ordered playlist. Uses mood_arc to sequence songs
    so adjacent tracks flow well (checks audio similarity between
    consecutive songs). Returns songs with transition notes.
    """

@mcp.tool()
async def get_mood_map_data(
    artist_id: str,
    view: str = "full",       # "full", "album", "topic", "features"
    album_id: str = None,
    edge_types: list = None   # ["sonic", "lyrical", "entity", "feature_artist"]
) -> MoodMapData:
    """
    Returns the graph data for the mood map visualization.
    Nodes = songs, edges = correlations of specified types.
    Includes layout coordinates from force-directed simulation.
    """

@mcp.tool()
async def get_artist_graph(
    artist_id: str
) -> ArtistGraph:
    """
    Returns the social/relationship graph.
    Center node = artist, connected nodes = mentioned artists,
    edges colored by sentiment (diss/shoutout/collab/neutral).
    Each edge annotated with specific bars as evidence.
    """

@mcp.tool()
async def get_album_analytics(
    artist_id: str,
    metric: str = "all"       # "vocabulary", "mood", "production", "features", "all"
) -> AlbumAnalytics:
    """
    Cross-album evolution data. Vocabulary growth curves,
    mood distribution shifts, production fingerprints,
    collaboration frequency over time.
    """
```

### 4.4 Ingestion Tools

```python
@mcp.tool()
async def ingest_album(
    artist_id: str,
    album_name: str,
    audio_dir: str,           # Path to local audio files
    genius_album_id: str = None,  # For auto-fetching lyrics
    release_date: str = None
) -> IngestionStatus:
    """
    Kicks off the full ingestion pipeline:
    1. Fetch/validate lyrics from Genius
    2. Run audio embedding pipeline (CLAP + librosa)
    3. Run lyric embedding pipeline
    4. Run NLP analysis (topic, entity, sentiment)
    5. Run bar annotation
    6. Run MC splitting
    7. Index everything into Qdrant + PostgreSQL
    Returns progress status (this is a long-running job).
    """

@mcp.tool()
async def update_annotations(
    song_id: str,
    corrections: dict          # Human overrides for auto-generated tags
) -> UpdateStatus:
    """
    Applies human corrections to auto-generated labels.
    Stores corrections separately for potential model retraining.
    """
```

---

## 5. Data Models

### PostgreSQL Schema (Core)

```sql
-- Multi-artist support from day one
CREATE TABLE artists (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    members JSONB,            -- ["Encore ABJ", "Calm"] for SM
    metadata JSONB
);

CREATE TABLE albums (
    id UUID PRIMARY KEY,
    artist_id UUID REFERENCES artists(id),
    name TEXT NOT NULL,
    release_date DATE,
    album_type TEXT,           -- "studio", "ep", "mixtape", "single"
    metadata JSONB
);

CREATE TABLE songs (
    id UUID PRIMARY KEY,
    album_id UUID REFERENCES albums(id),
    artist_id UUID REFERENCES artists(id),
    title TEXT NOT NULL,
    track_number INT,
    duration_seconds INT,
    -- Acoustic features (from librosa)
    tempo FLOAT,
    key TEXT,
    energy FLOAT,
    spectral_centroid FLOAT,
    onset_density FLOAT,
    -- Classification
    primary_topics TEXT[],
    secondary_tags TEXT[],
    mood_valence FLOAT,       -- -1 (dark) to 1 (bright)
    mood_energy FLOAT,        -- 0 (chill) to 1 (hype)
    -- File references
    audio_path TEXT,
    genius_url TEXT,
    metadata JSONB
);

CREATE TABLE lyrics (
    id UUID PRIMARY KEY,
    song_id UUID REFERENCES songs(id),
    full_text TEXT,
    language_breakdown JSONB,  -- {"hindi": 0.6, "english": 0.35, "other": 0.05}
    word_count INT,
    unique_word_count INT,
    lexical_diversity FLOAT
);

CREATE TABLE bars (
    id UUID PRIMARY KEY,
    song_id UUID REFERENCES songs(id),
    line_number INT,
    text TEXT,
    mc TEXT,                   -- "encore", "calm", "feature", "both"
    section TEXT,              -- "verse1", "chorus", "bridge", etc.
    annotations TEXT[],        -- ["punchline", "callback", "cultural_ref"]
    punchline_explanation TEXT,
    callback_target TEXT,      -- song_id of referenced song
    rhyme_group TEXT,
    sentiment FLOAT,
    metadata JSONB
);

CREATE TABLE entity_mentions (
    id UUID PRIMARY KEY,
    song_id UUID REFERENCES songs(id),
    bar_id UUID REFERENCES bars(id),
    entity_name TEXT,          -- "Kr$na", "Raftaar", "Prabh Deep"
    entity_type TEXT,          -- "artist", "place", "brand", "event"
    stance TEXT,               -- "diss", "shoutout", "neutral", "ambiguous"
    confidence FLOAT,
    context TEXT,              -- Surrounding bars for evidence
    human_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE feature_artists (
    id UUID PRIMARY KEY,
    song_id UUID REFERENCES songs(id),
    artist_name TEXT,
    role TEXT                  -- "feature", "producer", "sample"
);

-- For tracking corrections and building training data
CREATE TABLE human_corrections (
    id UUID PRIMARY KEY,
    target_table TEXT,
    target_id UUID,
    field_name TEXT,
    original_value JSONB,
    corrected_value JSONB,
    corrected_at TIMESTAMP DEFAULT NOW()
);
```

### Qdrant Collections

```
raag_audio_embeddings
├── vector: 512-dim (CLAP)
├── payload: {song_id, artist_id, album_id, segment: "full"|"verse1"|"chorus"...}

raag_lyric_embeddings
├── vector: 384-dim (sentence-transformer)
├── payload: {song_id, artist_id, chunk_type: "verse"|"bar"|"full", chunk_index, mc, text}

raag_mood_embeddings
├── vector: 512-dim (CLAP text-audio shared space)
├── payload: {song_id, artist_id, mood_tags}
```

---

## 6. Frontend Features — Detailed

### 6.1 Chat Interface

**Framework:** Next.js 14+ with App Router

The chat is the primary interaction mode. It connects to the MCP server through a thin API route that:
1. Sends the user message + conversation history to Claude API
2. Claude decides which MCP tool(s) to call
3. Tool results come back with structured data
4. The frontend renders appropriate UI components based on the data type

**Rich response rendering:**
When the LLM returns data, the chat doesn't just show text. It renders inline components:
- Song results → Playable cards with cover art, key stats, and a snippet of the matched lyrics highlighted
- Playlists → Ordered list with drag-to-reorder, estimated duration, mood arc visualization
- Bar results → Lyric snippets with annotation badges and MC attribution
- Analytics → Inline charts (recharts) embedded in the chat flow

**Example interactions:**
```
User: "What's the most aggressive track on Nayaab?"
→ LLM calls search_by_mood("extremely aggressive", album_id="nayaab")
→ Returns ranked songs with energy/mood scores
→ Renders as song cards with aggression meter

User: "Find the bar where Encore talks about haters on Bayaan"
→ LLM calls search_bars("haters", mc="encore", album_id="bayaan")
→ Returns matching bars with annotations
→ Renders as annotated lyric cards

User: "Build me a 20-min playlist for a late night drive"
→ LLM calls build_playlist("late night drive, moody, atmospheric", mood_arc=["chill", "introspective", "building", "cathartic"])
→ Returns sequenced playlist
→ Renders as interactive playlist with flow visualization

User: "How has their vocabulary evolved from Bayaan to lunch break?"
→ LLM calls get_album_analytics(metric="vocabulary")
→ Returns time-series data
→ Renders as inline chart showing vocab growth curves
```

### 6.2 Mood Map (The Hero Feature)

**Implementation:** D3.js force-directed graph with WebGL acceleration (via d3-force + PixiJS for rendering at scale)

**Default view: Full Discography Map**
- Every song is a node
- Node size = lyrical density (word count / duration)
- Node color = album (each album gets a distinct color)
- Node glow/ring = energy level
- Position = determined by force simulation where similar songs attract

**Edge types (toggle-able):**
- **Sonic similarity** (blue edges): Songs with audio embedding cosine similarity > 0.75
- **Lyrical similarity** (green edges): Songs with lyric embedding similarity > 0.7
- **Shared entities** (red/gold edges): Songs that mention the same artist/reference
- **Feature connections** (purple edges): Songs sharing a feature artist

**Interaction:**
- Click a node → Expands to show song details, plays a preview snippet, shows annotations
- Hover → Highlights all connected edges and their types
- Drag → Rearrange the graph, the simulation stabilizes around your arrangement
- Zoom into a cluster → Auto-labels the cluster with its dominant mood/topic
- Filter panel → Toggle albums on/off, filter by MC, filter by topic, adjust similarity thresholds

**Album view:** Same graph but only songs from one album. Adds a "track order" overlay that draws the album's sequence as a path through the mood space — revealing how the artist sequenced the emotional journey.

**Topic clusters view:** Pre-computed UMAP reduction of lyric embeddings to 2D. Each point is a song, colored by primary topic. Shows how topics cluster and where unexpected overlaps happen.

### 6.3 Diss & Shoutout Social Graph

**Implementation:** D3.js or vis.js network graph

**Structure:**
- Center node: Seedhe Maut (large, prominent)
- Outer nodes: Every artist mentioned in their lyrics
- Node size for outer artists = number of mentions
- Edge color: Green (shoutout/collab), Red (diss), Yellow (ambiguous), Gray (neutral mention)
- Edge thickness = number of mentions

**Interaction:**
- Click any edge → Shows all the specific bars that reference that artist, with song attribution and timestamp
- Click an outer artist node → Filters the mood map to only show songs where they're mentioned
- Timeline slider → Filter by release date to see how relationships evolved over time
- Toggle between "Encore's mentions" vs "Calm's mentions" vs "both"

**Easter egg feature:** For known beefs (e.g., SM vs certain artists), show a "beef timeline" — a chronological view of all diss bars from both sides if you've ingested the other artist's discography too.

### 6.4 Album Evolution Analytics

**Dashboard with multiple panels:**

**Vocabulary Evolution:**
- Line chart: Unique words per song, average across albums, over time
- Type-token ratio per album
- "New words introduced" per album (words that didn't appear in any previous release)
- Top unique words per album (words that appear frequently in this album but rarely in others)

**Mood Distribution:**
- Stacked bar chart per album showing topic proportions
- Radar chart comparing mood profiles across albums
- "Mood journey" per album — a line chart showing mood_valence and mood_energy across the tracklist order, revealing how the album's emotional arc was designed

**Production Fingerprint:**
- Tempo distribution per album (histogram overlay)
- Energy profiles
- Key usage patterns
- Average song length trends

**Collaboration Patterns:**
- Feature artist frequency per album
- Producer credits if available
- Solo vs duo tracks ratio per album

**MC Split View (Encore vs Calm):**
- Side-by-side vocabulary stats
- Topic preference comparison (radar chart)
- Verse count per album
- Average bars per verse
- Unique rhyme schemes used

### 6.5 Lyric Deep-Dive

A dedicated view for exploring a single song's lyrics in depth.

**Layout:** Full lyrics displayed with interactive annotations

- Click any bar → Shows annotation detail: punchline explanation, cultural references, callback links
- Color-coded by MC (Encore = one color, Calm = another)
- Rhyme scheme visualization in the margin (colored brackets connecting rhyming lines)
- Section headers (verse, chorus, bridge) with per-section mood scores
- "Similar bars" panel — click a line and see other lines across the discography with similar meaning or structure
- Audio sync (stretch goal) — bars highlight as the song plays

### 6.6 Ingestion UI

**Purpose:** Add new albums/artists to the system

**Flow:**
1. Upload audio files (drag-and-drop, batch)
2. Enter Genius album URL or ID → Auto-fetches lyrics
3. Preview extracted lyrics, correct any errors
4. Hit "Analyze" → Progress bar showing pipeline stages
5. Review auto-generated tags and annotations
6. Correct anything wrong (human-in-the-loop)
7. Confirm and index

This should feel like a polished tool, not an afterthought. Show pipeline stages, confidence scores, and make corrections easy.

---

## 7. Tech Stack — Final Choices

### Backend
| Component | Technology | Justification |
|-----------|-----------|---------------|
| API Server | **FastAPI** (Python) | Async, fast, great for ML workloads, auto-generated OpenAPI docs |
| MCP Server | **FastAPI + mcp-python-sdk** | Native MCP protocol support |
| Task Queue | **Celery + Redis** | Ingestion pipeline is long-running; needs async job processing |
| Vector DB | **Qdrant** | Better multi-collection support than ChromaDB, persistent, low memory footprint, has Docker image |
| Relational DB | **PostgreSQL** | The standard. JSONB for flexible metadata. Full-text search as a bonus |
| LLM | **Claude API** (Phase 1) → **Llama 3.1 8B via Ollama** (Phase 3) | Start fast with best quality, migrate to self-hosted to cut costs |
| Audio ML | **CLAP** (laion/larger_clap_music) + **librosa** | CLAP for embeddings, librosa for structured features |
| NLP ML | **sentence-transformers** + **Claude API for extraction** | Sentence transformers for embeddings, Claude for complex entity extraction during ingestion |

### Frontend
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Framework | **Next.js 14+** (App Router) | RSC for data-heavy pages, API routes for MCP proxy, great DX |
| Styling | **Tailwind CSS** | Fast iteration, looks good with minimal effort |
| Visualizations | **D3.js** (mood map, social graph) + **Recharts** (charts/analytics) | D3 for custom force graphs, Recharts for standard charts |
| State | **Zustand** | Lightweight, no boilerplate, perfect for this scale |
| Audio | **Howler.js** | Best web audio library for playback |

### Infrastructure
| Component | Technology | Cost |
|-----------|-----------|------|
| Hosting | **Railway** or **Fly.io** | ~$5-10/month for small instances |
| Database | **Railway PostgreSQL** or **Supabase** (free tier) | Free - $5/month |
| Qdrant | **Docker on same Railway instance** | Included in compute cost |
| Redis | **Railway Redis** or **Upstash** (free tier) | Free - $3/month |
| Audio storage | **Cloudflare R2** (10GB free) or same server filesystem | Free for small discography |
| LLM | **Claude API** | ~$5-15/month depending on usage (light usage for few friends) |
| **Total** | | **~$10-25/month** |

---

## 8. Build Phases

### Phase 1: Foundation (Weeks 1-3)
**Goal:** Get the core pipeline working end-to-end for ONE album

**Week 1: Data + Ingestion Pipeline**
- [ ] Set up project structure (monorepo with `backend/`, `frontend/`, `ml/`)
- [ ] Set up PostgreSQL schema, Qdrant collections
- [ ] Build Genius API integration — fetch lyrics for one SM album (start with Nayaab)
- [ ] Build audio feature extraction pipeline (librosa) — process all Nayaab tracks
- [ ] Build CLAP embedding pipeline — generate and store audio embeddings
- [ ] Build lyric chunking + embedding pipeline — chunk, embed, store in Qdrant

**Week 2: NLP + MCP Server**
- [ ] Build topic classification pipeline (zero-shot, review results, refine)
- [ ] Build entity extraction pipeline (Claude API calls for each song)
- [ ] Build bar annotation pipeline (Claude API)
- [ ] Set up FastAPI MCP server with first 3 tools: `search_by_mood`, `search_by_lyrics`, `get_song_context`
- [ ] Test tools manually — verify retrieval quality

**Week 3: Basic Chat UI**
- [ ] Set up Next.js project
- [ ] Build chat interface — message input, response rendering
- [ ] Connect to Claude API with MCP tools
- [ ] Build song result cards (rendered inline in chat)
- [ ] Deploy backend to Railway, frontend to Vercel

**Phase 1 deliverable:** You can chat with your app about Nayaab and get accurate song recommendations based on mood or lyrics.

### Phase 2: The Mood Map (Weeks 4-6)
**Goal:** Build the hero visualization feature

**Week 4: Full Discography Ingestion**
- [ ] Ingest all SM albums through the pipeline
- [ ] Build the MC splitter (parse Genius headers + fallback diarization)
- [ ] Review and correct auto-generated annotations across discography
- [ ] Fine-tune sentence transformer on corrected lyric pairs

**Week 5: Mood Map Visualization**
- [ ] Build force-directed graph with D3.js
- [ ] Implement edge types (sonic, lyrical, entity-based)
- [ ] Build node detail panel (click to expand)
- [ ] Add album color coding and filters
- [ ] Build topic cluster UMAP view

**Week 6: Social Graph + Integration**
- [ ] Build diss/shoutout social graph
- [ ] Add timeline slider for relationship evolution
- [ ] Connect mood map interactions to chat ("tell me about this cluster")
- [ ] Add remaining MCP tools (`get_mood_map_data`, `get_artist_graph`)

**Phase 2 deliverable:** Full discography visualized as an interactive mood map + social graph. Chat can reference and explain what you see on the map.

### Phase 3: Analytics + Polish (Weeks 7-9)
**Goal:** Album evolution dashboard, lyric deep-dive, playlist builder

**Week 7: Analytics Dashboard**
- [ ] Build album evolution charts (vocabulary, mood, production)
- [ ] Build MC comparison view
- [ ] Add `get_album_analytics` and `get_mc_comparison` MCP tools

**Week 8: Lyric Deep-Dive + Playlist Builder**
- [ ] Build lyric deep-dive page (annotated lyrics, rhyme visualization)
- [ ] Build playlist builder with mood arc support
- [ ] Add audio playback integration (Howler.js)
- [ ] Add `search_bars` and `build_playlist` MCP tools

**Week 9: Ingestion UI + Multi-Artist Prep**
- [ ] Build ingestion UI (upload, fetch lyrics, review, correct, index)
- [ ] Test adding a second artist to validate multi-artist architecture
- [ ] Mobile responsive pass (PWA setup for iOS Safari)
- [ ] Performance optimization, error handling, edge cases

**Phase 3 deliverable:** Feature-complete app with all visualizations, chat, and ingestion pipeline.

### Phase 4: Scale + Self-Host (Weeks 10-12)
**Goal:** Migrate off paid LLM API, harden for sharing with friends

**Week 10: Self-Hosted LLM**
- [ ] Set up Ollama with Llama 3.1 8B (or whatever best small model exists)
- [ ] Adapt MCP tool calling to work with open model (may need prompt engineering)
- [ ] Benchmark retrieval quality vs Claude API — find the right model
- [ ] Implement fallback (try local model, fall back to API if quality too low)

**Week 11: Auth + Sharing**
- [ ] Add simple auth (NextAuth.js with email/password or invite codes)
- [ ] Per-user preferences (favorite songs, custom tags, personal notes)
- [ ] Shared vs personal annotations

**Week 12: Hardening**
- [ ] Error handling across all pipelines
- [ ] Rate limiting, caching (Redis)
- [ ] Monitoring and logging
- [ ] Write README, architecture docs, record demo video
- [ ] Final deployment and optimization

---

## 9. Cost Breakdown (Monthly, Post-Launch)

**Cheapest viable setup:**
| Item | Service | Cost |
|------|---------|------|
| Compute (backend + Qdrant) | Railway (512MB - 1GB) | $5-10 |
| PostgreSQL | Railway or Supabase free tier | $0-5 |
| Redis | Upstash free tier | $0 |
| Frontend | Vercel free tier | $0 |
| Audio storage | Cloudflare R2 (small) or server disk | $0-1 |
| LLM (Phase 1-3) | Claude API (light usage) | $5-15 |
| LLM (Phase 4+) | Self-hosted on same server | $0 (included in compute) |
| Domain | Optional | $10/year |
| **Total (with API)** | | **$10-30/month** |
| **Total (self-hosted LLM)** | | **$5-15/month** |

**Note:** If even that's too much, you can run everything on a $5/month Hetzner VPS (4GB RAM) and it'll work fine for a few users.

---

## 10. What Makes This Resume-Killer Material

When you present this in interviews for ML/AI/Agentic roles, here's what stands out:

1. **Multimodal Retrieval System:** You built embeddings across audio AND text modalities using CLAP and sentence-transformers. You understand contrastive learning, embedding spaces, and cross-modal search.

2. **Agentic Architecture with MCP:** You didn't just call an API — you designed a tool-use system where an LLM reasons about which tools to use. This is THE hot pattern in AI engineering right now.

3. **Custom NLP for Low-Resource Language Pair:** Hindi-English code-switching in rap lyrics is a legitimate NLP challenge. You handled transliteration, slang, domain-specific vocabulary, and built custom extraction pipelines.

4. **Fine-Tuning with Purpose:** You didn't fine-tune for the sake of it. You identified specific retrieval failures in off-the-shelf models and targeted fine-tuning to fix them. You can explain WHY you fine-tuned and what it improved.

5. **Human-in-the-Loop ML:** Your annotation correction system shows mature ML thinking — you know models aren't perfect and you built systems to capture human feedback and improve over time.

6. **Vector DB + Relational DB Hybrid:** You made a deliberate architectural choice about what goes where — vectors for similarity search, structured data for filtering and analytics. Not everything is a vector search.

7. **Full-Stack Ownership:** End-to-end from ML pipelines to data modeling to API design to interactive visualizations. Shows you can own a system, not just a slice.

8. **It Actually Works and Is Useful:** It's not a toy demo. You use it, your friends use it, and it does something genuinely novel for music discovery.

---

## 11. Repository Structure

```
raag/
├── README.md
├── docker-compose.yml              # Qdrant + PostgreSQL + Redis + backend
├── .env.example
│
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── mcp/
│   │   │   ├── server.py           # MCP server setup
│   │   │   ├── tools/
│   │   │   │   ├── search.py       # search_by_mood, search_by_lyrics, etc.
│   │   │   │   ├── context.py      # get_song_context, get_album_context
│   │   │   │   ├── generate.py     # build_playlist, get_mood_map_data
│   │   │   │   └── ingest.py       # ingest_album, update_annotations
│   │   │   └── types.py            # Pydantic models for tool I/O
│   │   ├── ml/
│   │   │   ├── audio/
│   │   │   │   ├── clap_encoder.py
│   │   │   │   ├── librosa_features.py
│   │   │   │   └── segment_detector.py
│   │   │   ├── lyrics/
│   │   │   │   ├── embedder.py
│   │   │   │   ├── chunker.py
│   │   │   │   └── fine_tune.py
│   │   │   ├── nlp/
│   │   │   │   ├── topic_classifier.py
│   │   │   │   ├── entity_extractor.py
│   │   │   │   ├── sentiment.py
│   │   │   │   └── bar_annotator.py
│   │   │   └── mc_splitter.py
│   │   ├── db/
│   │   │   ├── postgres.py         # SQLAlchemy models + queries
│   │   │   ├── qdrant.py           # Qdrant client + collection management
│   │   │   └── migrations/         # Alembic migrations
│   │   ├── ingestion/
│   │   │   ├── pipeline.py         # Orchestrates full ingestion flow
│   │   │   ├── genius.py           # Genius API client
│   │   │   └── tasks.py            # Celery tasks for async processing
│   │   └── api/
│   │       ├── chat.py             # Chat endpoint (proxies to LLM + MCP)
│   │       ├── visualizations.py   # REST endpoints for mood map, graphs
│   │       └── ingestion.py        # REST endpoints for upload/ingest
│   └── tests/
│
├── frontend/
│   ├── package.json
│   ├── app/
│   │   ├── page.tsx                # Landing / chat
│   │   ├── chat/
│   │   │   └── page.tsx
│   │   ├── mood-map/
│   │   │   └── page.tsx
│   │   ├── artist-graph/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── song/[id]/
│   │   │   └── page.tsx            # Lyric deep-dive
│   │   └── ingest/
│   │       └── page.tsx
│   ├── components/
│   │   ├── chat/
│   │   ├── visualizations/
│   │   │   ├── MoodMap.tsx
│   │   │   ├── ArtistGraph.tsx
│   │   │   └── AlbumCharts.tsx
│   │   ├── song/
│   │   │   ├── SongCard.tsx
│   │   │   ├── LyricView.tsx
│   │   │   └── BarAnnotation.tsx
│   │   └── shared/
│   └── lib/
│       ├── api.ts                  # Backend API client
│       └── types.ts
│
├── ml/
│   ├── notebooks/                  # Jupyter notebooks for experimentation
│   │   ├── 01_audio_exploration.ipynb
│   │   ├── 02_lyric_embeddings.ipynb
│   │   ├── 03_clap_experiments.ipynb
│   │   └── 04_fine_tuning.ipynb
│   └── scripts/
│       ├── batch_ingest.py
│       └── evaluate_retrieval.py
│
└── data/                           # Git-ignored, local only
    ├── audio/
    ├── lyrics/
    └── models/                     # Fine-tuned model checkpoints
```

---

## 12. Key Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CLAP embeddings don't capture Indian hip-hop production well (trained mostly on Western music) | Poor sonic search quality | Test early in Week 1. Fallback: use librosa features for structured filtering + general audio embeddings from OpenL3 as alternative |
| Hindi-English code-switching breaks NLP pipelines | Bad topic classification, entity extraction | Use Claude API for extraction (handles multilingual natively). Fine-tune sentence transformer on corrected data. Build custom slang dictionary |
| Genius API lyrics are inaccurate/incomplete for DHH | Missing or wrong data foundation | Manual review pass is built into the pipeline. Community-sourced corrections via the UI |
| Qdrant + PostgreSQL + Redis + Celery on a small VPS | Memory pressure, slow ingestion | Ingestion is a one-time cost (can run locally first). Serving only needs Qdrant + Postgres. Redis can use Upstash serverless. Can shard later if needed |
| Self-hosted LLM can't do tool calling well | Poor chat experience after migration | Keep Claude API as fallback. Use function-calling-optimized models (Hermes, Functionary). Benchmark before switching |
| Force-directed graph is slow with 80+ songs | Laggy mood map | Pre-compute layout server-side, only run physics simulation for small interactions. Use WebGL rendering (PixiJS) instead of SVG |

---

*This plan is a living document. Update it as you build and learn — the best architecture emerges from building, not just planning.*
