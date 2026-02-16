import AsyncStorage from '@react-native-async-storage/async-storage';
import { libraryService } from './library';
import { bookService } from './bookService';
import { callPerplexity, buildRecommendationPrompt } from './perplexity';
import { HOMEPAGE_FEED_PROMPT, HOMEPAGE_NEWS_PROMPT } from './prompts';
import { Book, FeedSection, NewsArticle } from '../types';
import { parseJson } from '../utils/helpers';
import { CONFIG } from '../config';

const CACHE_KEY = 'homepage_feed_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface FeedCache {
    timestamp: number;
    genres: string[]; // Store genres to invalidate if they change
    sections: FeedSection[];
}

export class FeedService {
    private loading: boolean = false;

    async generateHomepageFeed(selectedGenres: string[] = [], forceRefresh: boolean = false): Promise<FeedSection[]> {
        if (this.loading) {
            console.log('[FeedService] Already loading, waiting...');
            return [];
        }

        this.loading = true;

        try {
            // 1. Check persistent cache
            if (!forceRefresh) {
                const cachedData = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const cache: FeedCache = parseJson(cachedData);
                    const now = Date.now();
                    const isFresh = (now - cache.timestamp < CACHE_DURATION);
                    const isSameGenres = JSON.stringify(cache.genres.sort()) === JSON.stringify(selectedGenres.sort());

                    if (isFresh && isSameGenres) {
                        console.log('[FeedService] Returning PERSISTENT cached homepage feed');
                        this.loading = false;
                        return cache.sections;
                    }
                }
            }

            console.log('[FeedService] Generating new homepage feed...', selectedGenres);
            const apiKey = CONFIG.PERPLEXITY_API_KEY;
            if (!apiKey) throw new Error("Missing Perplexity API Key");

            // 2. Prepare Prompts
            const genresText = selectedGenres.length > 0 ? selectedGenres.join(', ') : "General";
            const booksPrompt = HOMEPAGE_FEED_PROMPT.replace('{genres}', genresText);
            const newsPrompt = HOMEPAGE_NEWS_PROMPT;

            // 3. Parallel Execution
            const [booksResult, newsResult] = await Promise.all([
                callPerplexity(booksPrompt, CONFIG.PERPLEXITY_MODEL, apiKey),
                callPerplexity(newsPrompt, CONFIG.PERPLEXITY_MODEL, apiKey)
            ]);

            const sections: FeedSection[] = [];

            // 4. Process Books
            if (booksResult.success && booksResult.content) {
                const data = parseJson(booksResult.content);

                // Hydrate and create sections
                if (data.new_releases) {
                    const hydrated = await bookService.hydrateBooksList(data.new_releases);
                    sections.push({ id: 'new_releases', title: 'New Releases', type: 'books', data: hydrated });
                }
                if (data.popular) {
                    const hydrated = await bookService.hydrateBooksList(data.popular);
                    sections.push({ id: 'popular', title: 'Most Popular', type: 'books', data: hydrated });
                }
                if (data.award_winning) {
                    const hydrated = await bookService.hydrateBooksList(data.award_winning);
                    sections.push({ id: 'award_winning', title: 'Award Winning', type: 'books', data: hydrated });
                }
                if (data.hidden_gems) {
                    const hydrated = await bookService.hydrateBooksList(data.hidden_gems);
                    sections.push({ id: 'hidden_gems', title: 'Hidden Gems', type: 'books', data: hydrated });
                }
            }

            // 5. Process News
            if (newsResult.success && newsResult.content) {
                const data = parseJson(newsResult.content);
                if (data.news && Array.isArray(data.news)) {
                    sections.push({ id: 'news', title: 'Literary News', type: 'news', data: data.news });
                }
            }

            // 6. Update Cache (Persistent)
            const newCache: FeedCache = {
                timestamp: Date.now(),
                genres: [...selectedGenres],
                sections
            };
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newCache));

            return sections;

        } catch (error) {
            console.error('[FeedService] Error generating feed:', error);
            return [];
        } finally {
            this.loading = false;
        }
    }

    async clearCache() {
        await AsyncStorage.removeItem(CACHE_KEY);
    }
}

export const feedService = new FeedService();
