import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { NewsArticle } from '../../types';
import { FONTS } from '../../theme';

import { useTheme } from '../../theme/ThemeContext';

interface NewsSectionProps {
    articles: NewsArticle[];
}

export const NewsSection: React.FC<NewsSectionProps> = ({ articles }) => {
    const { colors } = useTheme();
    if (!articles || articles.length === 0) return null;

    const handlePress = (url?: string) => {
        if (url) Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Literary News</Text>
            </View>
            <FlatList
                horizontal
                data={articles}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => handlePress(item.url)}
                        disabled={!item.url}
                    >
                        <View style={styles.sourceTag}>
                            <Text style={styles.sourceText}>{item.source}</Text>
                        </View>
                        <Text style={[styles.headline, { color: colors.text }]} numberOfLines={3}>{item.title}</Text>
                        <Text style={[styles.summary, { color: colors.textLight }]} numberOfLines={2}>{item.summary}</Text>
                        <Text style={styles.date}>{item.date}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 30,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    title: {
        fontSize: 24,
        fontFamily: FONTS.heading,
        color: '#000',
        letterSpacing: -0.5,
        marginBottom: 4,
        paddingHorizontal: 20,
    },
    listContent: {
        paddingHorizontal: 20,
        gap: 15,
    },
    card: {
        width: 280,
        height: 180,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sourceTag: {
        alignSelf: 'flex-start',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    sourceText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#666',
        textTransform: 'uppercase',
    },
    headline: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 6,
        lineHeight: 22,
    },
    summary: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginTop: 'auto',
    },
});
