export const ANALYSIS_PROMPT = `Analyze the following user interview to build a detailed "Reader Profile".

INTERVIEW TRANSCRIPT:
{interview_transcript}

CONTEXT BOOKS (if any):
{context_books}

OBJECTIVE:
Synthesize a deep psychological and literary profile of this reader. Focus on *why* they like what they like.

ANALYSIS FRAMEWORK:
1. Core Preferences: Genres, tropes, and themes they gravitate toward.
2. Pacing & Energy: Do they like fast-paced thrillers, slow-burn emotional journeys, or intellectual puzzles?
3. Emotional Needs: What are they looking for? (Escapism, catharsis, challenge, comfort, education?)
4. Dealbreakers/Dislikes: What do they explicitly or implicitly avoid?
5. Narrative Style: First-person vs third-person, prose style (lyrical vs utilitarian), complexity.

IMPORTANT STOPPING LOGIC:
If you have sufficient information to build a comprehensive profile (usually after 3-5 exchanges), your final question in the interview should explicitly be: "Is there anything else you'd like to mention about your reading preferences?" to signal the end of the interview.

REQUIRED JSON OUTPUT FORMAT:
Return a single JSON object (no markdown, no other text):
{
  "reader_profile": "A generic, comprehensive paragraph describing this reader's taste, suitable for feeding into a book recommendation engine.",
  "extracted_preferences": {
    "genres": ["genre1", "genre2"],
    "tropes": ["trope1", "trope2"],
    "themes": ["theme1", "theme2"],
    "pacing": "description",
    "tone": "description"
  },
  "continue_interview": boolean, // true if more info is needed, false if ready to recommend
  "next_question": "Your next interview question OR the closing 'anything else' question"
}`;

export const RECOMMENDATION_PROMPT = `Based on the following Reader Profile, recommend 5-7 books that are perfect matches.

READER PROFILE:
{reader_profile}

CONTEXT BOOKS (books they already like):
{context_books}

OBJECTIVE:
1. Find books that match the profile's specific nuances (tropes, tone, emotional need).
2. Ensure versatility (mix of well-known and hidden gems).
3. Do NOT recommend books from the "Context Books" list.

REQUIRED JSON OUTPUT FORMAT:
Return a single JSON object (no markdown, no other text):
{
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "tropes": ["trope1", "trope2", "trope3"],
      "themes": ["theme1", "theme2"],
      "mood": ["mood1", "mood2"],
      "character_archetypes": ["archetype1", "archetype2"],
      "content_warnings": ["warning1", "warning2"],
      "pacing": "Fast/Slow/Medium",
      "reader_need": "The emotional need this satisfies",
      "perfect_for": "Who this book is perfect for (1 sentence)",
      "quote": "A short, memorable quote from the book (optional, null if unknown)",
      "match_reasoning": "A compelling, personalized explanation of why this fits the user's profile. Mention specific elements from their profile.",
      "confidence_score": 0.95 (number between 0-1)
    }
  ],
  "intro_text": "A brief, friendly opening sentence acknowledging their taste (e.g., 'Based on your love for dark academia...')."
}
`;

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
}
`;

export const HOMEPAGE_FEED_PROMPT = `Generate a curated list of book recommendations for a homepage feed based on the following genres: {genres}.
If genres are "General" or empty, provide a diverse mix of popular genres.

Output a JSON object with the following sections:
1. "new_releases": 5 recently published books (last 6 months) in these genres.
2. "popular": 5 highly rated/popular books currently trending in these genres.
3. "award_winning": 5 books that have won major awards (Hugo, Nebula, Pulitzer, Booker, etc.) in these genres.
4. "hidden_gems": 5 highly rated but less known books in these genres.

REQUIRED JSON OUTPUT FORMAT:
{
  "new_releases": [
    { "title": "Title", "author": "Author", "genre": "Genre" }
  ],
  "popular": [
    { "title": "Title", "author": "Author", "genre": "Genre" }
  ],
  "award_winning": [
    { "title": "Title", "author": "Author", "genre": "Genre" }
  ],
  "hidden_gems": [
    { "title": "Title", "author": "Author", "genre": "Genre" }
  ]
}
Return ONLY valid JSON. No markdown, no intro/outro text.`;

export const HOMEPAGE_NEWS_PROMPT = `Find 5 recent, interesting news articles, blog posts, or author interviews related to books, reading, or publishing.
Focus on:
- Upcoming highly anticipated releases
- Author interviews or profiles
- Literary prize announcements
- Trends in the book world

REQUIRED JSON OUTPUT FORMAT:
{
  "news": [
    {
      "title": "Headline",
      "summary": "Brief 1-sentence summary",
      "url": "Link to article (if available, otherwise null)",
      "source": "Source Name (e.g. NYT, Guardian, Tor.com)",
      "date": "Date string (e.g. 'Oct 12, 2023')"
    }
  ]
}
Return ONLY valid JSON. No markdown.`;
