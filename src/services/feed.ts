import AsyncStorage from '@react-native-async-storage/async-storage';
import { libraryService } from './library';
import { bookService } from './bookService';
import { callPerplexity, buildRecommendationPrompt } from './perplexity';
import { HOMEPAGE_FEED_PROMPT, HOMEPAGE_NEWS_PROMPT } from './prompts';
import { Book, FeedSection, NewsArticle } from '../types';
import { parseJson } from '../utils/helpers';
import { CONFIG } from '../config';
import { supabase } from './supabase';

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
            const genresKey = selectedGenres.length > 0 ? selectedGenres.sort().join(',') : "General";
            const booksCacheId = `books_${genresKey}`;
            const newsCacheId = `news`;

            const NOW = new Date();
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            const THREE_HALF_DAYS_MS = 3.5 * 24 * 60 * 60 * 1000;

            let finalBooksSections: FeedSection[] = [];
            let finalNewsSection: FeedSection | null = null;

            let fetchBooksFromPerplexity = true;
            let fetchNewsFromPerplexity = true;

            // 1. Check persistent local cache first for super fast load (if not force refresh)
            if (!forceRefresh) {
                const cachedData = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const cache: FeedCache = parseJson(cachedData);
                    const now = Date.now();
                    const isFreshLocally = (now - cache.timestamp < CACHE_DURATION);
                    const isSameGenres = JSON.stringify(cache.genres.sort()) === JSON.stringify(selectedGenres.sort());

                    if (isFreshLocally && isSameGenres) {
                        console.log('[FeedService] Returning PERSISTENT local cached homepage feed');
                        this.loading = false;

                        // Fire background hydration so that even cached books get retried if they previously failed Tier 2 enrichment
                        const allBooks = cache.sections.flatMap(s => s.data);
                        bookService.hydrateBooksList(allBooks).catch(e => console.error('[FeedService] Background hydration error:', e));

                        return cache.sections;
                    }
                }
            }

            // 2. Check Supabase Global Cache
            if (!forceRefresh) {
                try {
                    const { data: globalBooksCache, error: booksErr } = await supabase
                        .from('homepage_feeds')
                        .select('content, updated_at')
                        .eq('id', booksCacheId)
                        .single();

                    if (globalBooksCache && !booksErr) {
                        const updatedAt = new Date(globalBooksCache.updated_at);
                        if (NOW.getTime() - updatedAt.getTime() < SEVEN_DAYS_MS) {
                            console.log(`[FeedService] Books global cache hit for ${booksCacheId}`);
                            finalBooksSections = globalBooksCache.content as FeedSection[];
                            fetchBooksFromPerplexity = false;

                            // Fire background hydration so that even global cached books get retried if they previously failed Tier 2 enrichment
                            const allBooks = finalBooksSections.flatMap(s => s.data);
                            bookService.hydrateBooksList(allBooks).catch(e => console.error('[FeedService] Background hydration error:', e));
                        }
                    }

                    const { data: globalNewsCache, error: newsErr } = await supabase
                        .from('homepage_feeds')
                        .select('content, updated_at')
                        .eq('id', newsCacheId)
                        .single();

                    if (globalNewsCache && !newsErr) {
                        const updatedAt = new Date(globalNewsCache.updated_at);
                        if (NOW.getTime() - updatedAt.getTime() < THREE_HALF_DAYS_MS) {
                            console.log(`[FeedService] News global cache hit`);
                            finalNewsSection = globalNewsCache.content as FeedSection;
                            fetchNewsFromPerplexity = false;
                        }
                    }
                } catch (e) {
                    console.error('[FeedService] Supabase cache check failed', e);
                }
            }

            // 3. Fallback to Perplexity for whatever is missing
            const apiKey = CONFIG.PERPLEXITY_API_KEY;
            if (!apiKey) throw new Error("Missing Perplexity API Key");

            const promises: Promise<any>[] = [];

            if (fetchBooksFromPerplexity) {
                console.log(`[FeedService] Generating new books feed from Perplexity for ${genresKey}`);
                const genresText = selectedGenres.length > 0 ? selectedGenres.join(', ') : "General";
                const booksPrompt = HOMEPAGE_FEED_PROMPT.replace('{genres}', genresText);
                promises.push(callPerplexity(booksPrompt, CONFIG.PERPLEXITY_MODEL, apiKey).then(async (res) => {
                    const sections: FeedSection[] = [];
                    if (res.success && res.content) {
                        const data = parseJson(res.content);
                        if (data.new_releases) {
                            sections.push({ id: 'new_releases', title: 'New Releases', type: 'books', data: await bookService.hydrateBooksList(data.new_releases) });
                        }
                        if (data.popular) {
                            sections.push({ id: 'popular', title: 'Most Popular', type: 'books', data: await bookService.hydrateBooksList(data.popular) });
                        }
                        if (data.award_winning) {
                            sections.push({ id: 'award_winning', title: 'Award Winning', type: 'books', data: await bookService.hydrateBooksList(data.award_winning) });
                        }
                        if (data.hidden_gems) {
                            sections.push({ id: 'hidden_gems', title: 'Hidden Gems', type: 'books', data: await bookService.hydrateBooksList(data.hidden_gems) });
                        }

                        // Save to Supabase
                        await supabase.from('homepage_feeds').upsert({
                            id: booksCacheId,
                            content: sections,
                            updated_at: new Date().toISOString()
                        });
                    }
                    return { type: 'books', data: sections };
                }));
            }

            if (fetchNewsFromPerplexity) {
                console.log(`[FeedService] Generating new news feed from Perplexity`);
                promises.push(callPerplexity(HOMEPAGE_NEWS_PROMPT, CONFIG.PERPLEXITY_MODEL, apiKey).then(async (res) => {
                    let section: FeedSection | null = null;
                    if (res.success && res.content) {
                        const data = parseJson(res.content);
                        if (data.news && Array.isArray(data.news)) {
                            section = { id: 'news', title: 'Literary News', type: 'news', data: data.news };

                            // Save to Supabase
                            await supabase.from('homepage_feeds').upsert({
                                id: newsCacheId,
                                content: section,
                                updated_at: new Date().toISOString()
                            });
                        }
                    }
                    return { type: 'news', data: section };
                }));
            }

            // Wait for any needed Perplexity calls
            if (promises.length > 0) {
                const results = await Promise.all(promises);
                results.forEach(result => {
                    if (result.type === 'books') {
                        finalBooksSections = result.data;
                    } else if (result.type === 'news') {
                        finalNewsSection = result.data;
                    }
                });
            }

            // 4. Combine Results
            const sections: FeedSection[] = [...finalBooksSections];
            if (finalNewsSection) {
                sections.push(finalNewsSection);
            }

            // 5. Update Local Cache (Persistent)
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
