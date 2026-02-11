import { libraryService } from './library';
import { bookService } from './bookService';
import { callPerplexity, buildRecommendationPrompt } from './perplexity';
import { Book } from '../types';
import { parseJson } from '../utils/helpers';
import { CONFIG } from '../config';

const CACHE_KEY = 'daily_feed_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface FeedCache {
    timestamp: number;
    items: Book[];
}

export class FeedService {
    // In-memory cache for the session
    private cache: FeedCache | null = null;
    private loading: boolean = false;

    async generateDailyFeed(forceRefresh: boolean = false): Promise<Book[]> {
        if (this.loading) {
            console.log('[FeedService] Already loading, waiting...');
            // Simple prevention of double calls, though ideally should return the promise
            return [];
        }

        // Return cached if valid
        if (!forceRefresh && this.cache) {
            const now = Date.now();
            if (now - this.cache.timestamp < CACHE_DURATION) {
                console.log('[FeedService] Returning cached feed');
                return this.cache.items;
            }
        }

        this.loading = true;

        try {
            console.log('[FeedService] Generating new feed...');
            const library = await libraryService.loadLibrary();
            const allBooks = Object.values(library);

            // 1. Policy: Select up to 3 "Read" books, specialized for variety if possible
            const readBooks = allBooks.filter(b => b.status === 'read');

            // If strictly no read books, try TBR? Or just return empty to show "Start reading" state?
            let seedBooks: Book[] = [];

            if (readBooks.length > 0) {
                // Shuffle and pick 3
                seedBooks = readBooks.sort(() => 0.5 - Math.random()).slice(0, 3);
            } else if (allBooks.length > 0) {
                seedBooks = allBooks.sort(() => 0.5 - Math.random()).slice(0, 3);
            } else {
                console.log('[FeedService] Library empty, cannot generate personalized feed.');
                this.loading = false;
                return [];
            }

            const seedTitles = seedBooks.map(b => b.title);
            console.log(`[FeedService] Using seeds: ${seedTitles.join(', ')}`);

            // 2. Generate Prompt
            // We use 'Quick Recs' mode which maps to basic "here are books, give me recs"
            // We could inject a specialized context like "Daily Mix" if we updated prompts, 
            // but this should work fine.
            const prompt = buildRecommendationPrompt(seedTitles, 'Quick Recs');

            // 3. Call Perplexity
            // Use existing API key from config (assuming it's set in env or code)
            const apiKey = CONFIG.PERPLEXITY_API_KEY;
            if (!apiKey) {
                throw new Error("Missing Perplexity API Key");
            }

            const result = await callPerplexity(prompt, CONFIG.PERPLEXITY_MODEL, apiKey);

            if (!result.success || !result.content) {
                throw new Error(result.error || "Failed to fetch response");
            }

            // 4. Parse & Hydrate
            const data = parseJson(result.content);
            if (data.recommendations && Array.isArray(data.recommendations)) {

                // Hydrate covers
                const hydrated = await bookService.hydrateBooksList(data.recommendations);

                // 5. Update Cache
                this.cache = {
                    timestamp: Date.now(),
                    items: hydrated
                };

                return hydrated;
            } else {
                console.warn('[FeedService] No recommendations in response');
                return [];
            }

        } catch (error) {
            console.error('[FeedService] Error generating feed:', error);
            return [];
        } finally {
            this.loading = false;
        }
    }

    clearCache() {
        this.cache = null;
    }
}

export const feedService = new FeedService();
