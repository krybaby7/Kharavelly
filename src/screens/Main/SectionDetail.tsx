import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FONTS, SPACING } from '../../theme';
import { Book } from '../../types';
import { BookRow } from '../../components/common/BookRow';
import { libraryService } from '../../services/library';
import { Ionicons } from '@expo/vector-icons';

export const SectionDetailScreen = ({ navigation, route }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { title, books: initialBooks } = route.params || { title: 'Books', books: [] };

    const [books, setBooks] = useState<Book[]>(initialBooks);

    const handleBack = () => {
        navigation.goBack();
    };

    const handleBookPress = (book: Book) => {
        navigation.navigate('BookDetail', { book });
    };

    const handleSwipeRight = (book: Book) => {
        // Swipe Right -> TBR
        libraryService.addBook({ ...book, status: 'tbr' });
        // Remove from list
        setBooks(current => current.filter(b => b.id !== book.id && b.title !== book.title));
    };

    const handleSwipeLeft = (book: Book) => {
        // Swipe Left -> Read
        libraryService.addBook({ ...book, status: 'read' });
        // Remove from list
        setBooks(current => current.filter(b => b.id !== book.id && b.title !== book.title));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={books}
                keyExtractor={(item, index) => item.id || `${item.title}-${index}`}
                renderItem={({ item }) => (
                    <BookRow
                        item={item}
                        onPress={handleBookPress}
                        onSwipeLeft={handleSwipeLeft}
                        onSwipeRight={handleSwipeRight}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No more books in this section.</Text>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.heading,
        color: colors.text,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 4,
    },
    listContent: {
        paddingVertical: 10,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textLight,
        fontFamily: FONTS.regular,
        fontSize: 16,
    }
});
