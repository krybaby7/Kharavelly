import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { HistoryService } from '../../services/history';
import { RecHistoryItem } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

export const RecHistoryScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [history, setHistory] = useState<RecHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            loadHistory();
        }
    }, [isFocused]);

    const loadHistory = async () => {
        setLoading(true);
        const data = await HistoryService.getHistory();
        setHistory(data);
        setLoading(false);
    };

    const handlePress = (item: RecHistoryItem) => {
        navigation.navigate('RecResults', {
            recommendations: item.recommendations,
            introText: item.intro_text,
            totalCost: item.cost
        });
    };

    const renderItem = ({ item }: { item: RecHistoryItem }) => {
        const date = new Date(item.created_at).toLocaleDateString();
        const bookCount = item.recommendations?.length || 0;

        let iconName: any = 'flash-outline';
        let typeLabel = 'Quick';

        if (item.source_type === 'context') {
            iconName = 'chatbubble-outline';
            typeLabel = 'Context';
        } else if (item.source_type === 'interview') {
            iconName = 'people-outline';
            typeLabel = 'Interview';
        }

        return (
            <TouchableOpacity style={styles.item} onPress={() => handlePress(item)}>
                <View style={styles.iconContainer}>
                    <Ionicons name={iconName} size={24} color={colors.primary} />
                </View>
                <View style={styles.info}>
                    <View style={styles.headerRow}>
                        <Text style={styles.typeLabel}>{typeLabel}</Text>
                        <Text style={styles.dateLabel}>{date}</Text>
                    </View>
                    <Text style={styles.contextText} numberOfLines={2}>
                        {item.prompt_context || "No context provided"}
                    </Text>
                    <Text style={styles.countLabel}>{bookCount} books found</Text>
                    {item.cost !== undefined && (
                        <Text style={styles.costLabel}>${item.cost.toFixed(4)}</Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (history.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyText}>No history yet.</Text>
                <Text style={styles.emptySubText}>Get some recommendations first!</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={history}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    list: {
        padding: SPACING.l,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: SPACING.l,
    },
    item: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    info: {
        flex: 1,
        marginRight: SPACING.s,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    typeLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
    },
    dateLabel: {
        fontSize: 12,
        color: colors.textLight,
    },
    contextText: {
        fontSize: 14,
        color: colors.text,
        marginBottom: 4,
    },
    countLabel: {
        fontSize: 12,
        color: colors.textLight,
        fontStyle: 'italic',
    },
    costLabel: {
        fontSize: 10,
        color: colors.textLight,
        textAlign: 'right',
        marginTop: 2,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textLight,
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: colors.textLight,
    },
});
