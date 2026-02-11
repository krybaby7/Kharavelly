import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Image, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONTS } from '../../theme';
import { Button } from '../common/Button';
import { Book } from '../../types';

interface BookVerificationModalProps {
    visible: boolean;
    books: Book[];
    onConfirm: () => void;
    onCancel: () => void;
    onRemoveBook: (index: number) => void;
    loading?: boolean;
}

export const BookVerificationModal = ({
    visible,
    books,
    onConfirm,
    onCancel,
    onRemoveBook,
    loading
}: BookVerificationModalProps) => {

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Confirm Your Selection</Text>
                        <Text style={styles.subtitle}>We found these matches. Are they correct?</Text>
                    </View>

                    <ScrollView style={styles.list}>
                        {books.map((book, index) => (
                            <View key={index} style={styles.bookItem}>
                                <View style={styles.coverContainer}>
                                    {book.coverImage ? (
                                        <Image source={{ uri: book.coverImage }} style={styles.cover} resizeMode="cover" />
                                    ) : (
                                        <View style={styles.placeholderCover}>
                                            <Text style={styles.placeholderText}>No Cover</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.info}>
                                    <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                                    <Text style={styles.bookAuthor}>{book.author}</Text>
                                    <Text style={styles.sourceText}>Source: {book.coverImage?.includes("google") ? "Google Books" : "Open Library"}</Text>
                                </View>

                                <TouchableOpacity onPress={() => onRemoveBook(index)} style={styles.removeBtn}>
                                    <Text style={styles.removeText}>×</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Button
                            title="Confirm & Get Recommendations"
                            onPress={onConfirm}
                            loading={loading}
                        />
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <Text style={styles.cancelText}>Edit List</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: SPACING.l,
    },
    header: {
        marginBottom: SPACING.l,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: SPACING.s,
        fontFamily: FONTS.bold,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
    },
    list: {
        flex: 1,
    },
    bookItem: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        alignItems: 'center',
    },
    coverContainer: {
        width: 50,
        height: 75,
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: SPACING.m,
        backgroundColor: COLORS.border,
    },
    cover: {
        width: '100%',
        height: '100%',
    },
    placeholderCover: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.secondary,
    },
    placeholderText: {
        fontSize: 10,
        color: COLORS.white,
        textAlign: 'center',
    },
    info: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 2,
    },
    bookAuthor: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    sourceText: {
        fontSize: 10,
        color: COLORS.textLight,
        fontStyle: 'italic',
    },
    removeBtn: {
        padding: SPACING.m,
    },
    removeText: {
        fontSize: 24,
        color: COLORS.textLight,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: SPACING.l,
    },
    cancelBtn: {
        marginTop: SPACING.m,
        alignItems: 'center',
        padding: SPACING.s,
    },
    cancelText: {
        color: COLORS.textLight,
        fontSize: 16,
    }
});
