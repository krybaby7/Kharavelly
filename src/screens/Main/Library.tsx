import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Book, BookStatus } from '../../types';
import { libraryService } from '../../services/library';
import { useFocusEffect } from '@react-navigation/native';

export const LibraryScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [books, setBooks] = useState<Book[]>([]);
    const [activeTab, setActiveTab] = useState<BookStatus>('reading');

    const loadBooks = async () => {
        // In a real app, we'd filter locally or request from DB specific status
        // For now, load all and filter
        const allBooks = await libraryService.loadLibrary();
        const filtered = Object.values(allBooks).filter(b => b.status === activeTab);
        setBooks(filtered);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadBooks();
        }, [activeTab])
    );

    const renderTab = (title: string, key: BookStatus) => (
        <TouchableOpacity
            style={[styles.tab, activeTab === key && styles.activeTab]}
            onPress={() => setActiveTab(key)}
        >
            <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>{title}</Text>
        </TouchableOpacity>
    );

    const renderBookItem = ({ item }: { item: Book }) => (
        <TouchableOpacity
            style={styles.bookItem}
            onPress={() => navigation.navigate('BookDetail', { book: item })}
        >
            <View style={styles.bookCover}>
                {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
                ) : (
                    <View style={styles.placeholderCover} />
                )}
            </View>
            <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor}>{item.author}</Text>
                <View style={styles.tropesContainer}>
                    {item.tropes.slice(0, 3).map((trope, index) => (
                        <View key={index} style={styles.tropeTag}>
                            <Text style={styles.tropeText}>{trope}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Library</Text>
            </View>

            <View style={styles.tabsContainer}>
                {renderTab('Reading', 'reading')}
                {renderTab('Read', 'read')}
                {renderTab('TBR', 'tbr')}
            </View>

            <FlatList
                data={books}
                renderItem={renderBookItem}
                keyExtractor={(item) => `${item.title}-${item.author}`}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No books in this shelf yet.</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Curator')}>
                            <Text style={styles.emptyAction}>Find something new</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: SPACING.xl,
    },
    header: {
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.m,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.primary,
        fontFamily: FONTS.bold,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.m,
    },
    tab: {
        marginRight: SPACING.m,
        paddingBottom: SPACING.s,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
    },
    tabText: {
        fontSize: 16,
        color: colors.textLight,
        fontWeight: '600',
    },
    activeTabText: {
        color: colors.primary,
    },
    listContent: {
        paddingHorizontal: SPACING.l,
        paddingBottom: 100,
    },
    bookItem: {
        flexDirection: 'row',
        marginBottom: SPACING.m,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: SPACING.s,
    },
    bookCover: {
        width: 60,
        height: 90,
        marginRight: SPACING.m,
    },
    coverImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    placeholderCover: {
        flex: 1,
        backgroundColor: colors.border,
        borderRadius: 8,
    },
    bookInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    bookAuthor: {
        fontSize: 14,
        color: colors.textLight,
        marginBottom: 8,
    },
    tropesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    tropeTag: {
        backgroundColor: colors.background,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tropeText: {
        fontSize: 10,
        color: colors.textLight,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    emptyText: {
        color: colors.textLight,
        fontSize: 16,
        marginBottom: 8,
    },
    emptyAction: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
