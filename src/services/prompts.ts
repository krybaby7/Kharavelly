export const BASE_PROMPT = `Search for detailed information about the plot, themes, and tropes of the following books: {user_book_list}.
 
OBJECTIVE:
1. Synthesize the search results to understand the key narrative elements of the input books.
   - NOTE: If search results are incomplete for any book, YOU MUST USE YOUR INTERNAL KNOWLEDGE to analyze it. Do not refuse.
2. Based on this understanding, recommend a comprehensive list of DIFFERENT books (distinct from the input list). Do not limit the number of recommendations; provide as many high-quality matches as possible.
3. Provide the output in strict JSON format as specified below.

ANALYSIS FRAMEWORK:
For each input book, identify:
1. Core Tropes (e.g., "Enemies to Lovers", "Chosen One")
2. Themes (e.g., "Found Family", "Trauma Recovery")
3. Microthemes/Motifs (e.g., "Art as Healing", "Second Chances")
4. Character Archetypes (e.g., "Wounded Warrior", "Underdog")
5. Relationship Dynamics:
   - Romantic: type, pacing, tension
   - Platonic: found family, friendship, mentor/mentee
   - Familial: parent-child, sibling dynamics
   - Rivalries: competitive, antagonistic
6. Pacing & Energy (e.g., "Fast-paced", "Slow-burn", "Meditative")
7. Reader Emotional Need (e.g., "Comfort", "Catharsis", "Escapism", "Challenge")
8. Setting/Environment
9. Emotional Tone

Search Query Context: {user_book_list}

IMPORTANT: If the search tool does not return results for a specific book, rely on your internal training data to provide the analysis. Do NOT stop or refuse. Complete the JSON.

REQUIRED JSON OUTPUT FORMAT:
Return a single JSON object with exactly three top-level keys:

{
  "input_books_analysis": [
    {
      "title": "exact title of input book 1",
      "author": "author name",
      "tropes": ["trope1", "trope2", "trope3"],
      "themes": ["theme1", "theme2"],
      "microthemes": ["micro1", "micro2"],
      "relationship_dynamics": {
        "romantic": "description of romantic dynamics",
        "platonic": "description of friendships",
        "familial": "description of family relationships",
        "rivalries": "description of conflicts"
      },
      "pacing": "e.g., Fast-paced, Slow-burn, Meditative",
      "reader_need": "e.g., Escapism, Comfort, Catharsis"
    }
  ],
  "analysis": {
    "common_tropes": ["shared trope 1", "shared trope 2"],
    "common_themes": ["shared theme 1", "shared theme 2"],
    "common_microthemes": ["shared micro 1", "shared micro 2"],
    "common_relationship_patterns": ["pattern 1", "pattern 2"],
    "common_pacing": "e.g., Fast-paced",
    "reader_profile": "2-3 sentence description of what this reader enjoys and seeks in books"
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
      "match_reasoning": "Detailed explanation of why this book matches the reader's preferences",
      "confidence_score": 0.95,
      "rating": 4.5,
      "ratings_count": 12500
    }
  ]
}

REQUIREMENTS:
- input_books_analysis: ARRAY with analysis of each book the user provided
- analysis: OBJECT with common patterns found across input books
- recommendations: ARRAY with as many high-quality book recommendations as possible (NOT the input books)
- Output ONLY valid JSON, no text before or after
- Do not include the input books in the recommendations array
- Ensure all three sections are present in your response`;

