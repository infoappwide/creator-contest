import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Uygulama açılınca mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Oturum değişikliklerini (giriş/çıkış) dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Giriş Yapma Fonksiyonu
  async function signIn(email: string, pass: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    return { error };
  }

  // Kayıt Olma Fonksiyonu
  async function signUp(email: string, pass: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (!error && data.user) {
        // Profil tablosuna da kaydet
        const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            username: username,
            email: email,
        } as any); // <-- BURAYA 'as any' EKLE, SORUN ÇÖZÜLÜR.

        if (profileError) {
            console.error("Profil oluşturma hatası:", profileError);
        }
    }

    return { error, data };
  }

  // Çıkış Yapma
  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, loading, signIn, signUp, signOut };
}