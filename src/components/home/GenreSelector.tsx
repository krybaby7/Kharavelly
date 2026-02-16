import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { FONTS } from '../../theme';

const GENRES = [
    "Fantasy", "Sci-Fi", "Romance", "Thriller", "Mystery",
    "Horror", "Historical", "Non-Fiction", "Self-Help", "Literary"
];

interface GenreSelectorProps {
    selectedGenres: string[];
    onToggleGenre: (genre: string) => void;
    onClear: () => void;
}

export const GenreSelector: React.FC<GenreSelectorProps> = ({ selectedGenres, onToggleGenre, onClear }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Customize your feed</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity
                    style={[styles.chip, selectedGenres.length === 0 && styles.chipActive]}
                    onPress={onClear}
                >
                    <Text style={[styles.chipText, selectedGenres.length === 0 && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>

                {GENRES.map(genre => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                        <TouchableOpacity
                            key={genre}
                            style={[styles.chip, isSelected && styles.chipActive]}
                            onPress={() => onToggleGenre(genre)}
                        >
                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{genre}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 15,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginLeft: 20,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    genreText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: '#666',
    },
    selectedGenreText: {
        color: '#FFF',
        fontFamily: FONTS.bold,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    chipText: {
        fontSize: 14,
        color: '#333',
        fontFamily: FONTS.medium,
    },
    chipTextActive: {
        color: '#fff',
        fontFamily: FONTS.bold,
    },
});
