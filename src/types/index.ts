export type BookStatus = 'read' | 'tbr' | 'recommended';

export interface RelationshipDynamics {
    romantic?: string;
    platonic?: string;
    familial?: string;
    rivalries?: string;
    [key: string]: string | undefined;
}

export interface Book {
    title: string;
    author: string;
    tropes: string[];
    themes: string[];
    microthemes: string[];
    relationship_dynamics: RelationshipDynamics;
    pacing?: string;
    reader_need?: string;
    metadata?: Record<string, any>;
    status: BookStatus;
    added_date?: string;
    coverImage?: string; // Additional field for UI
    match_reasoning?: string; // For recommendations
    confidence_score?: number; // For recommendations
}

export interface PerplexityResponse {
    analysis?: {
        reader_profile?: string;
        common_tropes?: string[];
        common_themes?: string[];
        common_microthemes?: string[];
        common_relationship_patterns?: string[];
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
