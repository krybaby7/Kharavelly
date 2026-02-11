import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.error('Missing Supabase configuration');
}

export const supabase = createClient(
    CONFIG.SUPABASE_URL || '',
    CONFIG.SUPABASE_ANON_KEY || '',
    {
        auth: {
            storage: AsyncStorage,
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // Important for React Native
        }
    }
);
