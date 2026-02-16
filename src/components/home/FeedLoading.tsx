import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { FONTS } from '../../theme';

export const FeedLoading = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const fadeAnim = useState(new Animated.Value(0))[0];

    const LOADING_MESSAGES = [
        "Curating your personalized feed...",
        "Finding hidden gems...",
        "Scanning new releases...",
        "Checking bestseller lists...",
        "Almost there..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.delay(1000),
                Animated.timing(fadeAnim, {
                    toValue: 0.5,
                    duration: 500,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#000" style={styles.spinner} />
            <Text style={styles.title}>Cooking up something good</Text>
            <View style={styles.messageContainer}>
                <Text style={styles.message}>{LOADING_MESSAGES[messageIndex]}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: 300,
    },
    spinner: {
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: '#333',
        marginBottom: 8,
    },
    messageContainer: {
        height: 24, // Fix height to prevent jump
    },
    message: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: '#666',
        textAlign: 'center',
    },
});
