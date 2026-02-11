import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { COLORS, SPACING, FONTS } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        // Ideally we would also try to reset navigation or other state here
    };

    public render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <Ionicons name="alert-circle" size={64} color={COLORS.error} style={styles.icon} />

                        <Text style={styles.title}>Oops! Something went wrong.</Text>
                        <Text style={styles.subtitle}>
                            We're sorry, but the application encountered an unexpected error.
                        </Text>

                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                                {this.state.error?.toString()}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    icon: {
        marginBottom: SPACING.l,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        fontFamily: FONTS.bold,
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    errorBox: {
        backgroundColor: COLORS.card,
        padding: SPACING.m,
        borderRadius: 8,
        width: '100%',
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,0,0,0.1)',
    },
    errorText: {
        color: COLORS.error,
        fontFamily: 'monospace',
        fontSize: 12,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.m,
        borderRadius: 12,
    },
    buttonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
