import { googleBooksService } from './googleBooks';
import { openLibraryService } from './openLibrary';
import { Book } from '../types';

// Simple in-memory cache to prevent re-fetching same queries in session
const MEMORY_CACHE: Record<string, Book> = {};

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

        // 2. Logic: If no book found OR book found but missing cover (quality check) -> Fallback
        if (!book || !book.coverImage) {
            console.log(`[BookService] OpenLibrary failed or poor quality for "${title}". Falling back to Google.`);
            const googleBook = await googleBooksService.searchBook(title, '');

            if (googleBook) {
                // If we had a partial OL match (e.g. title but no cover), and Google failed, we stick with OL.
                // But if Google returns checks out, we use Google.

                // Helper to merge? For now, if Google returns valid, prefer Google full details 
                // as it usually has description + cover.
                book = {
                    title: googleBook.title || title,
                    author: googleBook.author || 'Unknown',
                    ...googleBook,
                    // defaults if not in googleBook
                    status: book?.status || 'read',
                    tropes: book?.tropes || [],
                    // Do not overwrite rating if it exists
                    rating: googleBook.rating || 0,
                    ratings_count: googleBook.ratings_count || 0,
                    rating_source: googleBook.rating_source,
                } as Book;
            }
        }

        if (!book) {
            // Absolute failure
            book = {
                title: title,
                author: 'Unknown',
                status: 'read',
                tropes: [],
                rating: 0,
                rating_source: undefined,
                ratings_count: 0,
                description: 'No description found.',
                coverImage: null
            };
        }

        MEMORY_CACHE[cacheKey] = book;
        return book;
    },

    /**
     * Bulk verify a list of titles strings into Book objects.
     */
    verifyBooks: async (titles: string[]): Promise<Book[]> => {
        const results: Book[] = [];
        // Sequential to be nice to APIs? Or Parallel?
        // Parallel Open Library is fine.

        const promises = titles.map(t => bookService.findBook(t));
        const books = await Promise.all(promises);

        return books;
    },

    hydrateBooksList: async (books: any[], onProgress?: (status: string) => void) => {
        console.log(`[BookService] Hydrating ${books.length} books in batches...`);

        const hydratedBooks: any[] = [];
        const BATCH_SIZE = 5;
        const total = books.length;

        // chunk the books array
        for (let i = 0; i < books.length; i += BATCH_SIZE) {
            const chunk = books.slice(i, i + BATCH_SIZE);
            const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(total / BATCH_SIZE);

            console.log(`[BookService] Processing batch ${currentBatchNum} of ${totalBatches}`);
            if (onProgress) {
                onProgress(`Fetched details for ${Math.min(i, total)}/${total} books...`);
            }

            const chunkPromises = chunk.map(async (book) => {
                try {
                    // We search primarily by Title + Author if avail
                    const query = `${book.title} ${book.author || ''}`.trim();
                    const details = await bookService.findBook(query);

                    return {
                        ...book,
                        ...details, // Merge details (cover, description)
                    };
                } catch (err) {
                    console.error(`[BookService] Failed to hydrate book: ${book.title}`, err);
                    // Return original book if hydration fails
                    return book;
                }
            });

            // Process this batch
            const batchResults = await Promise.all(chunkPromises);
            hydratedBooks.push(...batchResults);

            // tiny delay between batches to be nice to the event loop
            if (i + BATCH_SIZE < books.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (onProgress) onProgress("Finalizing recommendations...");
        return hydratedBooks;
    }
};
