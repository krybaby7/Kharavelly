-- ============================================================
-- MIGRATION: Create book_catalog table for self-growing library
-- Run this in your Supabase SQL Editor
-- ============================================================

-- The book_catalog is a SHARED resource (not per-user).
-- Every book that appears anywhere in the app gets an entry here.
-- Users' personal libraries (the `books` table) reference this catalog.

CREATE TABLE IF NOT EXISTS book_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_key TEXT UNIQUE NOT NULL,               -- "title|author" normalized lowercase

    -- Tier 1: Essential
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    primary_genre TEXT NOT NULL DEFAULT 'Unknown',
    fiction_nonfiction TEXT NOT NULL DEFAULT 'fiction' CHECK (fiction_nonfiction IN ('fiction', 'nonfiction')),
    description TEXT DEFAULT '',
    themes TEXT[] DEFAULT '{}',
    pacing TEXT DEFAULT 'moderate',
    tone TEXT[] DEFAULT '{}',
    mood_emotions TEXT[] DEFAULT '{}',

    -- Tier 2: Important
    subgenres TEXT[] DEFAULT '{}',
    tropes TEXT[] DEFAULT '{}',
    characterization TEXT,                          -- character-driven, plot-driven, idea-driven, balanced
    writing_style TEXT[] DEFAULT '{}',
    protagonist_types TEXT[] DEFAULT '{}',
    content_warnings JSONB DEFAULT '[]',            -- [{category, intensity, notes}]
    emotional_impact TEXT,
    setting JSONB DEFAULT '{}',                     -- {time_period, location_type, real_or_fictional, importance}
    target_age_group TEXT DEFAULT 'adult',

    -- Tier 3: Enhanced
    storyline_structure TEXT[] DEFAULT '{}',
    character_development TEXT,
    relationship_focus TEXT[] DEFAULT '{}',
    representation JSONB DEFAULT '{}',              -- {protagonist_identities: [], diversity_notes: []}
    ending_type TEXT,
    best_read_when TEXT[] DEFAULT '{}',
    reading_difficulty TEXT,
    positive_content_notes TEXT[] DEFAULT '{}',

    -- Tier 4: Enrichment
    awards TEXT[] DEFAULT '{}',
    comparable_books TEXT[] DEFAULT '{}',
    isbn TEXT,
    page_count INTEGER,
    first_published_year INTEGER,
    series_name TEXT,
    series_position INTEGER,

    -- External data (from Google Books / Open Library)
    cover_image TEXT,
    rating NUMERIC(3,2) DEFAULT 0,
    ratings_count INTEGER DEFAULT 0,
    rating_source TEXT,

    -- Recommendation match data (from Perplexity)
    -- These are PER-RECOMMENDATION but stored as the "best" version
    relationship_dynamics JSONB DEFAULT '{}',       -- {romantic, platonic, familial, rivalries}
    reader_need TEXT,

    -- System / Quality
    enrichment_tier INTEGER NOT NULL DEFAULT 1 CHECK (enrichment_tier BETWEEN 1 AND 4),
    extraction_source TEXT NOT NULL DEFAULT 'perplexity-recommendation',
    confidence_score NUMERIC(3,2) DEFAULT 0.5,
    needs_review BOOLEAN DEFAULT false,
    embedding_text TEXT,                            -- concatenated text for vector search
    times_recommended INTEGER DEFAULT 1,            -- how often this book has been recommended
    times_saved INTEGER DEFAULT 0,                  -- how often users saved it to their library

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_enriched_at TIMESTAMPTZ
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_catalog_key ON book_catalog(catalog_key);
CREATE INDEX IF NOT EXISTS idx_catalog_genre ON book_catalog(primary_genre);
CREATE INDEX IF NOT EXISTS idx_catalog_tier ON book_catalog(enrichment_tier);
CREATE INDEX IF NOT EXISTS idx_catalog_themes ON book_catalog USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_catalog_tropes ON book_catalog USING GIN(tropes);
CREATE INDEX IF NOT EXISTS idx_catalog_mood ON book_catalog USING GIN(mood_emotions);
CREATE INDEX IF NOT EXISTS idx_catalog_tone ON book_catalog USING GIN(tone);

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_catalog_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER catalog_updated
    BEFORE UPDATE ON book_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_catalog_timestamp();

-- RLS: The catalog is readable by everyone, writable by authenticated users
ALTER TABLE book_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read catalog"
    ON book_catalog FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert"
    ON book_catalog FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update"
    ON book_catalog FOR UPDATE
    USING (auth.role() = 'authenticated');


-- ============================================================
-- Optional: Add catalog_id foreign key to the user's books table
-- This links a user's personal library entry to the shared catalog.
-- ============================================================

-- ALTER TABLE books ADD COLUMN catalog_id UUID REFERENCES book_catalog(id);
-- CREATE INDEX IF NOT EXISTS idx_books_catalog_id ON books(catalog_id);


-- ============================================================
-- Optional: reader_profiles table for persistent user taste profiles
-- (For the MAP architecture — persistent preference memory)
-- ============================================================

CREATE TABLE IF NOT EXISTS reader_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Accumulated taste profile
    preferred_genres TEXT[] DEFAULT '{}',
    preferred_themes TEXT[] DEFAULT '{}',
    preferred_tropes TEXT[] DEFAULT '{}',
    preferred_pacing TEXT[] DEFAULT '{}',
    preferred_tone TEXT[] DEFAULT '{}',
    preferred_mood TEXT[] DEFAULT '{}',
    avoided_content TEXT[] DEFAULT '{}',             -- content warnings the user dislikes
    
    -- Profile text (LLM-generated summary of taste)
    profile_summary TEXT,
    
    -- Stats
    total_books_rated INTEGER DEFAULT 0,
    last_recommendation_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id)
);

ALTER TABLE reader_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON reader_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own profile"
    ON reader_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON reader_profiles FOR UPDATE
    USING (auth.uid() = user_id);
