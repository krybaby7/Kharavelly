// ============================================================
// Catalog Service — The Self-Growing Library
// ============================================================
// Every book that touches the app flows through here.
// It checks the catalog, enriches missing entries, and stores them.
//
// Architecture:
//   1. Book appears (recommendation, search, user add)
//   2. catalogService.ensureInCatalog(title, author)
//   3. If missing → extract metadata via Perplexity → store
//   4. If present but low-tier → queue for background enrichment
//   5. Return enriched BookCatalogEntry
// ============================================================

import { supabase } from './supabase';
import { Alert } from 'react-native'; // DEBUG
import { callPerplexity, calculateCost } from './perplexity';
import { parseJson } from '../utils/helpers';
import { CONFIG } from '../config';
import {
    BookCatalogEntry,
    makeCatalogKey,
    createMinimalCatalogEntry,
    buildEmbeddingText,
} from '../types/catalog';
import {
    CATALOG_EXTRACT_TIER1_2_PROMPT,
    CATALOG_EXTRACT_TIER3_PROMPT,
    CATALOG_BATCH_EXTRACT_PROMPT,
} from './catalogPrompts';

// In-memory session cache to avoid redundant DB lookups
const SESSION_CACHE: Record<string, BookCatalogEntry> = {};

// Queue for background enrichment (title|author keys)
const ENRICHMENT_QUEUE: Set<string> = new Set();

