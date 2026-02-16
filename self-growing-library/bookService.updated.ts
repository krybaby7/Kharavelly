// ============================================================
// Book Service — Updated with Catalog Integration
// ============================================================
// Every book that flows through this service is automatically
// registered in the catalog. The catalog handles enrichment.
//
// Flow:
//   1. findBook() → search Google/OL for cover+rating → catalog.ensureInCatalog()
//   2. hydrateBooksList() → batch process recommendations → catalog.batchExtractAndStore()
//   3. Return enriched book with both external data AND catalog metadata
// ============================================================

import { googleBooksService } from './googleBooks';
import { openLibraryService } from './openLibrary';
import { catalogService } from './catalog';
import { Book } from '../types';
import { BookCatalogEntry, makeCatalogKey } from '../types/catalog';

// Simple in-memory cache to prevent re-fetching same queries in session
const MEMORY_CACHE: Record<string, Book> = {};

/**
 * Merge catalog metadata into a Book object for display.
 * This bridges the catalog schema with the existing UI types.
 */
function mergeWithCatalog(book: Partial<Book>, catalog: BookCatalogEntry): Book {
    return {
        title: book.title || catalog.title,
        author: book.author || catalog.author,
        description: book.description || catalog.description || '',
        coverImage: book.coverImage || catalog.cover_image || undefined,
        status: book.status || 'recommended',
        tropes: catalog.tropes || book.tropes || [],
        themes: catalog.themes || book.themes || [],
        microthemes: catalog.mood_emotions || book.microthemes || [],     // map mood_emotions → microthemes for UI
        relationship_dynamics: catalog.relationship_dynamics as any || book.relationship_dynamics || {},
        pacing: catalog.pacing || book.pacing,
        reader_need: catalog.reader_need || book.reader_need,
        rating: book.rating || catalog.rating as number || 0,
        ratings_count: book.ratings_count || catalog.ratings_count || 0,
        rating_source: book.rating_source || catalog.rating_source,
        total_pages: book.total_pages || catalog.page_count || undefined,
        match_reasoning: book.match_reasoning,
        confidence_score: book.confidence_score,
        progress: book.progress,

        // NEW: Expose catalog-enriched fields that the UI can use
        metadata: {
            catalog_key: catalog.catalog_key,
            primary_genre: catalog.primary_genre,
            fiction_nonfiction: catalog.fiction_nonfiction,
            tone: catalog.tone,
            mood_emotions: catalog.mood_emotions,
            subgenres: catalog.subgenres,
            characterization: catalog.characterization,
            writing_style: catalog.writing_style,
            protagonist_types: catalog.protagonist_types,
            content_warnings: catalog.content_warnings,
            emotional_impact: catalog.emotional_impact,
            setting: catalog.setting,
            target_age_group: catalog.target_age_group,
            enrichment_tier: catalog.enrichment_tier,
            // Tier 3 fields (may be undefined)
            storyline_structure: catalog.storyline_structure,
            ending_type: catalog.ending_type,
            best_read_when: catalog.best_read_when,
            reading_difficulty: catalog.reading_difficulty,
            relationship_focus: catalog.relationship_focus,
            positive_content_notes: catalog.positive_content_notes,
            comparable_books: catalog.comparable_books,
        },
    };
}

