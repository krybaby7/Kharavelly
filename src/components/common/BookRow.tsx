import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Book } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

interface BookRowProps {
    item: Book;
    onPress: (book: Book) => void;
    onSwipeLeft: (book: Book) => void; // Swipe Left -> Read
    onSwipeRight: (book: Book) => void; // Swipe Right -> TBR
}

export const BookRow: React.FC<BookRowProps> = ({ item, onPress, onSwipeLeft, onSwipeRight }) => {
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

                    {/* Simplified Metadata for Feed */}
                    <View style={styles.tagsContainer}>
                        <View style={styles.tagChip}>
                            <Text style={styles.tagText}>{item.tropes?.[0] || 'Fiction'}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Swipeable>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    listItem: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.l,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    coverContainer: {
        width: 60,
        height: 90,
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
        fontFamily: FONTS.bold,
        color: colors.text,
        marginBottom: 2,
        lineHeight: 20,
    },
    bookAuthor: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: colors.textLight,
        marginBottom: 6,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 6,
    },
    ratingValue: {
        color: colors.textLight,
        fontSize: 12,
        fontFamily: FONTS.medium,
    },
    tagsContainer: {
        flexDirection: 'row',
    },
    tagChip: {
        backgroundColor: colors.card,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tagText: {
        fontSize: 10,
        color: colors.textLight,
        fontFamily: FONTS.regular,
    },
    // Swipe Actions
    leftAction: {
        flex: 1,
        backgroundColor: '#2E8B57',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: 20,
        flexDirection: 'row',
    },
    rightAction: {
        flex: 1,
        backgroundColor: '#4A90E2',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 20,
        flexDirection: 'row-reverse',
    },
    actionText: {
        color: 'white',
        fontWeight: '600',
        paddingHorizontal: 10,
        fontFamily: FONTS.bold,
        alignSelf: 'center',
    },
});
