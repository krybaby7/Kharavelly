import { PERPLEXITY_API_KEY, PERPLEXITY_MODEL, SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Safe import for optional keys - won't crash if not in .env
let googleBooksKey = '';
try {
    const env = require('@env');
    googleBooksKey = env.GOOGLE_BOOKS_API_KEY || '';
} catch (e) {
    // Key not configured, will use unauthenticated Google Books API
}

export const CONFIG = {
    PERPLEXITY_API_KEY: PERPLEXITY_API_KEY,
    PERPLEXITY_MODEL: PERPLEXITY_MODEL,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    GOOGLE_BOOKS_API_KEY: googleBooksKey,
};
