import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

export const CuratorScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const renderCard = (title: string, desc: string, target: string, color: string, textColor: string = colors.text) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: color }]}
            onPress={() => navigation.navigate('FlowStack', { screen: target })}
            activeOpacity={0.9}
        >
            <View>
                <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
                <Text style={[styles.cardDesc, { color: textColor }]}>{desc}</Text>
            </View>
            <View style={[styles.arrow, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                <Text style={[styles.arrowText, { color: textColor }]}>→</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>The Curator</Text>
                <Text style={styles.headerSubtitle}>How should we find your next read?</Text>
            </View>

            <View style={styles.cardsContainer}>
                {renderCard(
                    "Instant Match",
                    "Quick recommendations based on books you love.",
                    "QuickRecs",
                    colors.primaryLight,
                    colors.black // Ensure contrast on light peach
                )}
                {renderCard(
                    "Context Chat",
                    "Add specific context or a mood to your request.",
                    "ContextRecs",
                    colors.card, // Use card color (dark/white)
                    colors.text // Use text color (white/black)
                )}
                {/* Highlighted Card */}
                <TouchableOpacity
                    style={[styles.card, styles.interviewCard]}
                    onPress={() => navigation.navigate('FlowStack', { screen: 'Interview' })}
                    activeOpacity={0.9}
                >
                    <View>
                        <Text style={[styles.cardTitle, styles.lightText]}>Deep Dive Interview</Text>
                        <Text style={[styles.cardDesc, styles.lightText]}>
                            Let's have a conversation to find exactly what you need.
                        </Text>
                    </View>
                    <View style={[styles.arrow, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={[styles.arrowText, styles.lightText]}>→</Text>
                    </View>
                </TouchableOpacity>

                {
                    renderCard(
                        "History",
                        "View your past recommendation sessions.",
                        "RecHistory",
                        colors.border // Darker grey for history? Or just card color? 
                        // Let's use card color but slightly different if poss.
                    )
                }
            </View >
        </ScrollView >
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: SPACING.xl,
        paddingHorizontal: SPACING.l,
    },
    header: {
        marginBottom: SPACING.xl,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: SPACING.s,
        fontFamily: FONTS.bold,
    },
    headerSubtitle: {
        fontSize: 16,
        color: colors.textLight,
        maxWidth: '80%',
    },
    cardsContainer: {
        paddingBottom: 40,
    },
    card: {
        padding: SPACING.l,
        borderRadius: 20,
        marginBottom: SPACING.m,
        minHeight: 140,
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    interviewCard: {
        backgroundColor: colors.primary,
        minHeight: 180,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: SPACING.s,
        maxWidth: 200,
    },
    cardDesc: {
        fontSize: 14,
        color: colors.text,
        maxWidth: 180,
        opacity: 0.8,
    },
    lightText: {
        color: colors.white,
    },
    arrow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
});
