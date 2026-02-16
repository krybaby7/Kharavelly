export interface NewsArticle {
    title: string;
    summary: string;
    url?: string;
    source: string;
    date: string;
}

export interface FeedSection {
    id: string;
    title: string;
    type: 'books' | 'news' | 'analytics' | 'history' | 'banner';
    data: Book[] | NewsArticle[] | any;
}

export type BookStatus = 'tbr' | 'read' | 'dnf' | 'recommended';

// RelationshipDynamics removed in favor of simpler tags


export interface Book {
    id?: string;
    title: string;
    author: string;
    tropes: string[];
    themes: string[];
    microthemes: string[]; // Keeping for backward compat, but effectively unused in new prompts
    mood: string[]; // NEW: "Dark", "Whimsical", etc.
    character_archetypes: string[]; // NEW: "Grumpy Sunshine", "Chosen One"
    content_warnings: string[]; // NEW: "Violence", "Death"
    perfect_for?: string; // NEW: "Fans of X"
    quote?: string; // NEW: Memorable quote
    description?: string; // Official book description
    relationship_dynamics?: any; // Deprecated but used in library service
    pacing?: string;
    reader_need?: string;
    metadata?: Partial<import('./catalog').BookCatalogEntry>; // Updated: now strictly typed as partial catalog entry
    status: BookStatus;
    added_date?: string;
    coverImage?: string; // Additional field for UI
    match_reasoning?: string; // For recommendations
    confidence_score?: number; // For recommendations
    progress?: number; // Current page or percentage
    total_pages?: number; // Total pages
    rating?: number; // 1-5 stars
    ratings_count?: number; // Total number of ratings
    rating_source?: string; // Source of the rating (e.g., 'Google Books')
}

export interface PerplexityResponse {
    analysis?: {
        reader_profile?: string;
        common_tropes?: string[];
        common_themes?: string[];
        common_moods?: string[];
        common_archetypes?: string[];
        common_pacing?: string;
    };
    recommendations: Book[];
}

export interface InterviewState {
    active: boolean;
    history: { role: 'assistant' | 'user'; content: string }[];
    question_count: number;
    completed: boolean;
    final_context: string;
    phase: number;
    user_profile?: string;
}

export interface RecHistoryItem {
    id: string;
    created_at: string;
    source_type: 'quick' | 'context' | 'interview';
    prompt_context: string;
    recommendations: Book[];
    intro_text?: string;
    cost?: number;
}
