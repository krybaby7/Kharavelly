import {
    BASE_PROMPT,
    INTERVIEW_ANALYSIS_PROMPT,
    INTERVIEW_INIT_PROMPT,
    INTERVIEW_FOLLOWUP_PROMPT,
    PROFILE_QUESTION_STYLES
} from './prompts';
import { parseJson } from '../utils/helpers';
// We will use fetch native API or axios. Using fetch for fewer deps if possible, but axios is robust.
// Let's assume axios is installed as per plan.
import axios from 'axios';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export type RecommendationMode = 'Quick Recs' | 'Books + Context' | 'Full Interview';

export async function callPerplexity(
    prompt: string,
    model: string = 'sonar-pro',
    apiKey: string
): Promise<{ success: boolean; content?: string; error?: string }> {
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
                    'Authorization': \`Bearer \${apiKey}\`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const content = response.data.choices[0].message.content;
        return { success: true, content };

    } catch (error: any) {
        console.error("Perplexity API Error:", error.response?.data || error.message);
        return { success: false, error: error.response?.data?.error?.message || error.message };
    }
}

export function buildRecommendationPrompt(
    booksList: string[], 
    mode: RecommendationMode, 
    contextInput?: string, 
    interviewContext?: string
): string {
    // Special case: Interview mode with NO books
    if (mode === "Full Interview" && interviewContext && (!booksList || booksList.length === 0)) {
        return \`Task: Based solely on the user's interview responses below, recommend 4-6 books.

TASK: Based solely on the user's interview responses, recommend 4-6 books that match their preferences.

USER PREFERENCES (from interview):
\${interviewContext}

CRITICAL - OUTPUT FORMAT:
You MUST return EXACTLY this structure. Do NOT return analysis fields at the top level.

CORRECT structure (use this):
{
  "analysis": {
    "reader_profile": "2-3 sentence description of what this reader enjoys and seeks in books based on the interview"
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
2. "recommendations" - an ARRAY of 4-6 book objects

Output ONLY valid JSON starting with {. No text before or after.
Base recommendations entirely on interview preferences.\`;
    }

    // Standard case: with books
    let prompt = BASE_PROMPT.replace("{user_book_list}", booksList.join(', '));

    // Mode 2: Add user context
    if (mode === "Books + Context" && contextInput && contextInput.trim()) {
        const contextSection = \`

ADDITIONAL USER CONTEXT:
The user has provided the following preferences:

\${contextInput}

Please incorporate these preferences into your analysis and recommendations.
Prioritize books that align with both the input book patterns AND these stated preferences.
\`;
        prompt = prompt.replace("CRITICAL - OUTPUT FORMAT:", contextSection + "\n\nCRITICAL - OUTPUT FORMAT:");
    }
    // Mode 3: Add interview insights
    else if (mode === "Full Interview" && interviewContext) {
        const interviewSection = \`

DETAILED USER PREFERENCES (from interview):

\${interviewContext}

These preferences were gathered through an adaptive interview and should be the PRIMARY
driver of recommendations. Use input books as secondary context for genre/style preferences.

When making recommendations:
1. Prioritize alignment with stated preferences
2. Use input books to understand reading history
3. Ensure recommendations respect content preferences mentioned
4. Explain how each recommendation aligns with specific interview insights
\`;
        prompt = prompt.replace("CRITICAL - OUTPUT FORMAT:", interviewSection + "\n\nCRITICAL - OUTPUT FORMAT:");
    }

    return prompt;
}

export async function analyzeUserProfile(conversationHistory: any[], booksList: string[], model: string, apiKey: string) {
    const booksContext = booksList && booksList.length > 0 ? \`User provided: \${booksList.join(', ')}\` : "No books provided.";
    const historyText = conversationHistory.map(msg => \`\${msg.role.toUpperCase()}: \${msg.content}\`).join('\\n');

    const prompt = INTERVIEW_ANALYSIS_PROMPT
        .replace("{books_context}", booksContext)
        .replace("{conversation_history}", historyText);

    const result = await callPerplexity(prompt, model, apiKey);

    if (!result.success || !result.content) {
        return { error: result.error };
    }

    try {
        return parseJson(result.content);
    } catch (e) {
        return { error: \`Failed to parse profile analysis: \${e}\` };
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
        ? \`User likes: \${booksList.join(', ')}\\nTailor questions accordingly.\`
        : "No books provided. Ask about general reading preferences.";

    let prompt = "";

    if (questionCount === 0) {
        prompt = INTERVIEW_INIT_PROMPT.replace("{books_context}", booksContext);
    } else {
        const historyText = conversationHistory.map(msg => \`\${msg.role.toUpperCase()}: \${msg.content}\`).join('\\n');
        
        let profileContext = "";
        let phaseInstructions = "";
        let targetQuestions = 5;

        if (phase === 2 && userProfile && profileData) {
            const profileInfo = PROFILE_QUESTION_STYLES[userProfile] || {};
            profileContext = \`
USER PROFILE: \${userProfile.replace('_', ' ').toUpperCase()}
Confidence: \${(profileData.confidence || 0) * 100}%
Analysis: \${profileData.reasoning || ''}
Strategy: \${profileData.recommended_strategy || ''}
\`;
            phaseInstructions = \`
PHASE 2: ADAPTIVE DEEP-DIVE

Question Style for this user:
\${profileInfo.style || 'Use conversational questions'}

Stopping Criteria: \${profileInfo.stopping_criteria || 'Sufficient information gathered'}

Focus areas: pacing, emotional tone, content boundaries, character preferences, themes/tropes
\`;
            targetQuestions = profileInfo.target_questions || 5;
        } else if (phase === 1) {
            phaseInstructions = \`
PHASE 1: TONE-SETTING
Continue assessing communication style. After Q2, you'll adapt questions to their style.
\`;
        } else {
             phaseInstructions = "Continue with standard interview questions.";
        }

        prompt = INTERVIEW_FOLLOWUP_PROMPT
            .replace("{books_context}", booksContext)
            .replace("{conversation_history}", historyText)
            .replace("{profile_context}", profileContext) // Assuming this token exists in prompt? Yes, it does
            .replace("{phase}", phase.toString())
            .replace("{question_count}", questionCount.toString())
            .replace("{target_questions}", targetQuestions.toString())
            .replace("{phase_instructions}", phaseInstructions);
    }

    const result = await callPerplexity(prompt, model, apiKey);

    if (!result.success || !result.content) {
        return { error: result.error };
    }

    try {
        return parseJson(result.content);
    } catch (e: any) {
        return { error: \`Failed to parse response: \${e}\`, raw_content: result.content };
    }
}
