import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/common/Button';
import { supabase } from '../../services/supabase';

export const ForgotPasswordScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'io.supabase.novelly://reset-callback', // Deep link scheme should be configured in app.json/supa dashboard
        });

        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert(
                'Check your email',
                'We have sent a password reset link to your email.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>Enter your email to receive a reset link.</Text>
            </View>

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={colors.textLight}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                />

                <Button
                    title="Send Reset Link"
                    onPress={handleResetPassword}
                    style={styles.btn}
                    loading={loading}
                    variant="primary"
                />

                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Text style={styles.backText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: SPACING.l,
        justifyContent: 'center',
    },
    header: {
        marginBottom: SPACING.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.primary,
        fontFamily: FONTS.bold,
        marginBottom: SPACING.s,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textLight,
        textAlign: 'center',
    },
    form: {
        width: '100%',
    },
    input: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: SPACING.m,
        fontSize: 16,
        marginBottom: SPACING.m,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    btn: {
        marginBottom: SPACING.m,
        width: '100%',
    },
    backBtn: {
        alignItems: 'center',
        padding: SPACING.s,
    },
    backText: {
        color: colors.textLight,
        fontSize: 14,
    }
});
