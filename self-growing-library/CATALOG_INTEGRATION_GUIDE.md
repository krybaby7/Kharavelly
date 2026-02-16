# Self-Growing Library — Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTRY POINTS                              │
│  Recommendation Results │ User Search │ Library Add │ Feed Items │
└────────────┬────────────┴──────┬──────┴──────┬──────┴─────┬──────┘
             │                   │             │            │
             ▼                   ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      bookService.ts                              │
│  findBook() ──────────────► ensureInCatalog()                    │
│  hydrateBooksList() ──────► batchExtractAndStore()               │
│                              │                                   │
│  Google Books API ◄──────── external data (cover, rating, pages) │
│  Open Library API ◄──────── fallback covers                      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     catalogService.ts                             │
│                                                                  │
│  ensureInCatalog()                                               │
│    ├── Check session cache                                       │
│    ├── Check Supabase book_catalog                               │
│    ├── If missing: extractAndStore() ──► Perplexity API          │
│    └── If low-tier: queue for background enrichment              │
│                                                                  │
│  batchExtractAndStore()                                          │
│    ├── Filter already-cataloged books                            │
│    ├── Single Perplexity call for all new books                  │
│    └── Store all entries                                         │
│                                                                  │
│  processEnrichmentQueue()                                        │
│    ├── Pick Tier 1/2 entries                                     │
│    ├── Extract Tier 3 metadata via Perplexity                    │
│    └── Update entries                                            │
│                                                                  │
│  searchCatalog()                                                 │
│    └── Query by themes, tropes, mood, pacing, genre              │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase: book_catalog                         │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Tier 1   │  │ Tier 2   │  │ Tier 3   │  │ Tier 4   │        │
│  │ genre    │  │ tropes   │  │ structure│  │ awards   │        │
│  │ themes   │  │ style    │  │ ending   │  │ isbn     │        │
│  │ pacing   │  │ warnings │  │ reps     │  │ series   │        │
│  │ tone     │  │ setting  │  │ context  │  │ comps    │        │
│  │ mood     │  │ impact   │  │ difficulty│ │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  + cover_image, rating, ratings_count (from Google Books)        │
│  + embedding_text (for future vector search)                     │
│  + times_recommended, times_saved (usage analytics)              │
└─────────────────────────────────────────────────────────────────┘
```

## Files Created

| File | Purpose |
|------|---------|
| `src/types/catalog.ts` | Full TypeScript schema for BookCatalogEntry with all 4 tiers |
| `src/services/catalog.ts` | Core catalog service (ensure, extract, batch, enrich, search) |
| `src/services/catalogPrompts.ts` | Focused Perplexity prompts for metadata extraction |
| `src/services/bookService.updated.ts` | Updated bookService with catalog integration |
| `src/services/library.updated.ts` | Updated libraryService that syncs with catalog |
| `supabase/migrations/001_book_catalog.sql` | DB migration for book_catalog + reader_profiles tables |
| `supabase/migrations/002_catalog_rpc.sql` | Helper function for atomic counter increments |

## How to Integrate

### Step 1: Run the SQL migrations
In your Supabase SQL Editor, run:
1. `001_book_catalog.sql` — creates the tables and indexes
2. `002_catalog_rpc.sql` — creates the counter increment function

### Step 2: Replace the service files
```bash
# Replace bookService
cp src/services/bookService.updated.ts src/services/bookService.ts

# Replace library service
cp src/services/library.updated.ts src/services/library.ts
```

### Step 3: Add the new files
The following files are net-new and just need to be placed:
- `src/types/catalog.ts`
- `src/services/catalog.ts`
- `src/services/catalogPrompts.ts`

### Step 4: No UI changes required (yet)
The catalog operates transparently behind the existing UI. The `Book` type's
`metadata` field now contains enriched catalog data that screens can optionally display.

## Data Flow Per Feature

### Instant Match / Context Chat → RecResults
```
User submits books → callPerplexity() → raw recommendations
  → bookService.hydrateBooksList()
    → catalogService.batchExtractAndStore()  ← METADATA EXTRACTED HERE
    → googleBooksService.searchBook()         ← COVERS + RATINGS HERE
    → merge into Book objects with full metadata
```

### Deep Dive Interview → RecResults
```
Interview completes → callPerplexity(sonar-deep-research)
  → bookService.hydrateBooksList()            ← SAME PIPELINE
```

### User adds book to Library
```
BookDetail → "Add to TBR" → libraryService.addBook()
  → save to user's books table
  → catalogService.ensureInCatalog()          ← REGISTERED IN CATALOG
  → catalogService.incrementSaved()
```

### Daily Feed refresh
```
feedService.generateDailyFeed()
  → bookService.hydrateBooksList()            ← SAME PIPELINE
```

## Cost Impact

The batch extraction approach is designed to minimize API costs:

| Operation | Calls | Est. Cost |
|-----------|-------|-----------|
| Batch extract 10 books (Tier 1+2) | 1 call | ~$0.01-0.03 |
| Individual Tier 3 enrichment | 1 call per book | ~$0.005 |
| Background enrichment (3/session) | 3 calls | ~$0.015 |

Compare to the current approach where each recommendation + hydration requires
multiple separate lookups. The batch prompt is more token-efficient.

## Future: Catalog-First Recommendations

Once your catalog reaches ~500+ books, you can add a "catalog-first" recommendation path:

```typescript
// In a future version of buildRecommendationPrompt:
const catalogMatches = await catalogService.searchCatalog({
    themes: userProfile.preferred_themes,
    mood: userProfile.preferred_mood,
    pacing: userProfile.preferred_pacing,
});

// If catalog has enough matches, skip Perplexity entirely
if (catalogMatches.length >= 10) {
    return catalogMatches; // Free, instant recommendations!
}

// Otherwise, use Perplexity but pass catalog context
const prompt = `...existing books in our library that might match:
${catalogMatches.map(b => b.title).join(', ')}
Find ADDITIONAL books not in this list...`;
```

This creates the virtuous cycle: more users → more books cataloged → better free recommendations → less API spend.

## Future: Vector Search

The `embedding_text` field is pre-built for vector search. When ready:

1. Enable `pgvector` extension in Supabase
2. Add an embedding column: `ALTER TABLE book_catalog ADD COLUMN embedding vector(1536)`
3. Generate embeddings from `embedding_text` using OpenAI or similar
4. Enable natural-language queries: "a book about grief that's somehow funny"

The embedding text concatenates: title, description, themes, tone, mood, tropes,
subgenres, pacing, protagonist types, writing style, relationship focus, and
situational context — giving the embedding maximum semantic richness.
