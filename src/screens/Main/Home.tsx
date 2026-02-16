import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Book, FeedSection as FeedSectionType, NewsArticle } from '../../types';
import { feedService } from '../../services/feed';
import { libraryService } from '../../services/library';
import { HistoryService } from '../../services/history';
import { GenreSelector } from '../../components/home/GenreSelector';
import { FeedSection } from '../../components/home/FeedSection';
import { NewsSection } from '../../components/home/NewsSection';
import { FeedLoading } from '../../components/home/FeedLoading';

export const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [feedSections, setFeedSections] = useState<FeedSectionType[]>([]);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [readingStats, setReadingStats] = useState({ totalBooks: 0, totalPages: 0 });

    // Initial loading state
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async (forceRefresh = false) => {
        if (!refreshing) setLoading(true);
        try {
            // 1. Load Library for Analytics
            const library = await libraryService.loadLibrary();
            const books = Object.values(library);
            const readBooks = books.filter(b => b.status === 'read');
            setReadingStats({
                totalBooks: readBooks.length,
                totalPages: readBooks.reduce((acc, b) => acc + (b.total_pages || 0), 0)
            });

            // 2. Load History
            try {
                const history = await HistoryService.getHistory();
                // Flatten recent recommendations
                const recentRecs = history.flatMap(h => h.recommendations).slice(0, 10);
                if (recentRecs.length > 0) {
                    // Add as a pseudo-section
                    setHistoryItems(recentRecs);
                }
            } catch (e) {
                console.log("History fetch failed", e);
            }

            // 3. Load Feed (Perplexity)
            const sections = await feedService.generateHomepageFeed(selectedGenres, forceRefresh);
            setFeedSections(sections);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Reload when genres change
    useEffect(() => {
        loadData();
    }, [selectedGenres]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData(true);
    }, [selectedGenres]);

    const toggleGenre = (genre: string) => {
        if (selectedGenres.includes(genre)) {
            setSelectedGenres(selectedGenres.filter(g => g !== genre));
        } else {
            setSelectedGenres([...selectedGenres, genre]);
        }
    };

    const clearGenres = () => {
        setSelectedGenres([]);
    };

    const handleBookPress = (book: Book) => {
        navigation.navigate('BookDetail', { book });
    };



    const handleSwipeRight = (book: Book) => {
        // Swipe Right -> TBR
        libraryService.addBook({ ...book, status: 'tbr' })
            .catch(e => console.error("Failed to add to TBR", e));

        // Update local state to remove book
        setFeedSections(current => current.map(section => ({
            ...section,
            data: (section.type === 'books' || section.id === 'history')
                ? (section.data as Book[]).filter(b => b.title !== book.title)
                : section.data
        })));

        if (historyItems.some(b => b.title === book.title)) {
            setHistoryItems(prev => prev.filter(b => b.title !== book.title));
        }
    };

    const handleSwipeLeft = (book: Book) => {
        // Swipe Left -> Read
        libraryService.addBook({ ...book, status: 'read' })
            .catch(e => console.error("Failed to add to Read", e));

        // Update local state to remove book
        setFeedSections(current => current.map(section => ({
            ...section,
            data: (section.type === 'books' || section.id === 'history')
                ? (section.data as Book[]).filter(b => b.title !== book.title)
                : section.data
        })));

        if (historyItems.some(b => b.title === book.title)) {
            setHistoryItems(prev => prev.filter(b => b.title !== book.title));
        }
    };

    const handleSeeAll = (sectionTitle: string, books: Book[]) => {
        navigation.navigate('SectionDetail', { title: sectionTitle, books });
    };

    const renderAnalyticsCard = () => (
        <View style={styles.analyticsCard}>
            <Text style={styles.cardTitle}>Your Reading Analytics</Text>
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{readingStats.totalBooks}</Text>
                    <Text style={styles.statLabel}>Books Read</Text>
                </View>
                <View style={[styles.statItem, styles.statBorder]}>
                    <Text style={styles.statValue}>{readingStats.totalPages}</Text>
                    <Text style={styles.statLabel}>Pages Read</Text>
                </View>
            </View>
        </View>
    );

    const renderChatPlaceholder = () => (
        <TouchableOpacity style={[styles.chatBanner, { backgroundColor: colors.isDark ? 'rgba(139, 0, 0, 0.1)' : '#1a1a1a' }]}>
            <View>
                <Text style={styles.chatTitle}>Chat with AI Specialist</Text>
                <Text style={styles.chatSubtitle}>Coming Soon</Text>
            </View>
            <View style={styles.chatButton}>
                <Text style={styles.chatButtonText}>Join Waitlist</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Good Evening</Text>
                <Text style={styles.headerSubtitle}>Ready to find your next great read?</Text>
            </View>

            <View style={styles.genreContainer}>
                <GenreSelector
                    selectedGenres={selectedGenres}
                    onToggleGenre={toggleGenre}
                    onClear={clearGenres}
                />
            </View>

            {loading ? (
                <FeedLoading />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* 1. Dynamic Feed Sections (Books) */}
                    {feedSections.filter(s => s.type === 'books').map((section) => (
                        <FeedSection
                            key={section.id}
                            title={section.title}
                            books={section.data as Book[]}
                            onBookPress={handleBookPress}
                            onSwipeLeft={handleSwipeLeft}
                            onSwipeRight={handleSwipeRight}
                            onSeeAll={() => handleSeeAll(section.title, section.data as Book[])}
                        />
                    ))}

                    {/* 2. News Section */}
                    {feedSections.find(s => s.type === 'news') && (
                        <NewsSection articles={feedSections.find(s => s.type === 'news')?.data as NewsArticle[]} />
                    )}

                    {/* 2.5 Recently Recommended */}
                    {historyItems.length > 0 && (
                        <FeedSection
                            title="Recently Recommended"
                            books={historyItems}
                            onBookPress={handleBookPress}
                            onSwipeLeft={handleSwipeLeft}
                            onSwipeRight={handleSwipeRight}
                            onSeeAll={() => handleSeeAll("Recently Recommended", historyItems)}
                        />
                    )}

                    {/* 3. Analytics */}
                    {renderAnalyticsCard()}

                    {/* 4. Chat Banner */}
                    {renderChatPlaceholder()}

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    toggleContainer: {
        alignItems: 'center',
        marginTop: 5,
    },
    toggleLabel: {
        fontSize: 10,
        color: colors.textLight,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: FONTS.heading,
        color: colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: FONTS.regular,
        color: colors.textLight,
    },
    genreContainer: {
        marginBottom: 10,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyticsCard: {
        marginHorizontal: 20,
        marginBottom: 30,
        padding: 20,
        backgroundColor: colors.card,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 15,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statBorder: {
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
    },
    statLabel: {
        fontSize: 14,
        color: colors.textLight,
        marginTop: 4,
    },
    chatBanner: {
        marginHorizontal: 20,
        marginBottom: 30,
        padding: 24,
        backgroundColor: '#1a1a1a', // Dark theme for contrast
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    chatSubtitle: {
        fontSize: 14,
        color: '#aaa',
    },
    chatButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    chatButtonText: {
        fontWeight: '600',
        color: '#000',
    },
});


