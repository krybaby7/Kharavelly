/**
 * Enhanced JSON parser that handles thinking tags and various formats.
 * Extracts the largest valid JSON object found in the content.
 */
export function parseJson(content: string): any {
    // Remove thinking tags
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<think>[\s\S]*?(?=\{)/gi, ''); // Helper for incomplete tags

    cleanContent = cleanContent.trim();

    // Try direct parsing
    try {
        return JSON.parse(cleanContent);
    } catch (e) {
        // Ignore
    }

    // Extract from markdown code blocks
    const match = cleanContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            // Ignore
        }
    }

    // Find JSON structure using regex for braces
    // This is a simplified JS version of the Python logic.
    // We'll look for the first '{' and last '}'
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = cleanContent.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(potentialJson);
        } catch (e) {
            // If that fail, we might try to find inner braces, but keeping it simple for now.
        }
    }

    throw new Error(\`Could not parse JSON. Content length: \${content.length}\`);
}
