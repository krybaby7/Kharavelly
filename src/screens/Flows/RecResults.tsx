import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, Animated, Switch } from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Book } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { libraryService } from '../../services/library';

const { width } = Dimensions.get('window');

const RecResultItem = ({
    item,
    onPress,
    onSwipeLeft,
    onSwipeRight
}: {
    item: Book;
    onPress: (book: Book) => void;
    onSwipeLeft: (book: Book) => void; // Swipe Left -> Read
    onSwipeRight: (book: Book) => void; // Swipe Right -> TBR
}) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const swipeableRef = useRef<Swipeable>(null);

    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            let name: any = 'star';
            if (i > rating) {
                if (i - 0.5 <= rating) {
                    name = 'star-half';
                } else {
                    name = 'star-outline';
                }
            }
            stars.push(
                <Ionicons key={i} name={name} size={14} color="#E94F37" style={{ marginRight: 2 }} />
            );
        }
        return stars;
    };

    // Render Left Actions (Revealed when swiping Right -> TBR)
    const renderLeftActions = (progress: any, dragX: any) => {
        const trans = dragX.interpolate({
            inputRange: [0, 50, 100, 101],
            outputRange: [-20, 0, 0, 1],
        });
        return (
            <View style={[styles.leftAction, { backgroundColor: '#2E8B57' }]}>
                <Animated.Text
                    style={[
                        styles.actionText,
                        {
                            transform: [{ translateX: trans }],
                        },
                    ]}>
                    TBR
                </Animated.Text>
                <Ionicons name="bookmark" size={24} color="#fff" style={{ marginLeft: 10 }} />
            </View>
        );
    };

    // Render Right Actions (Revealed when swiping Left -> Read)
    const renderRightActions = (progress: any, dragX: any) => {
        const trans = dragX.interpolate({
            inputRange: [-101, -100, -50, 0],
            outputRange: [-1, 0, 0, 20],
        });
        return (
            <View style={[styles.rightAction, { backgroundColor: '#4A90E2' }]}>
                <Ionicons name="checkmark-done" size={24} color="#fff" style={{ marginRight: 10 }} />
                <Animated.Text
                    style={[
                        styles.actionText,
                        {
                            transform: [{ translateX: trans }],
                        },
                    ]}>
                    Read
                </Animated.Text>
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderLeftActions={renderLeftActions}
            renderRightActions={renderRightActions}
            onSwipeableLeftOpen={() => {
                swipeableRef.current?.close();
                onSwipeRight(item); // Swiped Right (reveals Left) -> TBR
            }}
            onSwipeableRightOpen={() => {
                swipeableRef.current?.close();
                onSwipeLeft(item); // Swiped Left (reveals Right) -> Read
            }}
        >
            <TouchableOpacity
                style={styles.listItem}
                onPress={() => onPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.coverContainer}>
                    <Image
                        source={{ uri: item.coverImage || 'https://via.placeholder.com/200x300' }}
                        style={styles.coverImage}
                        resizeMode="cover"
                    />
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>by {item.author}</Text>

                    <View style={styles.ratingRow}>
                        <View style={styles.starsContainer}>
                            {renderStars(item.rating || 0)}
                        </View>
                        <Text style={styles.ratingValue}>{item.rating ? item.rating.toFixed(2) : '0.00'}</Text>
                    </View>

                    <Text style={styles.ratingCount}>
                        {item.ratings_count ? item.ratings_count.toLocaleString() : '0'} ratings
                    </Text>

                    {item.match_reasoning && (
                        <View style={styles.reasoningContainer}>
                            <Text style={styles.reasoningLabel}>WHY THIS MATCHES:</Text>
                            <Text style={styles.reasoningText} numberOfLines={3}>{item.match_reasoning}</Text>
                        </View>
                    )}

                    <View style={styles.tagsContainer}>
                        {item.tropes && item.tropes.slice(0, 2).map((trope, index) => (
                            <View key={`trope-${index}`} style={styles.tagChip}>
                                <Text style={styles.tagText}>{trope}</Text>
                            </View>
                        ))}
                        {item.themes && item.themes.slice(0, 1).map((theme, index) => (
                            <View key={`theme-${index}`} style={styles.tagChip}>
                                <Text style={styles.tagText}>{theme}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </TouchableOpacity>
        </Swipeable>
    );
};

export const RecResultsScreen = ({ navigation, route }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { recommendations: initialRecommendations, introText, totalCost } = route.params || {};

    const [swipedBookIds, setSwipedBookIds] = useState<Set<string>>(new Set());
    const [showSwiped, setShowSwiped] = useState(false);

    // Filter logic
    const visibleRecommendations = useMemo(() => {
        if (!initialRecommendations) return [];
        if (showSwiped) return initialRecommendations;
        return initialRecommendations.filter((book: Book) => {
            const key = `${book.title}-${book.author}`; // Simple key
            return !swipedBookIds.has(key);
        });
    }, [initialRecommendations, swipedBookIds, showSwiped]);

    const handleBookPress = (book: Book) => {
        navigation.navigate('BookDetail', { book });
    };

    const handleSwipeRight = async (book: Book) => {
        // Swipe Right -> TBR
        try {
            await libraryService.addBook({ ...book, status: 'tbr' });
        } catch (e) {
            console.error("Failed to add to TBR from Curator", e);
            // Optionally show an alert to the user
        }

        setSwipedBookIds(prev => {
            const newSet = new Set(prev);
            newSet.add(`${book.title}-${book.author}`);
            return newSet;
        });
    };

    const handleSwipeLeft = async (book: Book) => {
        // Swipe Left -> Read
        try {
            await libraryService.addBook({ ...book, status: 'read' });
        } catch (e) {
            console.error("Failed to add to Read from Curator", e);
        }

        setSwipedBookIds(prev => {
            const newSet = new Set(prev);
            newSet.add(`${book.title}-${book.author}`);
            return newSet;
        });
    };

    const toggleShowSwiped = () => setShowSwiped(!showSwiped);

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTopRow}>
                <Text style={styles.headerTitle}>Your Matches</Text>
                <View style={styles.toggleContainer}>
                    <Text style={styles.toggleLabel}>Show Swiped</Text>
                    <Switch
                        value={showSwiped}
                        onValueChange={toggleShowSwiped}
                        trackColor={{ false: '#767577', true: colors.primary }}
                        thumbColor={showSwiped ? '#fff' : '#f4f3f4'}
                    />
                </View>
            </View>

            {introText && (
                <View style={styles.analysisContainer}>
                    <Text style={styles.analysisLabel}>ANALYSIS</Text>
                    <Text style={styles.analysisText}>{introText}</Text>
                    {totalCost !== undefined && (
                        <Text style={styles.costText}>${totalCost.toFixed(4)}</Text>
                    )}
                </View>
            )}
        </View>
    );

    if (!initialRecommendations || initialRecommendations.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recommendations found.</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <FlatList
                data={visibleRecommendations}
                renderItem={({ item }) => (
                    <RecResultItem
                        item={item}
                        onPress={handleBookPress}
                        onSwipeLeft={handleSwipeLeft}
                        onSwipeRight={handleSwipeRight}
                    />
                )}
                keyExtractor={(item, index) => `${item.title}-${index}`}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                showsVerticalScrollIndicator={false}
                extraData={swipedBookIds} // Rerender when swiped IDs change
            />
        </GestureHandlerRootView>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: SPACING.xl,
        marginBottom: SPACING.m,
        paddingHorizontal: SPACING.l,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.l,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: FONTS.bold,
        color: colors.text,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleLabel: {
        color: colors.textLight,
        marginRight: 8,
        fontSize: 12,
    },
    analysisContainer: {
        marginBottom: SPACING.l,
    },
    analysisLabel: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    analysisText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
        fontFamily: FONTS.regular,
    },
    costText: {
        fontSize: 12,
        color: colors.textLight,
        marginTop: 8,
        fontFamily: FONTS.mono || undefined,
        textAlign: 'right',
    },
    // List Item Styles
    listItem: {
        flexDirection: 'row',
        backgroundColor: colors.background, // Ensure background covers swipe actions
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    coverContainer: {
        width: 70,
        height: 105,
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: SPACING.m,
        backgroundColor: colors.card,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
        lineHeight: 20,
        fontFamily: FONTS.bold,
    },
    bookAuthor: {
        fontSize: 14,
        color: '#A0A0A0',
        marginBottom: 8,
        fontFamily: FONTS.regular,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 8,
    },
    ratingValue: {
        color: '#A0A0A0',
        fontSize: 14,
        fontWeight: '500',
    },
    ratingCount: {
        color: '#808080',
        fontSize: 13,
        marginBottom: 12,
    },
    reasoningContainer: {
        marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 8,
        borderRadius: 6,
        borderLeftWidth: 2,
        borderLeftColor: colors.primary,
        marginBottom: 8,
    },
    reasoningLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 4,
        fontFamily: FONTS.bold,
        letterSpacing: 0.5,
    },
    reasoningText: {
        fontSize: 12,
        color: colors.text,
        fontFamily: FONTS.regular,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
        gap: 6,
    },
    tagChip: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginRight: 4,
        marginBottom: 4,
    },
    tagText: {
        fontSize: 10,
        color: colors.textLight,
        fontFamily: FONTS.regular,
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textLight,
        fontSize: 16,
    },
    // Swipe Actions
    leftAction: {
        flex: 1,
        backgroundColor: '#2E8B57', // Green
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: 20,
        flexDirection: 'row',

    },
    rightAction: {
        flex: 1,
        backgroundColor: '#4A90E2', // Blue? Or Red? Used blue for Read to differentiation
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 20,
        flexDirection: 'row-reverse',

    },
    actionText: {
        color: 'white',
        fontWeight: '600',
        paddingHorizontal: 10,
    },
});

