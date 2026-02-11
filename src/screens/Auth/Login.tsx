import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { SPACING, FONTS } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/common/Button';
import { supabase } from '../../services/supabase';

export const LoginScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert("Login Failed", error.message);
        } else {
            navigation.replace('Main');
        }
        setLoading(false);
    };

    const handleSignUp = async () => {
        setLoading(true);
        const { error, data } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert("Sign Up Failed", error.message);
        } else {
            if (data.session) {
                navigation.replace('Main');
            } else {
                Alert.alert("Check Email", "Please check your email for confirmation link (if enabled).");
            }
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <View style={styles.logoBox}>
                    <Text style={styles.logoText}>N</Text>
                </View>
                <Text style={styles.appName}>Novelly</Text>
                <Text style={styles.tagline}>Your personal AI reading companion</Text>
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
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={colors.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={styles.forgotBtn}
                    onPress={() => navigation.navigate('ForgotPassword')}
                >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                <Button
                    title="Sign In"
                    onPress={handleLogin}
                    style={styles.btn}
                    loading={loading}
                    variant="primary"
                />
                <Button
                    title="Create Account"
                    variant="outline"
                    onPress={handleSignUp}
                    style={styles.btn}
                    loading={loading}
                    textStyle={{ color: colors.primary }}
                />
            </View>
        </View>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        padding: SPACING.l,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl * 2,
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.m,
    },
    logoText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.white,
        fontFamily: FONTS.bold,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.primary,
        fontFamily: FONTS.bold,
    },
    tagline: {
        fontSize: 16,
        color: colors.textLight,
        marginTop: SPACING.s,
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
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: SPACING.l,
    },
    forgotText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    }
});