export const catalogService = {

    // -------------------------------------------------------
    // CORE: Ensure a book exists in the catalog
    // -------------------------------------------------------
    /**
     * The main entry point. Call this for any book that appears in the app.
     * Returns the catalog entry (existing or newly created).
     *
     * @param title - Book title
     * @param author - Book author
     * @param partialData - Any data we already have (from recommendation, Google Books, etc.)
     * @param skipEnrichment - If true, store what we have without calling Perplexity
     */
    async ensureInCatalog(
        title: string,
        author: string,
        partialData?: Partial<BookCatalogEntry>,
        skipEnrichment: boolean = false
    ): Promise<BookCatalogEntry> {
        const key = makeCatalogKey(title, author);

        // 1. Check session cache
        if (SESSION_CACHE[key]) {
            return SESSION_CACHE[key];
        }

        // 2. Check Supabase
        const existing = await this.getFromCatalog(key);
        if (existing) {
            // Merge any new partial data (e.g., updated cover from Google Books)
            if (partialData) {
                const merged = await this.mergeCatalogData(existing, partialData);
                SESSION_CACHE[key] = merged;
                return merged;
            }
            SESSION_CACHE[key] = existing;

            // Queue for background enrichment if still Tier 1
            if (existing.enrichment_tier < 2) {
                ENRICHMENT_QUEUE.add(key);
            }

            return existing;
        }

        // 3. Not in catalog — create entry
        let entry: BookCatalogEntry;

        if (!skipEnrichment) {
            // Extract Tier 1+2 metadata via Perplexity
            entry = await this.extractAndStore(title, author, partialData);
        } else {
            // Store what we have without enrichment
            entry = createMinimalCatalogEntry({
                title,
                author,
                ...partialData,
                extraction_source: 'hydration-only',
                enrichment_tier: 1,
            });
            await this.saveToCatalog(entry);
        }

        SESSION_CACHE[key] = entry;
        return entry;
    },

    // -------------------------------------------------------
    // EXTRACT: Call Perplexity for Tier 1+2 metadata
    // -------------------------------------------------------
    async extractAndStore(
        title: string,
        author: string,
        partialData?: Partial<BookCatalogEntry>
    ): Promise<BookCatalogEntry> {
        const prompt = CATALOG_EXTRACT_TIER1_2_PROMPT
            .replace('{title}', title)
            .replace('{author}', author);

        const result = await callPerplexity(prompt, CONFIG.PERPLEXITY_MODEL, CONFIG.PERPLEXITY_API_KEY);

        if (result.success && result.content) {
            try {
                const extracted = parseJson(result.content);
                const confidence = extracted.confidence || 0.7;

                const entry = createMinimalCatalogEntry({
                    ...extracted,
                    // Override with our known data
                    title: title,
                    author: author,
                    // Merge in any external data (covers, ratings from Google Books)
                    cover_image: partialData?.cover_image || extracted.cover_image || null,
                    // System fields
                    enrichment_tier: 2 as const,
                    extraction_source: 'perplexity-enrichment',
                    confidence_score: confidence,
                    needs_review: confidence < 0.7,
                    // Spread any partial data that wasn't in the extraction
                    ...partialData,
                    // Ensure extracted data takes priority for metadata fields
                    themes: extracted.themes || partialData?.themes || [],
                    tropes: extracted.tropes || partialData?.tropes || [],
                    tone: extracted.tone || partialData?.tone || [],
                    mood_emotions: extracted.mood_emotions || partialData?.mood_emotions || [],
                    description: extracted.description || partialData?.description || '',
                    primary_genre: extracted.primary_genre || partialData?.primary_genre || 'Unknown',
                });

                // Build embedding text
                entry.embedding_text = buildEmbeddingText(entry);

                if (result.usage) {
                    const cost = calculateCost(CONFIG.PERPLEXITY_MODEL, result.usage);
                    console.log(`[Catalog] Extraction cost for "${title}": $${cost.toFixed(4)}`);
                }

                await this.saveToCatalog(entry);
                return entry;

            } catch (e) {
                console.error(`[Catalog] Failed to parse extraction for "${title}":`, e);
            }
        }

        // Fallback: store minimal entry
        const fallback = createMinimalCatalogEntry({
            title,
            author,
            ...partialData,
            extraction_source: 'extraction-failed',
            enrichment_tier: 1 as const,
            confidence_score: 0.3,
            needs_review: true,
        });
        await this.saveToCatalog(fallback);
        return fallback;
    },

    // -------------------------------------------------------
    // BATCH EXTRACT: Process multiple books in one API call
    // -------------------------------------------------------
    /**
     * More efficient than individual calls when processing recommendation results.
     * Extracts Tier 1+2 for all books in a single Perplexity call.
     */
    async batchExtractAndStore(
        books: Array<{ title: string; author: string;[key: string]: any }>
    ): Promise<BookCatalogEntry[]> {
        // Filter out books already in catalog
        const toProcess: typeof books = [];
        const existing: BookCatalogEntry[] = [];

        for (const book of books) {
            const key = makeCatalogKey(book.title, book.author);
            const cached = SESSION_CACHE[key] || await this.getFromCatalog(key);
            if (cached) {
                existing.push(cached);
                SESSION_CACHE[key] = cached;
            } else {
                toProcess.push(book);
            }
        }

        if (toProcess.length === 0) {
            console.log('[Catalog] All books already in catalog');
            return existing;
        }

        console.log(`[Catalog] Batch extracting ${toProcess.length} new books...`);

        // Build the books list for the prompt
        const booksList = toProcess
            .map((b, i) => `${i + 1}. "${b.title}" by ${b.author}`)
            .join('\n');

        const prompt = CATALOG_BATCH_EXTRACT_PROMPT.replace('{books_list}', booksList);

        const result = await callPerplexity(prompt, CONFIG.PERPLEXITY_MODEL, CONFIG.PERPLEXITY_API_KEY);

        const newEntries: BookCatalogEntry[] = [];

        if (result.success && result.content) {
            try {
                const parsed = parseJson(result.content);
                const extractedBooks = parsed.books || parsed;

                if (Array.isArray(extractedBooks)) {
                    for (let i = 0; i < extractedBooks.length; i++) {
                        const extracted = extractedBooks[i];
                        // Match back to original book data for covers/ratings
                        const original = toProcess[i] || {};

                        const entry = createMinimalCatalogEntry({
                            ...extracted,
                            title: extracted.title || original.title,
                            author: extracted.author || original.author,
                            cover_image: original.coverImage || original.cover_image || null,
                            enrichment_tier: 2 as const,
                            extraction_source: 'perplexity-batch',
                            confidence_score: extracted.confidence || 0.7,
                            needs_review: (extracted.confidence || 0.7) < 0.7,
                        });
                        entry.embedding_text = buildEmbeddingText(entry);

                        await this.saveToCatalog(entry);
                        SESSION_CACHE[entry.catalog_key] = entry;
                        newEntries.push(entry);
                    }
                }

                if (result.usage) {
                    const cost = calculateCost(CONFIG.PERPLEXITY_MODEL, result.usage);
                    console.log(`[Catalog] Batch extraction cost: $${cost.toFixed(4)} for ${toProcess.length} books`);
                }
            } catch (e) {
                console.error('[Catalog] Batch extraction parse error:', e);
                // Fall back to storing minimal entries
                for (const book of toProcess) {
                    const entry = createMinimalCatalogEntry({
                        title: book.title,
                        author: book.author,
                        cover_image: book.coverImage || null,
                        extraction_source: 'batch-extraction-failed',
                        enrichment_tier: 1 as const,
                        confidence_score: 0.3,
                        needs_review: true,
                    });
                    await this.saveToCatalog(entry);
                    newEntries.push(entry);
                }
            }
        }

        return [...existing, ...newEntries];
    },

    // -------------------------------------------------------
    // BACKGROUND ENRICHMENT: Upgrade Tier 1/2 → Tier 3
    // -------------------------------------------------------
    /**
     * Call this during idle time or on a schedule.
     * Processes the enrichment queue to upgrade books to Tier 3.
     */
    async processEnrichmentQueue(maxItems: number = 3): Promise<void> {
        const keys = Array.from(ENRICHMENT_QUEUE).slice(0, maxItems);

        for (const key of keys) {
            try {
                const entry = await this.getFromCatalog(key);
                if (!entry || entry.enrichment_tier >= 3) {
                    ENRICHMENT_QUEUE.delete(key);
                    continue;
                }

                console.log(`[Catalog] Enriching to Tier 3: "${entry.title}"`);

                const existingJson = JSON.stringify({
                    title: entry.title,
                    author: entry.author,
                    primary_genre: entry.primary_genre,
                    themes: entry.themes,
                    tropes: entry.tropes,
                    pacing: entry.pacing,
                    tone: entry.tone,
                });

                const prompt = CATALOG_EXTRACT_TIER3_PROMPT
                    .replace('{title}', entry.title)
                    .replace('{author}', entry.author)
                    .replace('{existing_json}', existingJson);

                const result = await callPerplexity(prompt, CONFIG.PERPLEXITY_MODEL, CONFIG.PERPLEXITY_API_KEY);

                if (result.success && result.content) {
                    const tier3Data = parseJson(result.content);

                    const updated: Partial<BookCatalogEntry> = {
                        ...tier3Data,
                        enrichment_tier: 3 as const,
                        last_enriched_at: new Date().toISOString(),
                    };

                    await this.updateCatalogEntry(key, updated);

                    // Update cache
                    if (SESSION_CACHE[key]) {
                        SESSION_CACHE[key] = { ...SESSION_CACHE[key], ...updated };
                        SESSION_CACHE[key].embedding_text = buildEmbeddingText(SESSION_CACHE[key]);
                    }
                }

                ENRICHMENT_QUEUE.delete(key);
            } catch (e) {
                console.error(`[Catalog] Enrichment failed for ${key}:`, e);
                ENRICHMENT_QUEUE.delete(key); // Don't retry indefinitely
            }
        }
    },

    // -------------------------------------------------------
    // DATABASE OPERATIONS
    // -------------------------------------------------------

    async getFromCatalog(catalogKey: string): Promise<BookCatalogEntry | null> {
        const { data, error } = await supabase
            .from('book_catalog')
            .select('*')
            .eq('catalog_key', catalogKey)
            .single();

        if (error || !data) return null;
        return data as BookCatalogEntry;
    },

    async saveToCatalog(entry: BookCatalogEntry): Promise<void> {
        const { error } = await supabase
            .from('book_catalog')
            .upsert(
                this.cleanForDatabase({
                    ...entry,
                    // Ensure key is set
                    catalog_key: entry.catalog_key || makeCatalogKey(entry.title, entry.author),
                }),
                { onConflict: 'catalog_key' }
            );

        if (error) {
            console.error(`[Catalog] Failed to save "${entry.title}":`, error);
            // DEBUG: Alert user
            Alert.alert("Catalog Error", `Failed to save ${entry.title}: ${error.message}`);
        } else {
            console.log(`[Catalog] Saved: "${entry.title}" (Tier ${entry.enrichment_tier})`);
            // Optional: Alert success for debugging? No, too annoying.
        }
    },

    async updateCatalogEntry(catalogKey: string, updates: Partial<BookCatalogEntry>): Promise<void> {
        const { error } = await supabase
            .from('book_catalog')
            .update(this.cleanForDatabase(updates))
            .eq('catalog_key', catalogKey);

        if (error) {
            console.error(`[Catalog] Failed to update ${catalogKey}:`, error);
        }
    },

    /**
     * Merge new data into existing catalog entry.
     * Only overwrites null/empty fields — never downgrades existing data.
     */
    async mergeCatalogData(
        existing: BookCatalogEntry,
        newData: Partial<BookCatalogEntry>
    ): Promise<BookCatalogEntry> {
        const updates: Partial<BookCatalogEntry> = {};
        let hasUpdates = false;

        // Only fill in gaps, don't overwrite
        if (!existing.cover_image && newData.cover_image) {
            updates.cover_image = newData.cover_image;
            hasUpdates = true;
        }
        if (!existing.description && newData.description) {
            updates.description = newData.description;
            hasUpdates = true;
        }
        if ((!existing.rating || existing.rating === 0) && newData.rating) {
            updates.rating = newData.rating as any;
            hasUpdates = true;
        }
        if ((!existing.ratings_count || existing.ratings_count === 0) && newData.ratings_count) {
            updates.ratings_count = newData.ratings_count;
            hasUpdates = true;
        }
        if (!existing.page_count && newData.page_count) {
            updates.page_count = newData.page_count;
            hasUpdates = true;
        }

        if (hasUpdates) {
            await this.updateCatalogEntry(existing.catalog_key, updates);
        }

        return { ...existing, ...updates };
    },

    // -------------------------------------------------------
    // INCREMENT COUNTERS
    // -------------------------------------------------------

    async incrementRecommended(catalogKey: string): Promise<void> {
        // Use Supabase RPC or raw SQL for atomic increment
        const { error } = await supabase.rpc('increment_catalog_counter', {
            p_catalog_key: catalogKey,
            p_field: 'times_recommended'
        });
        if (error) {
            // Fallback: non-atomic update
            const entry = await this.getFromCatalog(catalogKey);
            if (entry) {
                await this.updateCatalogEntry(catalogKey, {
                    times_recommended: (entry.times_recommended || 0) + 1
                });
            }
        }
    },

    async incrementSaved(catalogKey: string): Promise<void> {
        const { error } = await supabase.rpc('increment_catalog_counter', {
            p_catalog_key: catalogKey,
            p_field: 'times_saved'
        });
        if (error) {
            const entry = await this.getFromCatalog(catalogKey);
            if (entry) {
                await this.updateCatalogEntry(catalogKey, {
                    times_saved: (entry.times_saved || 0) + 1
                });
            }
        }
    },

    // -------------------------------------------------------
    // SEARCH: Query the catalog for recommendations
    // -------------------------------------------------------

    /**
     * Find books in the catalog that match given criteria.
     * This enables "catalog-first" recommendations that skip Perplexity entirely.
     */
    async searchCatalog(filters: {
        themes?: string[];
        tropes?: string[];
        mood?: string[];
        pacing?: string;
        genre?: string;
        limit?: number;
    }): Promise<BookCatalogEntry[]> {
        let query = supabase
            .from('book_catalog')
            .select('*')
            .gte('confidence_score', 0.5); // only reasonably confident entries

        if (filters.genre) {
            query = query.eq('primary_genre', filters.genre);
        }
        if (filters.pacing) {
            query = query.eq('pacing', filters.pacing);
        }
        if (filters.themes && filters.themes.length > 0) {
            query = query.overlaps('themes', filters.themes);
        }
        if (filters.tropes && filters.tropes.length > 0) {
            query = query.overlaps('tropes', filters.tropes);
        }
        if (filters.mood && filters.mood.length > 0) {
            query = query.overlaps('mood_emotions', filters.mood);
        }

        query = query.limit(filters.limit || 20);

        const { data, error } = await query;

        if (error) {
            console.error('[Catalog] Search failed:', error);
            return [];
        }

        return (data || []) as BookCatalogEntry[];
    },

    // -------------------------------------------------------
    // STATS
    // -------------------------------------------------------

    async getCatalogStats(): Promise<{ total: number; tier1: number; tier2: number; tier3: number; tier4: number }> {
        const { data, error } = await supabase
            .from('book_catalog')
            .select('enrichment_tier');

        if (error || !data) return { total: 0, tier1: 0, tier2: 0, tier3: 0, tier4: 0 };

        return {
            total: data.length,
            tier1: data.filter(d => d.enrichment_tier === 1).length,
            tier2: data.filter(d => d.enrichment_tier === 2).length,
            tier3: data.filter(d => d.enrichment_tier === 3).length,
            tier4: data.filter(d => d.enrichment_tier === 4).length,
        };
    },

    // -------------------------------------------------------
    // CACHE MANAGEMENT
    // -------------------------------------------------------

    clearSessionCache(): void {
        Object.keys(SESSION_CACHE).forEach(k => delete SESSION_CACHE[k]);
    },

    /**
     * Helper to strip fields that are not in the Supabase schema
     * to prevent "Could not find column" errors.
     */
    cleanForDatabase(entry: Partial<BookCatalogEntry>): Partial<BookCatalogEntry> {
        // Whitelist of columns that actually exist in 'book_catalog'
        // based on user reports and known schema.
        // Needs adjustment if schema changes.
        const allowedKeys = [
            'catalog_key',
            'title',
            'author',
            'primary_genre',
            'fiction_nonfiction',
            'description',
            'themes',
            'tropes', // Assuming this exists
            'tone',
            'mood_emotions',
            'pacing',
            // Tier 2 - check if these exist? Users said character_archetypes failed.
            // safely include only what we know usually exists or is essential.
            // 'character_archetypes', // FAILED
            // 'content_warnings', // Might fail?
            // 'perfect_for', // Might fail?
            'cover_image',
            'rating',
            'ratings_count',
            'rating_source',
            'enrichment_tier',
            'extraction_source',
            'confidence_score',
            'needs_review',
            'embedding_text',
            'times_recommended',
            'times_saved',
            'created_at',
            'updated_at',
            'last_enriched_at'
        ];

        const cleaned: any = {};
        for (const key of Object.keys(entry)) {
            if (allowedKeys.includes(key)) {
                cleaned[key] = (entry as any)[key];
            }
        }
        return cleaned;
    },
};
