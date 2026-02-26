import { CONFIG } from '../config';

interface GoogleBookVolume {
    volumeInfo: {
        title: string;
        authors?: string[];
        description?: string;
        pageCount?: number;
        imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
        };
        averageRating?: number;
        ratingsCount?: number;
    };
    searchInfo?: {
        textSnippet?: string;
    };
}

function processGoogleBookItem(item: GoogleBookVolume) {
    const bookInfo = item.volumeInfo;
    const searchInfo = item.searchInfo;

    let description = bookInfo.description || '';
    if (!description && searchInfo?.textSnippet) {
        description = searchInfo.textSnippet;
    }

    // Clean up HTML tags
    description = description
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .trim();

    const hasRating = bookInfo.averageRating && bookInfo.averageRating > 0;

    return {
        title: bookInfo.title,
        author: bookInfo.authors ? bookInfo.authors[0] : 'Unknown',
        description: description,
        coverImage: bookInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        status: 'read' as const,
        tropes: [] as string[],
        rating: bookInfo.averageRating || 0,
        ratings_count: bookInfo.ratingsCount || 0,
        rating_source: hasRating ? 'Google Books' : undefined as string | undefined,
        total_pages: bookInfo.pageCount,
    };
}

/**
 * Pick the best result from multiple Google Books volumes.
 * Priority: has rating + cover > has rating > has cover > first result
 */
function pickBestResult(items: GoogleBookVolume[]): GoogleBookVolume {
    let bestItem = items[0];
    let bestScore = 0;

    for (const item of items) {
        let score = 0;
        const info = item.volumeInfo;

        if (info.averageRating && info.averageRating > 0) score += 10;
        if (info.ratingsCount && info.ratingsCount > 0) score += 5;
        if (info.imageLinks?.thumbnail) score += 3;
        if (info.description) score += 2;
        if (info.pageCount) score += 1;

        if (score > bestScore) {
            bestScore = score;
            bestItem = item;
        }
    }

    const picked = bestItem.volumeInfo;
    console.log(`[GoogleBooks] Picked best of ${items.length}: "${picked.title}" rating=${picked.averageRating || 0} count=${picked.ratingsCount || 0} cover=${!!picked.imageLinks?.thumbnail}`);

    return bestItem;
}

/**
 * Build the Google Books API URL with optional API key
 */
function buildUrl(query: string, maxResults: number = 5): string {
    let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=${maxResults}`;
    const apiKey = CONFIG.GOOGLE_BOOKS_API_KEY;
    if (apiKey) {
        url += `&key=${apiKey}`;
    }
    return url;
}

export const googleBooksService = {
    searchBook: async (title: string, author: string) => {
        try {
            console.log(`[GoogleBooks] Searching for: "${title}" by "${author}"`);

            let query = '';
            const cleanAuthor = author && author !== 'Unknown' ? author : '';

            if (cleanAuthor) {
                query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(cleanAuthor)}`;
            } else {
                query = `intitle:${encodeURIComponent(title)}`;
            }

            // Fetch up to 5 results so we can pick the best one with ratings
            const url = buildUrl(query, 5);
            console.log(`[GoogleBooks] Fetching URL (key ${CONFIG.GOOGLE_BOOKS_API_KEY ? 'present' : 'absent'})`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'NovellyApp/1.0.0 (Android; React Native)',
                },
            });

            if (!response.ok) {
                const status = response.status;
                console.warn(`[GoogleBooks] HTTP Error: ${status}`);
                if (status === 429) {
                    console.warn('[GoogleBooks] Rate limited! Add GOOGLE_BOOKS_API_KEY to .env for higher quota.');
                }
                return null;
            }

            const data = await response.json() as { items?: GoogleBookVolume[] };

            if (data.items && data.items.length > 0) {
                console.log(`[GoogleBooks] Got ${data.items.length} results for "${title}"`);
                const best = pickBestResult(data.items);
                return processGoogleBookItem(best);
            }

            // Fallback: looser search
            console.log(`[GoogleBooks] Strict search failed for "${title}". Trying loose search...`);
            const looseQuery = `${title} ${cleanAuthor}`.trim();
            const fallbackUrl = buildUrl(encodeURIComponent(looseQuery), 5);

            const fallbackResponse = await fetch(fallbackUrl, {
                headers: {
                    'User-Agent': 'NovellyApp/1.0.0 (Android; React Native)',
                },
            });

            if (!fallbackResponse.ok) return null;

            const fallbackData = await fallbackResponse.json() as { items?: GoogleBookVolume[] };

            if (fallbackData.items && fallbackData.items.length > 0) {
                console.log(`[GoogleBooks] Fallback got ${fallbackData.items.length} results`);
                const best = pickBestResult(fallbackData.items);
                return processGoogleBookItem(best);
            }

            console.log('[GoogleBooks] No results found after fallback.');
            return null;
        } catch (error) {
            console.error('[GoogleBooks] Error:', error);
            return null;
        }
    },

    hydrateBooksList: async (books: any[]) => {
        console.log(`[GoogleBooks] Hydrating ${books.length} books sequentially...`);

        const hydratedBooks = [];
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        for (const book of books) {
            if (book.description && book.coverImage) {
                hydratedBooks.push(book);
                continue;
            }

            await delay(500);

            try {
                const details = await googleBooksService.searchBook(book.title, book.author);
                if (details) {
                    hydratedBooks.push({
                        ...book,
                        description: book.description || details.description,
                        coverImage: book.coverImage || details.coverImage,
                        rating: details.rating || book.rating,
                        ratings_count: details.ratings_count || book.ratings_count,
                        rating_source: details.rating_source || book.rating_source,
                    });
                } else {
                    hydratedBooks.push(book);
                }
            } catch (error) {
                console.log(`[GoogleBooks] Error hydrating ${book.title}:`, error);
                hydratedBooks.push(book);
            }
        }

        return hydratedBooks;
    },
};
