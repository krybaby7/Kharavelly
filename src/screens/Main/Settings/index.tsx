import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SPACING, FONTS } from '../../../theme';
import { useTheme } from '../../../theme/ThemeContext';
import { supabase } from '../../../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/common/Button';

export const SettingsScreen = ({ navigation }: any) => {
    const { colors, theme, toggleTheme } = useTheme();
    const [userEmail, setUserEmail] = useState<string | null>('');
    const [loading, setLoading] = useState(false);
    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        getCurrentUser();
    }, []);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email || 'Guest');
    };

    const handleLogout = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Error', 'Failed to log out. Please try again.');
        } else {
            navigation.replace('Auth');
        }
        setLoading(false);
    };

    const SettingItem = ({ icon, label, onPress, color = colors.text, value }: any) => (
        <TouchableOpacity style={styles.item} onPress={onPress}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.card }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.itemLabel, { color }]}>{label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {value && <Text style={{ color: colors.textLight, marginRight: 8 }}>{value}</Text>}
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
            </View>

            <View style={styles.profileSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                    </Text>
                </View>
                <Text style={styles.email}>{userEmail}</Text>
                <Text style={styles.role}>Reader</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <SettingItem
                    icon="person-outline"
                    label="Edit Profile"
                    onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon.')}
                />
                <SettingItem
                    icon="notifications-outline"
                    label="Notifications"
                    onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon.')}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>App</Text>
                <SettingItem
                    icon={theme === 'dark' ? "moon" : "sunny"}
                    label="Theme"
                    value={theme === 'dark' ? "Dark" : "Light"}
                    onPress={toggleTheme}
                />
                <SettingItem
                    icon="help-circle-outline"
                    label="Help & Support"
                    onPress={() => Alert.alert('Coming Soon', 'Support will be available soon.')}
                />
            </View>

            <View style={styles.section}>
                <Button
                    title="Log Out"
                    onPress={handleLogout}
                    variant="outline"
                    loading={loading}
                    style={{ borderColor: colors.error }}
                    textStyle={{ color: colors.error }}
                />
            </View>

            <Text style={styles.version}>Novelly v0.1.0 (Beta)</Text>
        </ScrollView>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: SPACING.l,
    },
    header: {
        marginBottom: SPACING.xl,
        marginTop: SPACING.xl,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.primary,
        fontFamily: FONTS.bold,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.m,
    },
    avatarText: {
        fontSize: 32,
        color: colors.white,
        fontWeight: 'bold',
    },
    email: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    role: {
        fontSize: 14,
        color: colors.textLight,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textLight,
        marginBottom: SPACING.m,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    version: {
        textAlign: 'center',
        color: colors.textLight,
        fontSize: 12,
        marginBottom: 40,
    }
});
