import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../viewmodels/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Oturum yoksa ve auth grubunda değilse -> Login'e git
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Oturum varsa ve hala login sayfasındaysa -> Ana sayfaya git
      router.replace('/');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Slot: Mevcut sayfanın içeriğini gösterir
  return <Slot />;
}