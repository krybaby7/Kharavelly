import {
    BASE_PROMPT,
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
    interviewContext?: string
): string {
    if (mode === "Full Interview" && interviewContext && (!booksList || booksList.length === 0)) {
        return `Task: Based solely on the user's interview responses below, recommend a comprehensive list of books.

TASK: Based solely on the user's interview responses, recommend as many high-quality books as possible that match their preferences. Do not limit the number.

USER PREFERENCES (from interview):
${interviewContext}

CRITICAL - OUTPUT FORMAT:
You MUST return EXACTLY this structure. Do NOT return analysis fields at the top level.

CORRECT structure (use this):
{
  "analysis": {
    "reader_profile": "A candid introduction paragraph explaining honestly how you interpreted the user's responses and selected these specific books. Address the user directly."
  },
  "recommendations": [
    {
      "title": "recommended book 1 title",
      "author": "author name",
      "tropes": ["trope1", "trope2"],
      "themes": ["theme1", "theme2"],
      "microthemes": ["micro1", "micro2"],
      "relationship_dynamics": {
        "romantic": "description",
        "platonic": "description",
        "familial": "description",
        "rivalries": "description"
      },
      "pacing": "e.g., Fast-paced",
      "reader_need": "e.g., Escapism",
      "match_reasoning": "Detailed explanation of how this book aligns with the interview responses",
      "confidence_score": 0.95
    }
  ]
}

Your response MUST have these TWO top-level keys ONLY:
1. "analysis" - an OBJECT containing reader_profile
2. "recommendations" - an ARRAY of book objects (comprehensive list)

Output ONLY valid JSON starting with {. No text before or after.
Base recommendations entirely on interview preferences.`;
    }

    let prompt = BASE_PROMPT.replace("{user_book_list}", booksList.join(', '));

    if (mode === "Books + Context" && contextInput && contextInput.trim()) {
        const contextSection = `\n\nADDITIONAL USER CONTEXT:\nThe user has provided the following preferences:\n\n${contextInput}\n\nPlease incorporate these preferences into your analysis and recommendations.\nPrioritize books that align with both the input book patterns AND these stated preferences.\n`;
        prompt = prompt.replace("CRITICAL - OUTPUT FORMAT:", contextSection + "\n\nCRITICAL - OUTPUT FORMAT:");
    }
    else if (mode === "Full Interview" && interviewContext) {
        const interviewSection = `\n\nDETAILED USER PREFERENCES (from interview):\n\n${interviewContext}\n\nThese preferences were gathered through an adaptive interview and should be the PRIMARY\ndriver of recommendations. Use input books as secondary context for genre/style preferences.\n\nWhen making recommendations:\n1. Prioritize alignment with stated preferences\n2. Use input books to understand reading history\n3. Ensure recommendations respect content preferences mentioned\n4. Explain how each recommendation aligns with specific interview insights\n`;
        prompt = prompt.replace("CRITICAL - OUTPUT FORMAT:", interviewSection + "\n\nCRITICAL - OUTPUT FORMAT:");
    }

    return prompt;
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
