import { Book } from '../types';

interface OpenLibraryDoc {
    key: string;
    title: string;
    author_name?: string[];
    cover_i?: number;
    first_publish_year?: number;
    ratings_average?: number;
    ratings_count?: number;
}

interface OpenLibraryResponse {
    numFound: number;
    docs: OpenLibraryDoc[];
}

export const openLibraryService = {
    /**
     * Search for a book and return basic info (cover, title, author).
     */
    searchBook: async (title: string, author?: string): Promise<Book | null> => {
        try {
            console.log(`[OpenLibrary] Searching for: ${title} ${author || ''}`);
            const query = encodeURIComponent(`${title} ${author || ''}`.trim());
            const url = `https://openlibrary.org/search.json?q=${query}&limit=3&fields=key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'NovellyApp/1.0.0 (React Native)',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn(`[OpenLibrary] HTTP Error: ${response.status}`);
                return null;
            }

            const data = await response.json() as OpenLibraryResponse;

            if (data.docs && data.docs.length > 0) {
                // Pick best result (prefer one with ratings)
                let bestDoc = data.docs[0];
                for (const doc of data.docs) {
                    if (doc.ratings_average && doc.ratings_average > 0) {
                        bestDoc = doc;
                        break;
                    }
                }

                console.log(`[OpenLibrary] Found: "${bestDoc.title}" rating=${bestDoc.ratings_average || 0} count=${bestDoc.ratings_count || 0}`);

                const rating = bestDoc.ratings_average || 0;

                return {
                    title: bestDoc.title,
                    author: bestDoc.author_name ? bestDoc.author_name[0] : 'Unknown Author',
                    coverImage: bestDoc.cover_i
                        ? `https://covers.openlibrary.org/b/id/${bestDoc.cover_i}-M.jpg`
                        : undefined as string | undefined,
                    description: '',
                    status: 'read',
                    tropes: [],
                    themes: [],
                    microthemes: [],
                    mood: [],
                    character_archetypes: [],
                    content_warnings: [],
                    rating: rating,
                    ratings_count: bestDoc.ratings_count || 0,
                    rating_source: rating > 0 ? 'Open Library' : undefined,
                };
            }

            console.log('[OpenLibrary] No results found.');
            return null;
        } catch (error) {
            console.error('[OpenLibrary] Error:', error);
            return null;
        }
    },

    /**
     * Fetch ONLY the rating for a book from Open Library.
     * Uses the search API with ratings_average and ratings_count fields.
     * This is the key fallback when Google Books has no rating.
     */
    fetchRating: async (title: string, author?: string): Promise<{
        rating: number;
        ratings_count: number;
        rating_source: string;
    } | null> => {
        try {
            const query = encodeURIComponent(`${title} ${author || ''}`.trim());
            const url = `https://openlibrary.org/search.json?q=${query}&limit=3&fields=title,author_name,ratings_average,ratings_count`;

            console.log(`[OpenLibrary] Fetching rating for: "${title}"`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'NovellyApp/1.0.0 (React Native)',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn(`[OpenLibrary] Rating fetch HTTP Error: ${response.status}`);
                return null;
            }

            const data = await response.json() as OpenLibraryResponse;

            if (data.docs && data.docs.length > 0) {
                // Find the first doc with a rating
                for (const doc of data.docs) {
                    if (doc.ratings_average && doc.ratings_average > 0) {
                        console.log(`[OpenLibrary] Rating found for "${title}": ${doc.ratings_average} (${doc.ratings_count || 0} ratings)`);
                        return {
                            rating: doc.ratings_average,
                            ratings_count: doc.ratings_count || 0,
                            rating_source: 'Open Library',
                        };
                    }
                }
                console.log(`[OpenLibrary] No rating data in ${data.docs.length} results for "${title}"`);
            }

            return null;
        } catch (error) {
            console.error(`[OpenLibrary] Rating fetch error for "${title}":`, error);
            return null;
        }
    },
};
