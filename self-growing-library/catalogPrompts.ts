// ============================================================
// Catalog Extraction Prompts
// ============================================================
// These are focused, single-purpose prompts for extracting
// rich metadata from books. Separate from recommendation prompts.
// ============================================================

/**
 * TIER 1+2 EXTRACTION PROMPT
 * Used when a book first enters the catalog (e.g., from a recommendation).
 * Extracts essential + important fields in one focused call.
 * ~500 tokens output — cheap and fast.
 */
export const CATALOG_EXTRACT_TIER1_2_PROMPT = `You are a book metadata extraction system. Given a book title and author, search for and extract structured metadata about the book.

BOOK: "{title}" by {author}

Extract the following metadata. Be precise and use ONLY the allowed values where specified.

REQUIRED OUTPUT (JSON only, no other text):
{
  "title": "exact title",
  "author": "exact author name",
  "primary_genre": "single best-fit genre (e.g., Fantasy, Literary Fiction, Thriller, Romance, Science Fiction, Historical Fiction, Mystery, Horror, Contemporary, Memoir, Self-Help)",
  "fiction_nonfiction": "fiction" or "nonfiction",
  "description": "2-4 sentence book description/synopsis (no spoilers)",
  "themes": ["3-5 major abstract themes, e.g., identity, power, love, loss, redemption"],
  "pacing": "breakneck | fast | moderate | slow-burn | meditative | variable",
  "tone": ["2-3 tone descriptors, e.g., dark, humorous, philosophical, hopeful, suspenseful, melancholic, whimsical"],
  "mood_emotions": ["3-5 emotions the book evokes, e.g., tense, heartwarming, thought-provoking, devastating, exhilarating"],
  
  "subgenres": ["2-4 specific subgenres, e.g., Dark Academia, Cozy Mystery, Space Opera, Romantasy"],
  "tropes": ["3-8 narrative patterns, e.g., enemies-to-lovers, chosen one, heist, found family, unreliable narrator"],
  "characterization": "character-driven | plot-driven | idea-driven | balanced",
  "writing_style": ["2-3 style descriptors, e.g., literary, accessible, lyrical, sparse, dialogue-heavy, immersive, experimental"],
  "protagonist_types": ["1-3 protagonist descriptors, e.g., strong female lead, anti-hero, ensemble cast, reluctant hero"],
  "content_warnings": [{"category": "type", "intensity": "mild|moderate|graphic"}],
  "emotional_impact": "lighthearted | feel-good | bittersweet | emotionally-intense | devastating | thought-provoking",
  "setting": {
    "time_period": "e.g., contemporary, medieval, 1920s, far future",
    "location_type": "e.g., urban, rural, space, small town, multiple, secondary world",
    "real_or_fictional": "real | fictional | mixed",
    "importance": "backdrop | important | central-character"
  },
  "target_age_group": "children | middle-grade | young-adult | new-adult | adult",
  
  "relationship_dynamics": {
    "romantic": "brief description or null",
    "platonic": "brief description or null",
    "familial": "brief description or null",
    "rivalries": "brief description or null"
  },
  "reader_need": "what emotional need this book fills, e.g., Escapism, Comfort, Catharsis, Challenge, Inspiration",
  
  "confidence": 0.85
}

RULES:
- Use your knowledge and search results together. Do NOT refuse if search is incomplete.
- For content_warnings, only include warnings that are genuinely relevant (violence, sexual content, substance abuse, self-harm, death of child, etc.). Omit the array if none apply.
- confidence: 0.9+ if you know the book well, 0.7-0.9 if partially certain, below 0.7 if guessing.
- Output ONLY valid JSON. No markdown, no text before or after.`;


/**
 * TIER 3 ENRICHMENT PROMPT
 * Used for background enrichment of books already in the catalog.
 * Called asynchronously when the system has spare capacity.
 */
export const CATALOG_EXTRACT_TIER3_PROMPT = `You are a book metadata enrichment system. Given a book and its existing metadata, extract ADDITIONAL deep metadata.

BOOK: "{title}" by {author}
EXISTING DATA: {existing_json}

Extract these ADDITIONAL fields (do not repeat what's already known):

{
  "storyline_structure": ["linear | multiple-timelines | unreliable-narrator | frame-narrative | nonlinear | epistolary"],
  "character_development": "significant-transformation | gradual-growth | static-by-design | ensemble-varied",
  "relationship_focus": ["which relationships drive the narrative: romance, family, friendship, professional, mentor-mentee, rivals"],
  "representation": {
    "protagonist_identities": ["ONLY explicit identity markers from the text: race/ethnicity, LGBTQIA+, disability"],
    "diversity_notes": ["e.g., own voices, diverse cast, culturally specific"]
  },
  "ending_type": "happily-ever-after | happy-for-now | bittersweet | ambiguous | tragic | cliffhanger | open-ended",
  "best_read_when": ["situational recommendations: beach vacation, cozy day, can't sleep, need escapism, want to think, long flight"],
  "reading_difficulty": "easy-beach-read | accessible | moderate | challenging | very-demanding",
  "positive_content_notes": ["what readers SEEK: found family, healthy relationships, no sexual violence, body positivity, hopeful ending"],
  "comparable_books": ["3-5 books that fans of this book would also enjoy"],
  "series_name": "series name or null",
  "series_position": 1,
  "confidence": 0.8
}

Output ONLY valid JSON. No markdown, no text before or after.`;


/**
 * BATCH EXTRACTION PROMPT
 * Used during recommendation hydration to extract Tier 1+2 for multiple books at once.
 * More token-efficient than individual calls.
 */
export const CATALOG_BATCH_EXTRACT_PROMPT = `You are a book metadata extraction system. Extract structured metadata for each of the following books.

BOOKS TO PROCESS:
{books_list}

For EACH book, extract:
{
  "title": "exact title",
  "author": "exact author name",
  "primary_genre": "single genre",
  "fiction_nonfiction": "fiction|nonfiction",
  "description": "2-3 sentence synopsis",
  "themes": ["3-5 themes"],
  "pacing": "breakneck|fast|moderate|slow-burn|meditative|variable",
  "tone": ["2-3 descriptors"],
  "mood_emotions": ["3-5 emotions"],
  "subgenres": ["2-4 subgenres"],
  "tropes": ["3-8 tropes"],
  "characterization": "character-driven|plot-driven|idea-driven|balanced",
  "writing_style": ["2-3 styles"],
  "protagonist_types": ["1-3 types"],
  "content_warnings": [{"category": "type", "intensity": "mild|moderate|graphic"}],
  "emotional_impact": "lighthearted|feel-good|bittersweet|emotionally-intense|devastating|thought-provoking",
  "setting": {"time_period": "", "location_type": "", "real_or_fictional": "", "importance": ""},
  "target_age_group": "adult",
  "relationship_dynamics": {"romantic": "", "platonic": "", "familial": "", "rivalries": ""},
  "reader_need": "",
  "confidence": 0.85
}

OUTPUT FORMAT — Return a JSON array:
{
  "books": [
    { ...book1 metadata... },
    { ...book2 metadata... }
  ]
}

Output ONLY valid JSON. No markdown, no text before or after.`;