export const PROFILE_QUESTION_STYLES: Record<string, any> = {
  'articulate_explorer': {
    'style': `Use open-ended, exploratory questions. Probe nuances and subtleties.
        Example: "What emotional journey do you crave in stories?"`,
    'guidelines': 'Aim for depth over breadth. Follow their lead on themes.',
    'stopping_criteria': 'When you have a rich, nuanced understanding of their taste.'
  },
  'decisive_reader': {
    'style': `Ask direct, targeted questions with binary choices. Be efficient.
        Example: "Fast-paced thrillers or slow-burn character studies?"`,
    'guidelines': 'Respect their time. Confirm key preferences quickly.',
    'stopping_criteria': 'When specific preferences (genre, pacing, tone) are clear.'
  },
  'uncertain_seeker': {
    'style': `Provide structured options (A/B/C). Give concrete examples.
        Example: "Which appeals most? (A) Fast action, (B) Character focus, (C) Atmospheric"`,
    'guidelines': 'Guide them gently. Validate their choices.',
    'stopping_criteria': 'When you have a solid "safe bet" direction.'
  },
  'genre_novice': {
    'style': `Use relatable comparisons (movies/TV). Avoid jargon. Provide context.
        Example: "Think of a movie you loved - action or character moments?"`,
    'guidelines': 'Focus on "vibes" and feelings rather than technical genres.',
    'stopping_criteria': 'When you have enough broad strokes to recommend accessible books.'
  }
};

export const INTERVIEW_ANALYSIS_PROMPT = `Analyze this reader's communication style from their first 2 responses.

{books_context}

Conversation:
{conversation_history}

Classify into ONE profile:
- ARTICULATE_EXPLORER: Detailed (50+ words), specific examples, descriptive language
- DECISIVE_READER: Clear, concise (20-50 words), confident statements
- UNCERTAIN_SEEKER: Brief/vague (<20 words), uncertain language
- GENRE_NOVICE: New to reading/genre, limited knowledge, asks for guidance

Respond with JSON:
{
  "user_profile": "articulate_explorer|decisive_reader|uncertain_seeker|genre_novice",
  "confidence": 0.85,
  "reasoning": "Why this profile fits based on their responses",
  "response_characteristics": {
    "avg_word_count": 45,
    "specificity_level": "high|medium|low",
    "confidence_indicators": ["specific examples given", "uncertain language used"]
  },
  "recommended_strategy": "How to adapt Phase 2 questions"
}
`;

export const INTERVIEW_INIT_PROMPT = `Conduct the first phase of an adaptive book preference interview (2 questions total phase 1).
 
PHASE 1 GOAL: Assess the reader's communication style and readiness level.

{books_context}

Ask ONE question to understand:
- How they articulate preferences (detailed vs brief)
- Their confidence level about what they want
- Their reading/genre knowledge level

Good Phase 1 openers:
- WITH BOOKS: "What draws you to [titles]? The characters, plot, emotional experience, or something else?"
- WITHOUT BOOKS: "Tell me about a story (book/movie/TV) that resonated with you. What made it compelling?"

Respond with JSON:
{
  "question": "Your specific question",
  "reasoning": "Why this helps assess user readiness",
  "phase": 1
}

Be conversational and warm.`;

export const INTERVIEW_FOLLOWUP_PROMPT = `Continue the adaptive reading preference interview.
 
CONTEXT:{books_context}

Conversation:
{conversation_history}

{profile_context}

STATUS:
- Phase: {phase}
- Question count: {question_count}
- Guidelines: {phase_instructions}

OBJECTIVE:
Your goal is to understand the user's reading taste deeply enough to make excellent recommendations.
Do NOT follow a checklist. Follow the conversation naturally.

ADAPTIVE LOGIC:
1. Analyze the user's last response. What did it reveal? What is still unclear?
2. If the user seemed excited about a topic, DIG DEEPER into that.
3. If the user was vague, try a different angle or offer specific examples.
4. If you have enough information to make 5+ high-quality recommendations with confidence, STOP.

DECISION TO STOP (continue_interview: false):
- You have a clear "Reader Profile" in mind.
- You understand their preferred Tone, Pacing, and at least one core Genre/Theme.
- You are confident you can delight them.
- MAXIMUM questions: 10 (Force stop if count >= 10).

Respond with JSON:
{
  "continue_interview": true/false,
  "question": "next question (if continuing)",
  "context_summary": "brief summary of what we know so far",
  "reasoning": "Why you decided to continue or stop",
  "phase": {phase}
}`;
