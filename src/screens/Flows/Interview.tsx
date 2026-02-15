import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/common/Button';
import { InterviewState } from '../../types';
import { generateInterviewQuestion, analyzeUserProfile, buildRecommendationPrompt, callPerplexity, calculateCost } from '../../services/perplexity';
import { HistoryService } from '../../services/history';
import { bookService } from '../../services/bookService';
// Note: services/perplexity.ts needs to export startInterview etc which I haven't implemented fully in that file yet!
// I implemented generateInterviewQuestion and analyzeUserProfile but NOT the high level wrappers like startInterview/processInterviewAnswer from the python code.
// I should implement the logic directly here or add wrappers to service. 
// I will implement Logic HERE using the service functions I created.

import { parseJson } from '../../utils/helpers';
import { CONFIG } from '../../config';
import { BookInputList } from '../../components/Curator/BookInputList';
import { Book } from '../../types';

// Placeholder for API Key - in real app should be in Context or Settings
const DEMO_API_KEY = CONFIG.PERPLEXITY_API_KEY;

export const InterviewScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    // State
    const [setupPhase, setSetupPhase] = useState<'method_choice' | 'context_input' | 'interview'>('method_choice');
    // Removed verification state
    const [history, setHistory] = useState<{ role: 'assistant' | 'user', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState(1);
    const [questionCount, setQuestionCount] = useState(0);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [completed, setCompleted] = useState(false);

    // const [totalCost, setTotalCost] = useState(0); // Removing state based cost
    const totalCostRef = useRef(0); // Use ref for accurate cost tracking
    const [displayCost, setDisplayCost] = useState(0); // For UI display only

    const scrollViewRef = useRef<ScrollView>(null);
    const insets = useSafeAreaInsets(); // Hook for safe area

    // Remove auto-start useEffect since we have a setup phase now

    // Store context books for recommendation phase
    const contextBooksRef = useRef<string[]>([]);

    const startSession = async (books: string[] = []) => {
        contextBooksRef.current = books;
        setLoading(true);
        // Transition to interview view immediately to show loading state there
        setSetupPhase('interview');

        // Call API for first question
        // Hardcoded model/key for now or from env
        const result = await generateInterviewQuestion(books, [], 0, 1, undefined, undefined, CONFIG.PERPLEXITY_MODEL, DEMO_API_KEY);

        if (result && result.question) {
            setHistory([{ role: 'assistant', content: result.question }]);
            setQuestionCount(1);
            if (result.usage) {
                const cost = calculateCost(CONFIG.PERPLEXITY_MODEL, result.usage);
                console.log("Initial Question Cost:", cost);
                totalCostRef.current += cost;
                setDisplayCost(totalCostRef.current);
            }
        } else if (result && result.error) {
            setHistory([{ role: 'assistant', content: "Error starting interview. Please check API Key." }]);
        }
        setLoading(false);
    };

    const [finalQuestionAsked, setFinalQuestionAsked] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        const newHistory = [...history, { role: 'user' as const, content: userMsg }];
        setHistory(newHistory);
        setQuestionCount(prev => prev + 1);
        setLoading(true);

        // If we just asked the final question, we are now ready to complete
        if (finalQuestionAsked) {
            setCompleted(true);
            setHistory(prev => [...prev, { role: 'assistant', content: "Perfect! I have enough information to find your next favorite book." }]);
            setLoading(false);
            return;
        }

        const currentCount = questionCount + 1; // +1 because we just answered

        // Check Phase Transition
        let currentProfile = userProfile;
        let currentPhase = phase;

        if (currentCount === 2 && phase === 1) {
            const analysis = await analyzeUserProfile(newHistory, [], CONFIG.PERPLEXITY_MODEL, DEMO_API_KEY);
            if (analysis && !analysis.error) {
                currentProfile = analysis;
                setUserProfile(analysis);
                setPhase(2);
                currentPhase = 2;
                if (analysis.usage) {
                    const cost = calculateCost(CONFIG.PERPLEXITY_MODEL, analysis.usage);
                    console.log("Analysis Cost:", cost);
                    totalCostRef.current += cost;
                    setDisplayCost(totalCostRef.current);
                }
                // Could show a toast about adapting style
            }
        }

        const result = await generateInterviewQuestion(
            [], // Books list - assuming empty for pure interview for now, or passed via params
            newHistory,
            currentCount,
            currentPhase,
            currentProfile?.user_profile,
            currentProfile,
            CONFIG.PERPLEXITY_MODEL,
            DEMO_API_KEY
        );

        setLoading(false);

        if (result) {
            if (result.usage) {
                const cost = calculateCost(CONFIG.PERPLEXITY_MODEL, result.usage);
                console.log("Question Cost:", cost);
                totalCostRef.current += cost;
                setDisplayCost(totalCostRef.current);
            }

            if (result.continue_interview) {
                setHistory(prev => [...prev, { role: 'assistant', content: result.question }]);
            } else {
                // The prompt now includes the "Anything else?" question as the final question
                // So if continue_interview is false, it means we are done prompting
                // But wait, if continue_interview is false, `result.question` might be the "Anything else?" question?
                // The prompt says: "your final question ... should explicitly be: 'Is there anything else...'"
                // And "continue_interview": boolean.
                // If it returns true, it asks the next question.
                // If it returns false, it means it's ready to recommend?
                // The prompt says "continue_interview: boolean // true if more info is needed, false if ready to recommend"

                // If false, we should probably still show the last question if there is one?
                // Actually, if false, we might want to transition to a "Ready" state?
                // But the user needs to answer "No" to "Anything else?".

                // Let's assume if continue_interview is false, we are done.
                // But we need to give the user a chance to say "No, that's it".

                // Actually, the prompt says "final question ... should explicitly be ...".
                // So `continue_interview` might still be true when asking that question?
                // Or maybe `continue_interview` becomes false AFTER the user answers that question?

                // Let's modify: If `result.next_question` contains "Anything else", we are at the end.

                setHistory(prev => [...prev, { role: 'assistant', content: result.question || "I have enough information. Ready to see your recommendations?" }]);
                setCompleted(true);
            }
        }
    };

    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

    const handleGetRecommendations = async () => {
        setLoading(true);
        setLoadingMessage("Performing deep research... This may take a few minutes.");

        // Build context from history
        const interviewContext = history
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join('\n');

        const prompt = buildRecommendationPrompt(
            contextBooksRef.current, // Use stored context books
            'Full Interview',
            undefined,
            interviewContext, // Transcript
            userProfile?.user_profile // Pass the generated profile
        );
        // Use sonar-deep-research for the final recommendation generation as requested
        const deepModel = 'sonar-deep-research';
        const result = await callPerplexity(prompt, deepModel, DEMO_API_KEY);

        if (result.success && result.content) {
            let finalTotalCost = totalCostRef.current;
            if (result.usage) {
                const cost = calculateCost(deepModel, result.usage);
                console.log("Rec Cost:", cost);
                totalCostRef.current += cost;
                finalTotalCost = totalCostRef.current;
                setDisplayCost(finalTotalCost);
            }

            setLoadingMessage("Found recommendations. Fetching book details...");
            try {
                const data = parseJson(result.content);
                if (data.recommendations && data.recommendations.length > 0) {
                    const hydratedRecs = await bookService.hydrateBooksList(
                        data.recommendations,
                        (status) => setLoadingMessage(status)
                    );
                    // Pass the profile or intro text
                    // If we have data.analysis.reader_profile from this call, use it.
                    // Otherwise fall back to userProfile?.user_profile or just empty.
                    // The prompt ensures "intro_text" is returned or "reader_profile" inside "analysis"?
                    // The new RECOMMENDATION_PROMPT returns "intro_text".
                    const introText = data.intro_text || userProfile?.user_profile;

                    await HistoryService.saveHistory('interview', interviewContext, hydratedRecs, introText, finalTotalCost);
                    setLoading(false);
                    setLoadingMessage(null);
                    navigation.navigate('RecResults', {
                        recommendations: hydratedRecs,
                        introText: introText,
                        totalCost: finalTotalCost
                    });
                } else {
                    // Fallback or error prompt
                    setLoading(false);
                    setLoadingMessage(null);
                    setHistory(prev => [...prev, { role: 'assistant', content: "I couldn't generate specific recommendations based on that. Try adding more details?" }]);
                }
            } catch (e: any) {
                console.error("[Interview] Error processing recommendations:", e, e.message);
                setLoading(false);
                setLoadingMessage(null);
                setHistory(prev => [...prev, { role: 'assistant', content: "Error processing recommendations: " + (e.message || "Unknown error") }]);
            }
        } else {
            setLoading(false);
            setLoadingMessage(null);
            setHistory(prev => [...prev, { role: 'assistant', content: "Failed to connect to recommendation service." }]);
        }
    };

    const handleStartWithContext = (titles: string[]) => {
        startSession(titles);
    };

    const renderSetupPhase = () => {
        if (setupPhase === 'method_choice') {
            return (
                <View style={styles.setupContainer}>
                    <Text style={styles.setupTitle}>How would you like to start?</Text>
                    <Text style={styles.setupSubtitle}>You can provide some books you already love to help guide the interview, or start from scratch.</Text>

                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => setSetupPhase('context_input')}
                    >
                        <Text style={styles.optionTitle}>Start with Context</Text>
                        <Text style={styles.optionDesc}>I'll list a few books I like so you know my taste.</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.optionButton, styles.optionButtonSecondary]}
                        onPress={() => startSession([])}
                    >
                        <Text style={[styles.optionTitle, styles.secondaryText]}>Start from Scratch</Text>
                        <Text style={[styles.optionDesc, styles.secondaryText]}>Just ask me questions to figure it out.</Text>
                    </TouchableOpacity>
                </View>
            );
        } else if (setupPhase === 'context_input') {
            return (
                <ScrollView contentContainerStyle={styles.setupContainer}>
                    <Text style={styles.setupTitle}>Add Context Books</Text>
                    <Text style={styles.setupSubtitle}>List 3-5 books you enjoyed recently.</Text>

                    <BookInputList
                        onSubmit={handleStartWithContext}
                        submitLabel="Start Interview"
                    />

                    <TouchableOpacity style={styles.backButton} onPress={() => setSetupPhase('method_choice')}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                </ScrollView>
            );
        }
        return null;
    };

    if (setupPhase !== 'interview') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Interview Setup</Text>
                </View>
                {renderSetupPhase()}
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Interview</Text>
                <Text style={styles.headerSubtitle}>Phase {phase}</Text>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {history.map((msg, index) => (
                    <View key={index} style={[
                        styles.bubble,
                        msg.role === 'user' ? styles.userBubble : styles.aiBubble
                    ]}>
                        <Text style={[
                            styles.msgText,
                            msg.role === 'user' ? styles.userText : styles.aiText
                        ]}>{msg.content}</Text>
                    </View>
                ))}

                {loading && (
                    <View style={[styles.bubble, styles.aiBubble]}>
                        <Text style={styles.aiText}>...</Text>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.inputContainer, { paddingBottom: Math.max(SPACING.m, insets.bottom) }]}>
                {completed ? (
                    <View>
                        {loadingMessage && (
                            <Text style={styles.loadingText}>{loadingMessage}</Text>
                        )}
                        <Button
                            title={loading ? "Processing..." : "See Recommendations"}
                            onPress={handleGetRecommendations}
                            loading={loading}
                        />
                    </View>
                ) : (
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Type your answer..."
                            onSubmitEditing={handleSend}
                        />
                        <Button
                            title="Send"
                            onPress={handleSend}
                            style={styles.sendBtn}
                            loading={loading}
                        />
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primary,
        fontFamily: FONTS.bold,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textLight,
        fontFamily: FONTS.regular,
    },
    chatContainer: {
        flex: 1,
    },
    chatContent: {
        padding: SPACING.m,
        paddingBottom: 20,
    },
    bubble: {
        maxWidth: '80%',
        padding: SPACING.m,
        borderRadius: 16,
        marginBottom: SPACING.m,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: colors.primary,
        borderBottomRightRadius: 2,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: colors.card,
        borderBottomLeftRadius: 2,
    },
    msgText: {
        fontSize: 16,
        lineHeight: 22,
        fontFamily: FONTS.regular,
    },
    userText: {
        color: colors.white, // assuming primary is dark enough or we need a contrasting color
    },
    aiText: {
        color: colors.text,
    },
    inputContainer: {
        padding: SPACING.m,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 24,
        paddingHorizontal: SPACING.m,
        paddingVertical: 12,
        marginRight: SPACING.s,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sendBtn: {
        minWidth: 80,
        paddingHorizontal: SPACING.m,
    },
    setupContainer: {
        flex: 1,
        padding: SPACING.l,
        justifyContent: 'center',
    },
    setupTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: SPACING.s,
        textAlign: 'center',
        fontFamily: FONTS.bold,
    },
    setupSubtitle: {
        fontSize: 16,
        color: colors.textLight,
        marginBottom: SPACING.xl,
        textAlign: 'center',
        fontFamily: FONTS.regular,
    },
    optionButton: {
        backgroundColor: colors.card,
        padding: SPACING.l,
        borderRadius: 16,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: colors.border,
    },
    optionButtonSecondary: {
        backgroundColor: 'transparent',
        borderColor: colors.primary,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
        fontFamily: FONTS.bold,
    },
    optionDesc: {
        fontSize: 14,
        color: colors.textLight,
        fontFamily: FONTS.regular,
    },
    secondaryText: {
        color: colors.primary,
    },
    contextInput: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: SPACING.m,
        fontSize: 16,
        minHeight: 120,
        marginBottom: SPACING.l,
        color: colors.text,
    },
    backButton: {
        marginTop: SPACING.m,
        alignItems: 'center',
    },
    backButtonText: {
        color: colors.textLight,
        fontSize: 16,
    },
    loadingText: {
        textAlign: 'center',
        color: colors.textLight,
        marginBottom: SPACING.s,
        fontSize: 14,
        fontStyle: 'italic'
    },
});