export const bookService = {
    /**
     * Search for a book using Open Library first, then Google Books as fallback.
     * Automatically registers the book in the catalog.
     */
    findBook: async (title: string, author?: string): Promise<Book> => {
        const cacheKey = `${title.toLowerCase().trim()}|${(author || '').toLowerCase().trim()}`;
        if (MEMORY_CACHE[cacheKey]) {
            console.log(`[BookService] Cache hit for: ${title}`);
            return MEMORY_CACHE[cacheKey];
        }

        // 1. Get external data (cover, rating, description, page count)
        let externalData: any = null;

        // Try Open Library first
        const olBook = await openLibraryService.searchBook(title, author);

        // Try Google Books (usually has better covers + ratings)
        const googleBook = await googleBooksService.searchBook(title, author || '');

        // Merge external data, preferring Google for covers/ratings
        externalData = {
            title: googleBook?.title || olBook?.title || title,
            author: googleBook?.author || olBook?.author || author || 'Unknown',
            description: googleBook?.description || '',
            coverImage: googleBook?.coverImage || olBook?.coverImage || null,
            rating: googleBook?.rating || 0,
            ratings_count: googleBook?.ratings_count || 0,
            rating_source: googleBook?.rating_source || undefined,
            total_pages: googleBook?.total_pages || undefined,
        };

        // 2. Register in catalog (this enriches with metadata if not already there)
        //    skipEnrichment=true because we'll batch-enrich later during hydration
        const catalogEntry = await catalogService.ensureInCatalog(
            externalData.title,
            externalData.author,
            {
                cover_image: externalData.coverImage,
                description: externalData.description,
                rating: externalData.rating,
                ratings_count: externalData.ratings_count,
                rating_source: externalData.rating_source,
                page_count: externalData.total_pages,
            },
            true // skipEnrichment — we're just registering with external data
        );

        // 3. Merge catalog metadata with external data for display
        const book = mergeWithCatalog(externalData, catalogEntry);

        MEMORY_CACHE[cacheKey] = book;
        return book;
    },

    /**
     * Bulk verify a list of title strings into Book objects.
     */
    verifyBooks: async (titles: string[]): Promise<Book[]> => {
        const promises = titles.map(t => bookService.findBook(t));
        return Promise.all(promises);
    },

    /**
     * Hydrate a list of raw recommendation results with covers, ratings, AND catalog metadata.
     *
     * This is the main integration point. It:
     * 1. Batch-extracts metadata for all new books via one Perplexity call
     * 2. Fetches covers/ratings from Google Books
     * 3. Merges everything together
     */
    hydrateBooksList: async (
        books: any[],
        onProgress?: (status: string) => void
    ): Promise<Book[]> => {
        console.log(`[BookService] Hydrating ${books.length} books...`);

        // Step 1: Batch extract catalog metadata for all books
        if (onProgress) onProgress(`Analyzing ${books.length} books...`);

        const catalogEntries = await catalogService.batchExtractAndStore(
            books.map(b => ({ title: b.title, author: b.author || 'Unknown' }))
        );

        // Build a lookup map
        const catalogMap: Record<string, BookCatalogEntry> = {};
        for (const entry of catalogEntries) {
            catalogMap[entry.catalog_key] = entry;
        }

        // Step 2: Fetch covers/ratings from Google Books in batches
        const hydratedBooks: Book[] = [];
        const BATCH_SIZE = 5;
        const total = books.length;

        for (let i = 0; i < books.length; i += BATCH_SIZE) {
            const chunk = books.slice(i, i + BATCH_SIZE);

            if (onProgress) {
                onProgress(`Fetching covers for ${Math.min(i + BATCH_SIZE, total)}/${total} books...`);
            }

            const chunkPromises = chunk.map(async (book: any) => {
                try {
                    const key = makeCatalogKey(book.title, book.author || 'Unknown');
                    const catalogEntry = catalogMap[key];

                    // Fetch external data (cover, rating)
                    let coverImage = book.coverImage || catalogEntry?.cover_image || null;
                    let rating = book.rating || 0;
                    let ratingsCount = book.ratings_count || 0;
                    let ratingSource = book.rating_source;
                    let totalPages = book.total_pages;

                    // Only call Google Books if we're missing cover
                    if (!coverImage) {
                        const googleData = await googleBooksService.searchBook(
                            book.title, book.author || ''
                        );
                        if (googleData) {
                            coverImage = googleData.coverImage;
                            rating = googleData.rating || rating;
                            ratingsCount = googleData.ratings_count || ratingsCount;
                            ratingSource = googleData.rating_source || ratingSource;
                            totalPages = googleData.total_pages || totalPages;
                        }
                    }

                    // Update catalog with external data
                    if (catalogEntry) {
                        await catalogService.mergeCatalogData(catalogEntry, {
                            cover_image: coverImage,
                            rating: rating as any,
                            ratings_count: ratingsCount,
                            rating_source: ratingSource,
                            page_count: totalPages,
                        });
                    }

                    // Merge everything
                    const mergedBook = catalogEntry
                        ? mergeWithCatalog({
                            ...book,
                            coverImage,
                            rating,
                            ratings_count: ratingsCount,
                            rating_source: ratingSource,
                            total_pages: totalPages,
                        }, catalogEntry)
                        : {
                            ...book,
                            coverImage,
                            rating,
                            ratings_count: ratingsCount,
                            rating_source: ratingSource,
                            total_pages: totalPages,
                            tropes: book.tropes || [],
                            themes: book.themes || [],
                            microthemes: book.microthemes || [],
                            relationship_dynamics: book.relationship_dynamics || {},
                            status: book.status || 'recommended',
                        };

                    // Track recommendation count
                    if (catalogEntry) {
                        catalogService.incrementRecommended(catalogEntry.catalog_key);
                    }

                    return mergedBook;
                } catch (err) {
                    console.error(`[BookService] Failed to hydrate: ${book.title}`, err);
                    return {
                        ...book,
                        tropes: book.tropes || [],
                        themes: book.themes || [],
                        microthemes: book.microthemes || [],
                        relationship_dynamics: book.relationship_dynamics || {},
                        status: book.status || 'recommended',
                    };
                }
            });

            const batchResults = await Promise.all(chunkPromises);
            hydratedBooks.push(...batchResults);

            // Small delay between batches
            if (i + BATCH_SIZE < books.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (onProgress) onProgress('Finalizing recommendations...');

        // Step 3: Trigger background enrichment for Tier 1 entries
        // (Non-blocking — runs in background)
        catalogService.processEnrichmentQueue(3).catch(e =>
            console.error('[BookService] Background enrichment error:', e)
        );

        return hydratedBooks;
    },
};
