import { googleBooksService } from './googleBooks';
import { openLibraryService } from './openLibrary';
import { catalogService } from './catalog';
import { Book } from '../types';
import { BookCatalogEntry, makeCatalogKey } from '../types/catalog';

// Simple in-memory cache to prevent re-fetching same queries in session
const MEMORY_CACHE: Record<string, Book> = {};

/**
 * Merge catalog metadata into a Book object for display.
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
        microthemes: book.microthemes || [],
        mood: catalog.mood_emotions || book.mood || [],
        character_archetypes: catalog.character_archetypes || book.character_archetypes || [],
        content_warnings: catalog.content_warnings ? catalog.content_warnings.map(w => w.category) : (book.content_warnings || []),
        perfect_for: catalog.perfect_for || book.perfect_for,
        quote: catalog.memorable_quote || book.quote,
        pacing: catalog.pacing || book.pacing,
        reader_need: catalog.reader_need || book.reader_need,
        rating: book.rating || catalog.rating as number || 0,
        ratings_count: book.ratings_count || catalog.ratings_count || 0,
        rating_source: book.rating_source || catalog.rating_source,
        total_pages: book.total_pages || catalog.page_count || undefined,
        match_reasoning: book.match_reasoning,
        confidence_score: book.confidence_score,
        progress: book.progress,
        metadata: {
            catalog_key: catalog.catalog_key,
            primary_genre: catalog.primary_genre,
            fiction_nonfiction: catalog.fiction_nonfiction,
            tone: catalog.tone,
            mood_emotions: catalog.mood_emotions,
            subgenres: catalog.subgenres,
            characterization: catalog.characterization,
            writing_style: catalog.writing_style,
            character_archetypes: catalog.character_archetypes,
            content_warnings: catalog.content_warnings,
            emotional_impact: catalog.emotional_impact,
            setting: catalog.setting,
            target_age_group: catalog.target_age_group,
            enrichment_tier: catalog.enrichment_tier,
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

/**
 * Try to fetch a rating from Google Books first, then Open Library as fallback.
 * Returns the rating data or null if neither source has it.
 */
async function fetchRatingFromSources(
    title: string,
    author: string
): Promise<{ rating: number; ratings_count: number; rating_source: string } | null> {
    // 1. Try Open Library (has community ratings via reading logs)
    const olRating = await openLibraryService.fetchRating(title, author);
    if (olRating && olRating.rating > 0) {
        console.log(`[BookService] Rating from Open Library for "${title}": ${olRating.rating}`);
        return olRating;
    }

    console.log(`[BookService] No rating found from any source for "${title}"`);
    return null;
}

