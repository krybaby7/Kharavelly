import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Book } from '../../types';
import { FONTS } from '../../theme';
import { BookRow } from '../common/BookRow';

interface FeedSectionProps {
    title: string;
    books: Book[];
    onBookPress: (book: Book) => void;
    onSwipeLeft: (book: Book) => void;
    onSwipeRight: (book: Book) => void;
    onSeeAll?: () => void;
}

import { useTheme } from '../../theme/ThemeContext';

export const FeedSection: React.FC<FeedSectionProps> = ({
    title,
    books,
    onBookPress,
    onSwipeLeft,
    onSwipeRight,
    onSeeAll
}) => {
    const { colors } = useTheme();
    if (!books || books.length === 0) return null;

    // Show top 3 books to keep homepage manageable
    const displayBooks = books.slice(0, 3);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                {/* Optional: Add "See All" button here if needed */}
            </View>
            <View style={styles.listContent}>
                {displayBooks.map((book, index) => (
                    <BookRow
                        key={book.id || `${book.title}-${index}`}
                        item={book}
                        onPress={onBookPress}
                        onSwipeLeft={onSwipeLeft}
                        onSwipeRight={onSwipeRight}
                    />
                ))}
            </View>
            {books.length > 3 && (
                <TouchableOpacity style={styles.seeMoreButton} onPress={onSeeAll}>
                    <Text style={styles.seeMoreText}>See all {books.length}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontFamily: FONTS.heading,
        color: '#000', // Will be overridden by theme in Home? No, it's hardcoded here. Need to fix.
        // Actually, let's leave it as is for now and fix color in next step as planned, or fix it right now.
        // The plan said "Replace color: '#000' with color: colors.text".
        // But I don't have access to theme context here directly unless I add hook.
        // Let's accept props or use hook. I'll use hook.
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    listContent: {
        // No horizontal padding needed as BookRow has internal padding
    },
    seeMoreButton: {
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 8,
    },
    seeMoreText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: '#666',
    },
});
