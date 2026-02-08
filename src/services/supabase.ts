import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// URL veya Key yoksa hata fırlat (Debug için kolaylık)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL veya Key .env dosyasında bulunamadı!");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Oturumu telefonda sakla
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});