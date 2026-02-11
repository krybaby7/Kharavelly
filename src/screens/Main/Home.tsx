import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Book } from '../../types';
import { feedService } from '../../services/feed';
import { libraryService } from '../../services/library';
import { useFocusEffect } from '@react-navigation/native';


const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.6;
const HERO_HEIGHT = width * 1.2;

export const HomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [feedItems, setFeedItems] = useState<Book[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentRead, setCurrentRead] = useState<Book | null>(null);

    const loadData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            const library = await libraryService.loadLibrary();
            const books = Object.values(library);

            // Find current read
            const reading = books.find(b => b.status === 'reading');
            if (reading) setCurrentRead(reading);
            else setCurrentRead(null);

            const feed = await feedService.generateDailyFeed(forceRefresh);
            setFeedItems(feed);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadData(true);
        setRefreshing(false);
    }, []);

    const renderLargeCard = ({ item }: { item: Book }) => (
        <TouchableOpacity
            style={styles.largeCard}
            onPress={() => navigation.navigate('BookDetail', { book: item })}
            activeOpacity={0.8}
        >
            <Image
                source={{ uri: item.coverImage || 'https://via.placeholder.com/200x300' }}
                style={styles.largeCardImage}
            />
            <Text style={styles.largeCardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.largeCardAuthor} numberOfLines={1}>{item.author}</Text>

            {(item.tropes && item.tropes.length > 0) && (
                <View style={styles.cardTags}>
                    {item.tropes.slice(0, 2).map((trope, i) => (
                        <Text key={i} style={styles.cardTagText} numberOfLines={1}>#{trope}</Text>
                    ))}
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading && feedItems.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const heroBook = feedItems.length > 0 ? feedItems[0] : null;

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Good Evening</Text>
            </View>

            {heroBook && (
                <TouchableOpacity
                    style={styles.heroContainer}
                    onPress={() => navigation.navigate('BookDetail', { book: heroBook })}
                    activeOpacity={0.9}
                >
                    {/* Hero Background - Atmospheric */}
                    <Image
                        source={{ uri: heroBook.coverImage || 'https://via.placeholder.com/400x600' }}
                        style={styles.heroBg}
                        blurRadius={30}
                    />
                    <View style={styles.heroGradientOverlay} />

                    {/* Hero Content - Centered Card */}
                    <View style={styles.heroInner}>
                        <View style={styles.heroImageContainer}>
                            <Image
                                source={{ uri: heroBook.coverImage || 'https://via.placeholder.com/400x600' }}
                                style={styles.heroImage}
                            />
                        </View>

                        <View style={styles.heroInfo}>
                            <Text style={styles.heroLabel}>DAILY PICK</Text>
                            <Text style={styles.heroTitle} numberOfLines={2}>{heroBook.title}</Text>
                            <Text style={styles.heroAuthor}>{heroBook.author}</Text>

                            {/* Tropes/Microthemes */}
                            {(heroBook.tropes && heroBook.tropes.length > 0) && (
                                <View style={styles.heroTags}>
                                    {heroBook.tropes.slice(0, 3).map((trope, i) => (
                                        <View key={i} style={styles.tagPillHero}>
                                            <Text style={styles.tagTextHero}>{trope}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            )}

            {/* Currently Reading (Minimal) */}
            {currentRead && (
                <View style={[styles.section, { paddingHorizontal: SPACING.l }]}>
                    <Text style={styles.sectionTitle}>Continue Reading</Text>
                    <TouchableOpacity
                        style={styles.miniPlayer}
                        onPress={() => navigation.navigate('BookDetail', { book: currentRead })}
                    >
                        <Image source={{ uri: currentRead.coverImage }} style={styles.miniCover} />
                        <View style={styles.miniInfo}>
                            <Text style={styles.miniTitle}>{currentRead.title}</Text>
                            <Text style={styles.miniSubtitle}>
                                {currentRead.progress ? `Page ${currentRead.progress}` : 'Start reading...'}
                            </Text>
                            <View style={styles.miniProgressMap}>
                                <View
                                    style={{
                                        width: `${Math.min(((currentRead.progress || 0) / (currentRead.total_pages || 300)) * 100, 100)}%`,
                                        height: '100%',
                                        backgroundColor: colors.primary
                                    }}
                                />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Horizontal Feed */}
            {feedItems.length > 1 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>For You</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                        {feedItems.slice(1).map((item, index) => (
                            <View key={index} style={{ marginRight: SPACING.m }}>
                                {renderLargeCard({ item })}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.m,
    },
    headerTitle: {
        fontSize: 32,
        color: colors.white, // Keep white for hero overlay? Or dynamic? Hero overlay is usually dark.
        // Wait, Home doesn't have a headerTitle rendered. 
        fontFamily: FONTS.bold,
        letterSpacing: -0.5,
    },
    // Hero
    heroContainer: {
        width: width,
        height: width * 1.4, // Provide enough space
        marginBottom: SPACING.xl,
        position: 'relative',
        backgroundColor: colors.black,
        overflow: 'hidden',
    },
    heroBg: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.4,
    },
    heroGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    heroInner: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 40,
        paddingHorizontal: SPACING.l,
    },
    heroImageContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: SPACING.l,
    },
    heroImage: {
        width: width * 0.5,
        height: (width * 0.5) * 1.5,
        borderRadius: 8,
    },
    heroInfo: {
        alignItems: 'center',
        width: '100%',
    },
    heroLabel: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: colors.white,
        fontSize: 28,
        fontFamily: FONTS.bold,
        textAlign: 'center',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    heroAuthor: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        fontFamily: FONTS.regular,
        marginBottom: 12,
    },
    heroTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    tagPillHero: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    tagTextHero: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '500',
    },
    // Sections
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 20,
        color: colors.text, // Dynamic
        fontFamily: FONTS.bold,
        marginLeft: SPACING.l, // Fixed marginLeft since it was removed from parent View in previous step logic? 
        // Wait, "Continue Reading" section has paddingHorizontal. "For You" does not.
        // "For You" title needs margin.
        marginBottom: SPACING.m,
    },
    horizontalList: {
        paddingLeft: SPACING.l,
        paddingRight: SPACING.l,
    },
    // Large Card
    largeCard: {
        width: width * 0.45,
    },
    largeCardImage: {
        width: '100%',
        height: (width * 0.45) * 1.5,
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: colors.card,
    },
    largeCardTitle: {
        color: colors.text, // Dynamic
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    largeCardAuthor: {
        color: colors.textLight,
        fontSize: 14,
        marginBottom: 4,
    },
    cardTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    cardTagText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: '500',
    },
    // Mini Player
    miniPlayer: {
        // marginHorizontal: SPACING.l, // parent has padding
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    miniCover: {
        width: 40,
        height: 60,
        borderRadius: 4,
        marginRight: 12,
        backgroundColor: colors.background,
    },
    miniInfo: {
        flex: 1,
    },
    miniTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    miniSubtitle: {
        color: colors.textLight,
        fontSize: 12,
        marginBottom: 6,
    },
    miniProgressMap: {
        height: 2,
        backgroundColor: colors.border,
        borderRadius: 1,
        width: '100%',
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

