import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme } from './index';

type ThemeType = typeof DarkTheme;

interface ThemeContextData {
    theme: 'light' | 'dark';
    colors: ThemeType;
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const storedTheme = await AsyncStorage.getItem('app_theme');
            if (storedTheme === 'light' || storedTheme === 'dark') {
                setThemeState(storedTheme);
            } else {
                // Default to system or dark
                // const colorScheme = Appearance.getColorScheme();
                // setThemeState(colorScheme === 'light' ? 'light' : 'dark');
                setThemeState('dark'); // Default to dark for premium feel
            }
        } catch (e) {
            console.error("Failed to load theme", e);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    const setTheme = async (newTheme: 'light' | 'dark') => {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem('app_theme', newTheme);
        } catch (e) {
            console.error("Failed to save theme", e);
        }
    };

    const colors = theme === 'light' ? LightTheme : DarkTheme;

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
