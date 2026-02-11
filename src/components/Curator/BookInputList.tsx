import React, { useState, useMemo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import { SPACING } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../common/Button';

interface BookInputListProps {
    onSubmit: (titles: string[]) => void;
    loading?: boolean;
    initialBooks?: string;
    submitLabel?: string;
}

export const BookInputList = ({ onSubmit, loading, initialBooks = '', submitLabel = "Submit" }: BookInputListProps) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [inputs, setInputs] = useState<string[]>(
        initialBooks ? initialBooks.split(',').map(s => s.trim()) : ['']
    );

    const handleTextChange = (text: string, index: number) => {
        const newInputs = [...inputs];
        newInputs[index] = text;
        setInputs(newInputs);
    };

    const addInput = () => {
        setInputs([...inputs, '']);
    };

    const removeInput = (index: number) => {
        if (inputs.length > 1) {
            const newInputs = inputs.filter((_, i) => i !== index);
            setInputs(newInputs);
        }
    };

    const handleSubmit = () => {
        const validTitles = inputs.map(i => i.trim()).filter(i => i.length > 0);
        if (validTitles.length > 0) {
            onSubmit(validTitles);
        }
    };

    return (
        <View style={styles.container}>
            {inputs.map((inputValue, index) => (
                <View key={index} style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter book title..."
                        placeholderTextColor={colors.textLight}
                        value={inputValue}
                        onChangeText={(text) => handleTextChange(text, index)}
                    />
                    {inputs.length > 1 && (
                        <TouchableOpacity onPress={() => removeInput(index)} style={styles.removeBtn}>
                            <Text style={styles.removeText}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}

            <TouchableOpacity onPress={addInput} style={styles.addBtn}>
                <Text style={styles.addText}>+ Add another book</Text>
            </TouchableOpacity>

            <View style={styles.actionContainer}>
                <Button
                    title={submitLabel}
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={inputs.every(i => i.trim().length === 0)}
                    variant="primary"
                />
            </View>
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        width: '100%',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    input: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: SPACING.m,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    removeBtn: {
        padding: SPACING.s,
        marginLeft: SPACING.s,
    },
    removeText: {
        fontSize: 24,
        color: colors.textLight,
        fontWeight: 'bold',
    },
    addBtn: {
        padding: SPACING.m,
        alignItems: 'center',
        marginBottom: SPACING.l,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        borderStyle: 'dashed',
    },
    addText: {
        color: colors.textLight,
        fontSize: 16,
    },
    actionContainer: {
        marginTop: SPACING.s,
    },
});
