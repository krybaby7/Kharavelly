import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/common/Button';
import { buildRecommendationPrompt, callPerplexity } from '../../services/perplexity';
import { HistoryService } from '../../services/history';
import { bookService } from '../../services/bookService';
import { BookInputList } from '../../components/Curator/BookInputList';
import { Book } from '../../types';
import { parseJson } from '../../utils/helpers';
import { PerplexityResponse } from '../../types';
import { CONFIG } from '../../config';

// Placeholder key
const DEMO_API_KEY = CONFIG.PERPLEXITY_API_KEY;

export const QuickRecsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(false);

    const handleGetRecs = async (titles: string[]) => {
        setLoading(true);

        const booksList = titles;
        const prompt = buildRecommendationPrompt(booksList, 'Quick Recs');

        const result = await callPerplexity(prompt, CONFIG.PERPLEXITY_MODEL, DEMO_API_KEY);
        setLoading(false);

        if (result.success && result.content) {
            try {
                const data: PerplexityResponse = parseJson(result.content);
                if (data.recommendations && data.recommendations.length > 0) {
                    const hydratedRecs = await bookService.hydrateBooksList(data.recommendations);
                    await HistoryService.saveHistory('quick', booksList.join(', '), hydratedRecs);
                    navigation.navigate('RecResults', { recommendations: hydratedRecs });
                } else {
                    Alert.alert("No recommendations found.");
                }
            } catch (e) {
                Alert.alert("Error", "Could not parse recommendations.");
            }
        } else {
            Alert.alert("Error", result.error || "Failed to fetch recommendations.");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Instant Match</Text>
            <Text style={styles.subtitle}>List 3-5 books you enjoyed recently.</Text>

            <BookInputList
                onSubmit={handleGetRecs}
                loading={loading}
                submitLabel="Get Recommendations"
            />
        </ScrollView>
    );
};

export const ContextRecsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [bookTitles, setBookTitles] = useState<string[]>([]);
    const [contextInput, setContextInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGetRecs = async () => {
        if (!contextInput.trim()) {
            Alert.alert("Context Required", "Please describe what you are looking for.");
            return;
        }

        setLoading(true);
        const booksList = bookTitles;
        const prompt = buildRecommendationPrompt(booksList, 'Books + Context', contextInput);

        const result = await callPerplexity(prompt, CONFIG.PERPLEXITY_MODEL, DEMO_API_KEY);
        setLoading(false);

        if (result.success && result.content) {
            try {
                const data: PerplexityResponse = parseJson(result.content);
                if (data.recommendations && data.recommendations.length > 0) {
                    const hydratedRecs = await bookService.hydrateBooksList(data.recommendations);
                    await HistoryService.saveHistory('context', contextInput, hydratedRecs);
                    navigation.navigate('RecResults', { recommendations: hydratedRecs });
                } else {
                    Alert.alert("No recommendations found.");
                }
            } catch (e) {
                Alert.alert("Error", "Could not parse recommendations.");
            }
        } else {
            Alert.alert("Error", result.error || "Failed to fetch recommendations.");
        }
    };

    const handleBooksSubmit = (titles: string[]) => {
        setBookTitles(titles);
        Alert.alert("List Updated", `Included ${titles.length} books for context.`);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Context Chat</Text>

            <Text style={styles.label}>Reference Books (Optional)</Text>

            <BookInputList
                onSubmit={handleBooksSubmit}
                submitLabel="Update Book List"
            />

            <Text style={styles.label}>What are you looking for? (Required)</Text>
            <TextInput
                style={[styles.input, { height: 120 }]}
                multiline
                placeholder="e.g. I want something with high stakes but a happy ending..."
                placeholderTextColor={colors.textLight}
                value={contextInput}
                onChangeText={setContextInput}
                textAlignVertical="top"
            />

            <Button
                title="Find My Book"
                onPress={handleGetRecs}
                loading={loading}
                variant="primary"
            />
        </ScrollView>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        padding: SPACING.l,
        backgroundColor: colors.background,
        flexGrow: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textLight,
        marginBottom: SPACING.l,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
    },
    input: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: SPACING.m,
        fontSize: 16,
        minHeight: 100,
        marginBottom: SPACING.l,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
});
