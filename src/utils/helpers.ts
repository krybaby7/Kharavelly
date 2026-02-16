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

    // Extract from markdown code blocks (robustly)
    // Match everything between ``` and ```, ignoring language tag
    const codeBlockMatch = cleanContent.match(/```(?:json)?([\s\S]*?)```/);
    if (codeBlockMatch) {
        // If code block found, try to parse its content
        // We recursively call parseJson on the inner content to handle potential thinking tags inside? 
        // No, thinking tags already stripped.
        // Just try parse, or let it fall through to brace matching on the inner content?
        // Let's try direct parse of the block content first.
        const inner = codeBlockMatch[1].trim();
        try {
            return JSON.parse(inner);
        } catch (e) {
            // failed to parse inner content directly, try finding braces inside it
            cleanContent = inner;
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

    throw new Error(`Could not parse JSON. Content length: ${content.length}`);
}
