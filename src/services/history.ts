import { supabase } from './supabase';
import { Book, RecHistoryItem } from '../types';

export const HistoryService = {
    async saveHistory(
        sourceType: 'quick' | 'context' | 'interview',
        promptContext: string,
        recommendations: Book[],
        introText?: string,
        cost?: number
    ): Promise<void> {
        if (!recommendations || recommendations.length === 0) return;

        const { error } = await supabase
            .from('recommendation_history')
            .insert({
                source_type: sourceType,
                prompt_context: promptContext,
                recommendations: recommendations,
                intro_text: introText,
                cost: cost
            });

        if (error) {
            console.error("Failed to save recommendation history:", error);
        }
    },

    async getHistory(): Promise<RecHistoryItem[]> {
        const { data, error } = await supabase
            .from('recommendation_history')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Failed to fetch history:", error);
            return [];
        }

        return data as RecHistoryItem[];
    }
};
