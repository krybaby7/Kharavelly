// ============================================================
// Book Catalog Types — The Self-Growing Library Schema
// ============================================================
// This schema is designed in 4 tiers of metadata richness.
// Tier 1 = MVP fields extracted on every recommendation.
// Tier 2 = Added when books are saved to user library.
// Tier 3-4 = Background enrichment over time.
// ============================================================

// --- Tier 1: Essential (extracted on every recommendation) ---

export interface CatalogTier1 {
    title: string;
    author: string;
    primary_genre: string;                          // e.g., "Fantasy", "Literary Fiction", "Thriller"
    fiction_nonfiction: 'fiction' | 'nonfiction';
    description: string;                            // Full book description (richest text for embeddings)
    themes: string[];                               // 3-5 major abstract concepts: identity, power, love, loss
    pacing: CatalogPacing;
    tone: string[];                                 // 2-3 descriptors: dark, humorous, philosophical, hopeful
    mood_emotions: string[];                        // 3-5 feelings the book evokes: tense, heartwarming, thought-provoking
}

// --- Tier 2: Important (improves quality significantly) ---

export interface CatalogTier2 {
    subgenres: string[];                            // e.g., "Dark Academia", "Cozy Mystery"
    tropes: string[];                               // 3-8 specific patterns: enemies-to-lovers, chosen one, heist
    characterization: CatalogCharacterization;
    writing_style: string[];                        // literary, accessible, lyrical, sparse, dialogue-heavy
    protagonist_types: string[];                    // strong female lead, anti-hero, ensemble cast
    content_warnings: ContentWarning[];
    emotional_impact: CatalogEmotionalImpact;
    setting: CatalogSetting;
    target_age_group: CatalogAgeGroup;
}

// --- Tier 3: Enhanced (power user features) ---

export interface CatalogTier3 {
    storyline_structure: string[];                  // linear, multiple timelines, unreliable narrator, frame narrative
    character_development: CatalogCharDev;
    relationship_focus: string[];                   // romance, family, friendship, professional, mentor-mentee
    representation: CatalogRepresentation;
    ending_type: CatalogEndingType;
    best_read_when: string[];                       // beach vacation, cozy day, can't sleep, need escapism
    reading_difficulty: CatalogDifficulty;
    positive_content_notes: string[];               // found family, healthy relationships, no sexual violence
}

// --- Tier 4: Enrichment (add later, from external data) ---

export interface CatalogTier4 {
    awards: string[];
    comparable_books: string[];                     // "for fans of X"
    isbn: string | null;
    page_count: number | null;
    first_published_year: number | null;
    series_name: string | null;
    series_position: number | null;
}

// --- Enums & Value Types ---

export type CatalogPacing =
    | 'breakneck'
    | 'fast'
    | 'moderate'
    | 'slow-burn'
    | 'meditative'
    | 'variable';

export type CatalogCharacterization =
    | 'character-driven'
    | 'plot-driven'
    | 'idea-driven'
    | 'balanced';

export type CatalogEmotionalImpact =
    | 'lighthearted'
    | 'feel-good'
    | 'bittersweet'
    | 'emotionally-intense'
    | 'devastating'
    | 'thought-provoking';

export type CatalogAgeGroup =
    | 'children'
    | 'middle-grade'
    | 'young-adult'
    | 'new-adult'
    | 'adult';

export type CatalogCharDev =
    | 'significant-transformation'
    | 'gradual-growth'
    | 'static-by-design'
    | 'ensemble-varied';

export type CatalogEndingType =
    | 'happily-ever-after'
    | 'happy-for-now'
    | 'bittersweet'
    | 'ambiguous'
    | 'tragic'
    | 'cliffhanger'
    | 'open-ended';

export type CatalogDifficulty =
    | 'easy-beach-read'
    | 'accessible'
    | 'moderate'
    | 'challenging'
    | 'very-demanding';

export interface ContentWarning {
    category: string;           // e.g., "violence", "sexual content", "substance abuse"
    intensity: 'mild' | 'moderate' | 'graphic';
    notes?: string;             // optional context: "war scenes in chapters 12-15"
}

export interface CatalogSetting {
    time_period: string;        // "contemporary", "medieval", "far future", "1920s"
    location_type: string;      // "urban", "rural", "space", "small town", "multiple"
    real_or_fictional: 'real' | 'fictional' | 'mixed';
    importance: 'backdrop' | 'important' | 'central-character';     // how much setting matters to the story
}

export interface CatalogRepresentation {
    protagonist_identities: string[];   // race, LGBTQIA+, disability — only when explicitly in text
    diversity_notes: string[];          // "own voices", "diverse cast"
}

// --- The Full Catalog Entry ---

export interface BookCatalogEntry extends CatalogTier1, Partial<CatalogTier2>, Partial<CatalogTier3>, Partial<CatalogTier4> {
    // System fields
    id?: string;                        // Supabase UUID
    catalog_key: string;                // normalized "title|author" for dedup
    cover_image: string | null;
    
    // Data quality tracking
    enrichment_tier: 1 | 2 | 3 | 4;    // highest tier fully populated
    extraction_source: string;          // "perplexity-recommendation", "perplexity-enrichment", "manual"
    confidence_score: number;           // 0-1, how confident the extraction is
    needs_review: boolean;              // flagged for human review
    
    // Embedding support
    embedding_text?: string;            // concatenated text used for vector embedding
    
    // Timestamps
    created_at?: string;
    updated_at?: string;
    last_enriched_at?: string;
}

// --- Helper to create a catalog key ---

export function makeCatalogKey(title: string, author: string): string {
    return `${title.toLowerCase().trim()}|${author.toLowerCase().trim()}`;
}

// --- Minimal catalog entry from a recommendation ---

export function createMinimalCatalogEntry(data: Partial<BookCatalogEntry> & { title: string; author: string }): BookCatalogEntry {
    return {
        catalog_key: makeCatalogKey(data.title, data.author),
        title: data.title,
        author: data.author,
        primary_genre: data.primary_genre || 'Unknown',
        fiction_nonfiction: data.fiction_nonfiction || 'fiction',
        description: data.description || '',
        themes: data.themes || [],
        pacing: data.pacing || 'moderate',
        tone: data.tone || [],
        mood_emotions: data.mood_emotions || [],
        cover_image: data.cover_image || null,
        enrichment_tier: data.enrichment_tier || 1,
        extraction_source: data.extraction_source || 'perplexity-recommendation',
        confidence_score: data.confidence_score || 0.5,
        needs_review: data.needs_review ?? false,
        // Spread any extra fields
        ...data,
    };
}

// --- Build embedding text from catalog entry ---

export function buildEmbeddingText(entry: BookCatalogEntry): string {
    const parts = [
        entry.title,
        `by ${entry.author}`,
        entry.description,
        entry.primary_genre,
        ...(entry.themes || []),
        ...(entry.tone || []),
        ...(entry.mood_emotions || []),
        ...(entry.tropes || []),
        ...(entry.subgenres || []),
        entry.pacing,
        ...(entry.protagonist_types || []),
        ...(entry.writing_style || []),
        ...(entry.relationship_focus || []),
        ...(entry.best_read_when || []),
    ].filter(Boolean);

    return parts.join('. ');
}
