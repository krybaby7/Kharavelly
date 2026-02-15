import {
    RECOMMENDATION_PROMPT,
    ANALYSIS_PROMPT,
    INTERVIEW_ANALYSIS_PROMPT,
    INTERVIEW_INIT_PROMPT,
    INTERVIEW_FOLLOWUP_PROMPT,
    PROFILE_QUESTION_STYLES
} from './prompts';
import { parseJson } from '../utils/helpers';
import axios from 'axios';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export type RecommendationMode = 'Quick Recs' | 'Books + Context' | 'Full Interview';

export async function callPerplexity(
    prompt: string,
    model: string = 'sonar-pro',
    apiKey: string
): Promise<{ success: boolean; content?: string; error?: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
    if (!apiKey) {
        return { success: false, error: "Perplexity API key not configured" };
    }

    try {
        const response = await axios.post(
            PERPLEXITY_API_URL,
            {
                model: model,
                messages: [
                    { role: 'system', content: 'You are a helpful book recommendation assistant.' },
                    { role: 'user', content: prompt }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const content = response.data.choices[0].message.content;
        const usage = response.data.usage;
        return { success: true, content, usage };

    } catch (error: any) {
        console.error("Perplexity API Error:", error.response?.data || error.message);
        return { success: false, error: error.response?.data?.error?.message || error.message };
    }
}

export const PRICING = {
    'sonar-deep-research': { input: 2.00 / 1000000, output: 8.00 / 1000000 },
    'sonar-pro': { input: 3.00 / 1000000, output: 15.00 / 1000000 },
    'default': { input: 3.00 / 1000000, output: 15.00 / 1000000 }
};

export function calculateCost(model: string, usage: { prompt_tokens: number; completion_tokens: number } | undefined): number {
    if (!usage) return 0;
    const pricing = PRICING[model as keyof typeof PRICING] || PRICING['default'];
    return (usage.prompt_tokens * pricing.input) + (usage.completion_tokens * pricing.output);
}

export function buildRecommendationPrompt(
    booksList: string[],
    mode: RecommendationMode,
    contextInput?: string,
    interviewContext?: string,
    readerProfile?: string
): string {
    // Default profile if none provided (e.g. for Quick Recs)
    let profileText = readerProfile || "User enjoys the themes and styles present in the provided context books.";

    // For Full Interview, if we don't have a profile yet, we synthesize one from the interview context
    if (mode === "Full Interview" && interviewContext && !readerProfile) {
        profileText = `Based on interview: ${interviewContext}`;
    }
    else if (mode === "Books + Context" && contextInput) {
        profileText += `\nSpecific Request: ${contextInput}`;
    }

    const contextBooks = booksList.join(', ');

    return RECOMMENDATION_PROMPT
        .replace("{reader_profile}", profileText)
        .replace("{context_books}", contextBooks || "None provided");
}

export async function analyzeUserProfile(conversationHistory: any[], booksList: string[], model: string, apiKey: string) {
    const booksContext = booksList && booksList.length > 0 ? `User provided: ${booksList.join(', ')}` : "No books provided.";
    const historyText = conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n');

    const prompt = INTERVIEW_ANALYSIS_PROMPT
        .replace("{books_context}", booksContext)
        .replace("{conversation_history}", historyText);

    const result = await callPerplexity(prompt, model, apiKey);

    if (!result.success || !result.content) {
        return { error: result.error };
    }

    try {
        const parsed = parseJson(result.content);
        return { ...parsed, usage: result.usage };
    } catch (e) {
        return { error: `Failed to parse profile analysis: ${e}` };
    }
}

export async function generateInterviewQuestion(
    booksList: string[],
    conversationHistory: any[],
    questionCount: number,
    phase: number,
    userProfile: string | undefined,
    profileData: any,
    model: string,
    apiKey: string
) {
    const booksContext = booksList && booksList.length > 0
        ? `User likes: ${booksList.join(', ')}\nTailor questions accordingly.`
        : "No books provided. Ask about general reading preferences.";

    let prompt = "";

    if (questionCount === 0) {
        prompt = INTERVIEW_INIT_PROMPT.replace("{books_context}", booksContext);
    } else {
        const historyText = conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n');

        let profileContext = "";
        let phaseInstructions = "";

        if (phase === 2 && userProfile && profileData) {
            const profileInfo = PROFILE_QUESTION_STYLES[userProfile] || {};
            profileContext = `\nUSER PROFILE: ${userProfile.replace('_', ' ').toUpperCase()}\nConfidence: ${(profileData.confidence || 0) * 100}%\nAnalysis: ${profileData.reasoning || ''}\nStrategy: ${profileData.recommended_strategy || ''}\n`;
            phaseInstructions = `\nPHASE 2: ADAPTIVE DEEP-DIVE\n\nQuestion Style for this user:\n${profileInfo.style || 'Use conversational questions'}\n\nGuidelines: ${profileInfo.guidelines || 'Follow the most interesting thread.'}\n\nStopping Criteria: ${profileInfo.stopping_criteria || 'Sufficient information gathered'}\n`;
        } else if (phase === 1) {
            phaseInstructions = `\nPHASE 1: TONE-SETTING\nContinue assessing communication style. After Q2, you'll adapt questions to their style.\n`;
        } else {
            phaseInstructions = "Continue with standard interview questions.";
        }

        prompt = INTERVIEW_FOLLOWUP_PROMPT
            .replace("{books_context}", booksContext)
            .replace("{conversation_history}", historyText)
            .replace("{profile_context}", profileContext)
            .replace("{phase}", phase.toString())
            .replace("{question_count}", questionCount.toString())
            .replace("{phase_instructions}", phaseInstructions);
    }

    const result = await callPerplexity(prompt, model, apiKey);

    if (!result.success || !result.content) {
        return { error: result.error };
    }

    try {
        const parsed = parseJson(result.content);
        return { ...parsed, usage: result.usage };
    } catch (e: any) {
        return { error: `Failed to parse response: ${e}`, raw_content: result.content };
    }
}
