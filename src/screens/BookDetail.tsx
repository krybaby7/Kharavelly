import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SPACING, FONTS } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { Book } from '../types';
import { Button } from '../components/common/Button';
import { libraryService } from '../services/library';
import { googleBooksService } from '../services/googleBooks';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const BookDetailScreen = ({ route, navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const { book } = route.params as { book: Book };
    const [loading, setLoading] = useState(false);
    const [description, setDescription] = useState(book.description);
    const [coverImage, setCoverImage] = useState(book.coverImage);
    const [rating, setRating] = useState(book.rating || 0);
    const [ratingsCount, setRatingsCount] = useState(book.ratings_count || 0);
    const [ratingSource, setRatingSource] = useState(book.rating_source);

    React.useEffect(() => {
        const fetchDetails = async () => {
            // Fetch if crucial details are missing OR if we want to ensure we have rating data
            // Only fetch if we don't have a source yet, or if description/cover is missing
            if (!description || !coverImage || !ratingSource) {
                const details = await googleBooksService.searchBook(book.title, book.author);
                if (details) {
                    if (!description && details.description) setDescription(details.description);
                    if (!coverImage && details.coverImage) setCoverImage(details.coverImage);
                    if (details.rating) setRating(details.rating);
                    if (details.ratings_count) setRatingsCount(details.ratings_count);
                    if (details.rating_source) setRatingSource(details.rating_source);
                }
            }
        };
        fetchDetails();
    }, [book.title, book.author]);

    const renderStars = (r: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            let name: any = 'star';
            if (i > r) {
                if (i - 0.5 <= r) {
                    name = 'star-half';
                } else {
                    name = 'star-outline';
                }
            }
            stars.push(
                <Ionicons key={i} name={name} size={16} color="#FFD700" />
            );
        }
        return stars;
    };

    const handleAddToLibrary = async (status: 'read' | 'tbr' | 'reading') => {
        setLoading(true);
        await libraryService.addBook({ ...book, status, description, coverImage });
        setLoading(false);
        const label = status === 'tbr' ? 'TBR' : status === 'read' ? 'Read' : 'Reading';
        Alert.alert("Success", `Added to ${label} Shelf!`);
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerContainer}>
                <Image
                    source={{ uri: coverImage || 'https://via.placeholder.com/400x600' }}
                    style={styles.heroImage}
                    resizeMode="cover"
                />
                <View style={styles.gradientOverlay} />

                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color={colors.white} />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>{book.title}</Text>
                    <Text style={styles.author}>{book.author}</Text>

                    {/* Rating Section */}
                    <View style={styles.ratingContainer}>
                        <View style={styles.starRow}>
                            {renderStars(rating)}
                        </View>
                        {rating > 0 && <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>}
                        {ratingsCount > 0 && <Text style={styles.ratingCount}>({ratingsCount})</Text>}
                        {ratingSource && <Text style={styles.sourceText}>via {ratingSource}</Text>}
                    </View>                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.actions}>
                    {book.status === 'reading' ? (
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressTitle}>Current Page</Text>
                            <View style={styles.progressRow}>
                                <Button
                                    title="Update"
                                    onPress={() => {
                                        Alert.prompt(
                                            "Update Progress",
                                            "Enter current page number:",
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                {
                                                    text: "Save",
                                                    onPress: (val) => {
                                                        const page = parseInt(val || '0');
                                                        if (!isNaN(page)) {
                                                            libraryService.updateProgress(book.title, book.author, page);
                                                            // Optimistic update or reload would go here
                                                            Alert.alert("Updated", "Progress saved!");
                                                        }
                                                    }
                                                }
                                            ],
                                            "plain-text"
                                        );
                                    }}
                                    style={styles.progressBtn}
                                    variant="primary"
                                />
                                <Button
                                    title="Finish Book"
                                    onPress={() => handleAddToLibrary('read')}
                                    style={styles.finishBtn}
                                    variant="secondary"
                                    textStyle={{ color: colors.text }}
                                />
                            </View>
                        </View>
                    ) : (
                        <Button
                            title="Start Reading"
                            onPress={() => handleAddToLibrary('reading')}
                            style={styles.actionBtn}
                            variant="primary"
                        />
                    )}

                    {book.status !== 'reading' && (
                        <>
                            <Button
                                title="Add to TBR"
                                onPress={() => handleAddToLibrary('tbr')}
                                style={styles.actionBtn}
                                variant="secondary"
                                textStyle={{ color: colors.text }}
                            />
                            <Button
                                title="Mark Read"
                                onPress={() => handleAddToLibrary('read')}
                                style={styles.actionBtn}
                                variant="secondary"
                                textStyle={{ color: colors.text }}
                            />
                        </>
                    )}
                </View>

                {book.match_reasoning && (
                    <View style={styles.matchContainer}>
                        <Text style={styles.sectionLabel}>WHY IT MATCHES</Text>
                        <Text style={styles.matchText}>"{book.match_reasoning}"</Text>
                        {book.confidence_score && (
                            <Text style={styles.confidence}>{Math.round(book.confidence_score * 100)}% Match</Text>
                        )}
                    </View>
                )}

                {description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>SYNOPSIS</Text>
                        <Text style={styles.bodyText}>{description}</Text>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>DETAILS</Text>
                    <View style={styles.tagsRow}>
                        {book.tropes.map((t, i) => (
                            <View key={`t-${i}`} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
                        ))}
                    </View>

                    {book.pacing && <Text style={styles.metaText}>Pacing: <Text style={styles.metaValue}>{book.pacing}</Text></Text>}
                    {book.reader_need && <Text style={styles.metaText}>Need: <Text style={styles.metaValue}>{book.reader_need}</Text></Text>}
                </View>

                <View style={{ height: 100 }} />
            </View >
        </ScrollView >
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerContainer: {
        height: 450,
        width: width,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)', // Needs LinearGradient for best effect
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: SPACING.l,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 8,
    },
    headerContent: {
        position: 'absolute',
        bottom: 40,
        left: SPACING.l,
        right: SPACING.l,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.white, // Always white on image
        fontFamily: FONTS.bold,
        marginBottom: 8,
        lineHeight: 38,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    author: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        fontFamily: FONTS.regular,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    starRow: {
        flexDirection: 'row',
        gap: 2,
    },
    ratingText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    ratingCount: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    sourceText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontStyle: 'italic',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    content: {
        padding: SPACING.l,
        marginTop: -20, // Overlap slightly if rounded?
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    actions: {
        flexDirection: 'row',
        marginBottom: SPACING.xl,
        gap: SPACING.m,
    },
    actionBtn: {
        flex: 1,
        borderColor: colors.border,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: SPACING.s,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    // Progress UI
    progressContainer: {
        width: '100%',
        backgroundColor: colors.card,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.m,
    },
    progressTitle: {
        color: colors.textLight,
        fontSize: 12,
        marginBottom: SPACING.s,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    progressRow: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    progressBtn: {
        flex: 1,
    },
    finishBtn: {
        flex: 1,
        backgroundColor: 'transparent',
        borderColor: colors.primary,
        borderWidth: 1,
    },
    // Match Info
    matchContainer: {
        backgroundColor: colors.card,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.xl,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    matchText: {
        fontSize: 16,
        color: colors.text,
        fontStyle: 'italic',
        marginTop: 8,
        marginBottom: 8,
        lineHeight: 24,
    },
    confidence: {
        color: colors.success,
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'right',
    },
    bodyText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 26,
        fontFamily: FONTS.regular,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: SPACING.m,
        gap: 8,
    },
    tag: {
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tagText: {
        color: colors.textLight,
        fontSize: 12,
    },
    metaText: {
        color: colors.textLight,
        marginBottom: 4,
    },
    metaValue: {
        color: colors.text,
        fontWeight: 'bold',
    },
});