export const bookService = {
    /**
     * Search for a book using Open Library first, then Google Books as fallback.
     */
    findBook: async (title: string): Promise<Book> => {
        const cacheKey = title.toLowerCase().trim();
        if (MEMORY_CACHE[cacheKey]) {
            console.log(`[BookService] Cache hit for: ${title}`);
            return MEMORY_CACHE[cacheKey];
        }

        // 1. Try Open Library
        let book = await openLibraryService.searchBook(title);

        // 2. If no book found OR missing cover/rating -> try Google Books
        if (!book || !book.coverImage || !book.rating || book.rating === 0) {
            console.log(`[BookService] OpenLibrary incomplete for "${title}" (cover=${!!book?.coverImage}, rating=${book?.rating || 0}). Trying Google...`);
            const googleBook = await googleBooksService.searchBook(title, '');

            if (googleBook) {
                if (book) {
                    // Merge: prefer whichever source has the data
                    book = {
                        ...book,
                        coverImage: book.coverImage || googleBook.coverImage,
                        rating: (book.rating && book.rating > 0) ? book.rating : googleBook.rating,
                        ratings_count: (book.ratings_count && book.ratings_count > 0) ? book.ratings_count : googleBook.ratings_count,
                        rating_source: book.rating_source || googleBook.rating_source,
                        description: (book.description && book.description.length > 50) ? book.description : googleBook.description,
                        total_pages: book.total_pages || googleBook.total_pages,
                        tropes: book.tropes?.length ? book.tropes : googleBook.tropes,
                        themes: book.themes?.length ? book.themes : googleBook.themes,
                    };
                } else {
                    book = {
                        ...googleBook,
                        status: 'read',
                        tropes: googleBook.tropes || [],
                    } as Book;
                }
            }
        }

        // 3. If still no rating, try dedicated rating fetch from Open Library
        if (book && (!book.rating || book.rating === 0)) {
            console.log(`[BookService] Still no rating for "${title}". Fetching from Open Library...`);
            const ratingData = await fetchRatingFromSources(title, book.author || '');
            if (ratingData) {
                book.rating = ratingData.rating;
                book.ratings_count = ratingData.ratings_count;
                book.rating_source = ratingData.rating_source;
            }
        }

        if (!book) {
            book = {
                title: title,
                author: 'Unknown',
                status: 'read',
                tropes: [],
                themes: [],
                microthemes: [],
                mood: [],
                character_archetypes: [],
                content_warnings: [],
                rating: 0,
                rating_source: undefined,
                ratings_count: 0,
                description: 'No description found.',
                coverImage: undefined,
            };
        }

        // 4. Register in catalog
        const catalogEntry = await catalogService.ensureInCatalog(
            book.title,
            book.author,
            {
                cover_image: book.coverImage || null,
                description: book.description,
                rating: book.rating,
                ratings_count: book.ratings_count,
                rating_source: book.rating_source,
                page_count: book.total_pages,
            },
            true
        );

        // 5. Merge catalog metadata
        const merged = mergeWithCatalog(book, catalogEntry);

        console.log(`[BookService] findBook "${title}": rating=${merged.rating}, source=${merged.rating_source || 'none'}`);
        MEMORY_CACHE[cacheKey] = merged;
        return merged;
    },

    /**
     * Bulk verify a list of title strings into Book objects.
     */
    verifyBooks: async (titles: string[]): Promise<Book[]> => {
        const promises = titles.map(t => bookService.findBook(t));
        return Promise.all(promises);
    },

    hydrateBooksList: async (
        books: any[],
        onProgress?: (status: string) => void
    ): Promise<Book[]> => {
        console.log(`[BookService] Hydrating ${books.length} books...`);

        // Step 1: Batch extract catalog metadata
        if (onProgress) onProgress(`Analyzing ${books.length} books...`);

        const catalogEntries = await catalogService.batchExtractAndStore(
            books.map(b => ({ title: b.title, author: b.author || 'Unknown' }))
        );

        const catalogMap: Record<string, BookCatalogEntry> = {};
        for (const entry of catalogEntries) {
            catalogMap[entry.catalog_key] = entry;
        }

        // Step 2: Fetch covers/ratings in batches (reduced from 5 to 3 to avoid rate limits)
        const hydratedBooks: Book[] = [];
        const BATCH_SIZE = 3;
        const total = books.length;

        for (let i = 0; i < books.length; i += BATCH_SIZE) {
            const chunk = books.slice(i, i + BATCH_SIZE);

            if (onProgress) {
                onProgress(`Fetching details for ${Math.min(i + BATCH_SIZE, total)}/${total} books...`);
            }

            const chunkPromises = chunk.map(async (book: any) => {
                try {
                    const key = makeCatalogKey(book.title, book.author || 'Unknown');
                    const catalogEntry = catalogMap[key];

                    let coverImage = book.coverImage || catalogEntry?.cover_image || null;
                    let rating = book.rating || catalogEntry?.rating as number || 0;
                    let ratingsCount = book.ratings_count || catalogEntry?.ratings_count || 0;
                    let ratingSource = book.rating_source || catalogEntry?.rating_source;
                    let totalPages = book.total_pages || catalogEntry?.page_count;

                    const needsCover = !coverImage;
                    const needsRating = !rating || rating === 0;

                    // Step A: Try Google Books for cover + rating
                    if (needsCover || needsRating) {
                        const googleData = await googleBooksService.searchBook(
                            book.title, book.author || ''
                        );
                        if (googleData) {
                            if (needsCover) coverImage = googleData.coverImage || coverImage;
                            if (needsRating && googleData.rating && googleData.rating > 0) {
                                rating = googleData.rating;
                                ratingsCount = googleData.ratings_count || ratingsCount;
                                ratingSource = googleData.rating_source || ratingSource;
                            }
                            totalPages = googleData.total_pages || totalPages;
                        }
                    }

                    // Step B: If STILL no rating, try Open Library
                    if (!rating || rating === 0) {
                        console.log(`[BookService] No Google rating for "${book.title}". Trying Open Library...`);
                        const olRating = await openLibraryService.fetchRating(book.title, book.author || '');
                        if (olRating && olRating.rating > 0) {
                            rating = olRating.rating;
                            ratingsCount = olRating.ratings_count;
                            ratingSource = olRating.rating_source;
                        }
                    }

                    console.log(`[BookService] Hydrated "${book.title}": rating=${rating}, source=${ratingSource || 'none'}, cover=${!!coverImage}`);

                    // Update catalog
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
                            mood: book.mood || [],
                            character_archetypes: book.character_archetypes || [],
                            content_warnings: book.content_warnings || [],
                            status: book.status || 'recommended',
                        };

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
                        mood: book.mood || [],
                        character_archetypes: book.character_archetypes || [],
                        content_warnings: book.content_warnings || [],
                        status: book.status || 'recommended',
                    };
                }
            });

            const batchResults = await Promise.all(chunkPromises);
            hydratedBooks.push(...batchResults);

            // Increased delay between batches (300ms vs 100ms)
            if (i + BATCH_SIZE < books.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        if (onProgress) onProgress('Finalizing recommendations...');

        // Step 3: Background enrichment (non-blocking)
        catalogService.processEnrichmentQueue(3).catch(e =>
            console.error('[BookService] Background enrichment error:', e)
        );

        return hydratedBooks;
    },
};
