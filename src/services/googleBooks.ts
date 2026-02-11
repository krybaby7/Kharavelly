import axios from 'axios';

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

    console.log(`[GoogleBooks] Found match: ${bookInfo.title}`);

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

    return {
        title: bookInfo.title,
        author: bookInfo.authors ? bookInfo.authors[0] : 'Unknown',
        description: description,
        coverImage: bookInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        status: 'read',
        tropes: [],
        rating: bookInfo.averageRating || 0,
        ratings_count: bookInfo.ratingsCount || 0,
        total_pages: bookInfo.pageCount
    };
}

export const googleBooksService = {
    searchBook: async (title: string, author: string) => {
        try {
            console.log(`[GoogleBooks] Searching for: ${title} by ${author}`);

            let query = '';
            const cleanAuthor = author && author !== 'Unknown' ? author : '';

            if (cleanAuthor) {
                query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(cleanAuthor)}`;
            } else {
                query = `intitle:${encodeURIComponent(title)}`;
            }

            const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

            // Use native fetch to avoid Axios/Flipper issues on Android
            console.log(`[GoogleBooks] Fetching URL: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'NovellyApp/1.0.0 (Android; React Native)'
                }
            });

            if (!response.ok) {
                console.log(`[GoogleBooks] HTTP Error: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as { items?: GoogleBookVolume[] };
            console.log(`[GoogleBooks] Response received for: ${title}`);

            if (data.items && data.items.length > 0) {
                return processGoogleBookItem(data.items[0]);
            }

            // Fallback: Try looser search query
            console.log(`[GoogleBooks] Strict search failed. Trying generic search...`);
            const looseQuery = `${title} ${author}`;
            const fallbackUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(looseQuery)}&maxResults=1`;

            const fallbackResponse = await fetch(fallbackUrl, {
                headers: {
                    'User-Agent': 'NovellyApp/1.0.0 (Android; React Native)'
                }
            });
            const fallbackData = await fallbackResponse.json() as { items?: GoogleBookVolume[] };

            if (fallbackData.items && fallbackData.items.length > 0) {
                console.log(`[GoogleBooks] Fallback search succeeded.`);
                return processGoogleBookItem(fallbackData.items[0]);
            }

            console.log('[GoogleBooks] No results found after fallback.');
            return null;

        } catch (error) {
            console.error('Error fetching from Google Books:', error);
            return null;
        }
    },



    hydrateBooksList: async (books: any[]) => {
        console.log(`[GoogleBooks] Hydrating ${books.length} books sequentially...`);

        const hydratedBooks = [];
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        for (const book of books) {
            // Use existing data if available
            if (book.description && book.coverImage) {
                hydratedBooks.push(book);
                continue;
            }

            // Artificial delay to prevent 429 Rate Limit errors
            await delay(500);

            try {
                const details = await googleBooksService.searchBook(book.title, book.author);
                if (details) {
                    hydratedBooks.push({
                        ...book,
                        description: book.description || details.description,
                        coverImage: book.coverImage || details.coverImage,
                        rating: details.rating || book.rating,
                        ratings_count: details.ratings_count || book.ratings_count
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
    }
};

