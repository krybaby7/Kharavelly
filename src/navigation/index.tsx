import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Expo standard icons

import { LoginScreen } from '../screens/Auth/Login';
import { ForgotPasswordScreen } from '../screens/Auth/ForgotPassword';
import { HomeScreen } from '../screens/Main/Home';
import { LibraryScreen } from '../screens/Main/Library';
import { CuratorScreen } from '../screens/Main/Curator';
import { BookDetailScreen } from '../screens/BookDetail';
import { InterviewScreen } from '../screens/Flows/Interview';
import { QuickRecsScreen, ContextRecsScreen } from '../screens/Flows/LegacyFlows';
import { RecResultsScreen } from '../screens/Flows/RecResults';

import { RecHistoryScreen } from '../screens/Flows/RecHistory';
import { SettingsScreen } from '../screens/Main/Settings';



import { useTheme } from '../theme/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const CuratorStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CuratorHub" component={CuratorScreen} />
    </Stack.Navigator>
);

const MainTabs = () => {
    const { colors } = useTheme();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textLight,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Library') iconName = focused ? 'book' : 'book-outline';
                    else if (route.name === 'Curator') iconName = focused ? 'compass' : 'compass-outline';
                    else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Curator" component={CuratorStack} />
            <Tab.Screen name="Library" component={LibraryScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

const FlowStack = () => {
    const { colors } = useTheme();
    return (
        <Stack.Navigator screenOptions={{
            headerShown: true,
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { color: colors.text },
            headerBackTitle: '',
        }}>
            <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: 'Interview' }} />
            <Stack.Screen name="QuickRecs" component={QuickRecsScreen} options={{ title: 'Quick Recs' }} />
            <Stack.Screen name="ContextRecs" component={ContextRecsScreen} options={{ title: 'Context Chat' }} />
            <Stack.Screen name="RecResults" component={RecResultsScreen} options={{ title: 'Matches' }} />
            <Stack.Screen name="RecHistory" component={RecHistoryScreen} options={{ title: 'History' }} />
        </Stack.Navigator>
    );
};

export const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Auth" component={LoginScreen} />
                <Stack.Screen
                    name="ForgotPassword"
                    component={ForgotPasswordScreen}
                    options={{ headerShown: true, title: '' }}
                />
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="FlowStack" component={FlowStack} />
                <Stack.Screen
                    name="BookDetail"
                    component={BookDetailScreen}
                    options={{
                        headerShown: true,
                        headerTransparent: true,
                        headerTintColor: '#FFFFFF',
                        title: '',
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
