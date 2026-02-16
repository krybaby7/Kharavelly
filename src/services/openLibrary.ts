import { Book } from '../types';

interface OpenLibraryDoc {
    key: string;
    title: string;
    author_name?: string[];
    cover_i?: number;
    first_publish_year?: number;
}

interface OpenLibraryResponse {
    numFound: number;
    docs: OpenLibraryDoc[];
}

export const openLibraryService = {
    searchBook: async (title: string, author?: string): Promise<Book | null> => {
        try {
            console.log(`[OpenLibrary] Searching for: ${title} ${author || ''}`);
            const query = encodeURIComponent(`${title} ${author || ''}`.trim());
            const url = `https://openlibrary.org/search.json?q=${query}&limit=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'NovellyApp/1.0.0 (Reaction Native)',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`[OpenLibrary] HTTP Error: ${response.status}`);
                return null;
            }

            const data = await response.json() as OpenLibraryResponse;

            if (data.docs && data.docs.length > 0) {
                const doc = data.docs[0];
                console.log(`[OpenLibrary] Found match: ${doc.title}`);

                return {
                    title: doc.title,
                    author: doc.author_name ? doc.author_name[0] : 'Unknown Author',
                    coverImage: doc.cover_i
                        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                        : undefined as string | undefined,
                    description: '', // Open Library search doesn't return description usually, would need separate call. Keeping empty for now.
                    status: 'read', // Default
                    tropes: [],
                    rating: 0
                };
            }

            console.log('[OpenLibrary] No results found.');
            return null;

        } catch (error) {
            console.error('[OpenLibrary] Error:', error);
            return null;
        }
    }
};
