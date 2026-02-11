import 'react-native-url-polyfill/auto'; // For Supabase
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/theme/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <StatusBar style="auto" />
          <AppNavigator />
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
