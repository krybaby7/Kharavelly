import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Book } from '../../types';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = SPACING.m;
const ITEM_WIDTH = (width - (SPACING.l * 2) - GAP) / 2;

const RecResultItem = ({ item, onPress }: { item: Book; onPress: (book: Book) => void }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

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

    return (
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

                <View style={styles.wantToReadBtn}>
                    <Text style={styles.wantToReadText}>Want to Read</Text>
                    <Ionicons name="chevron-down" size={16} color="#fff" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const RecResultsScreen = ({ navigation, route }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { recommendations, introText, totalCost } = route.params || {};

    const handleBookPress = (book: Book) => {
        navigation.navigate('BookDetail', { book });
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Matches</Text>

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

    if (!recommendations || recommendations.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recommendations found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={recommendations}
                renderItem={({ item }) => <RecResultItem item={item} onPress={handleBookPress} />}
                keyExtractor={(item, index) => `${item.title}-${index}`}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        paddingBottom: 40,
        paddingHorizontal: SPACING.l,
    },
    header: {
        paddingTop: SPACING.xl,
        marginBottom: SPACING.m,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: FONTS.bold,
        color: colors.text,
        marginBottom: SPACING.l,
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
        marginBottom: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: SPACING.m,
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
    wantToReadBtn: {
        backgroundColor: '#2E8B57', // Green color
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        alignSelf: 'flex-start',
        minWidth: 140,
    },
    wantToReadText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
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
});
