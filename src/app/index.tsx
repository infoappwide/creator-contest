import { View, Button, Alert, Text, StyleSheet, Keyboard } from 'react-native';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../services/supabase';
import { useAuth } from '../viewmodels/useAuth';

// Bildirim Ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Index() {
  const { session, signOut } = useAuth();
  const [lastAction, setLastAction] = useState('Henüz işlem yok.');

  useEffect(() => {
    async function setup() {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') await Notifications.requestPermissionsAsync();
      
      await registerNotificationCategories();
    }
    setup();

    // DİNLEYİCİ (LISTENER)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier;
      const content = response.notification.request.content; // Eski bildirimin içeriği
      
      // 1. KULLANICI ERTELEME SÜRESİ GİRDİYSE
      if (actionId === 'SNOOZE_INPUT') {
        const userText = (response as any).userText; // Girilen metin
        let seconds = parseInt(userText, 10);

        // Sayı girmezse veya saçma bir şey yazarsa varsayılan 60sn
        if (isNaN(seconds)) seconds = 60;

        // --- KRİTİK NOKTA: AYNI KATEGORİYLE YENİDEN KURUYORUZ ---
        rescheduleTask(seconds, content);
        
        setLastAction(`🔄 Döngü Devam Ediyor: ${seconds} saniye sonra tekrar soracak.`);
      } 
      
      // 2. KULLANICI TAMAMLA DEDİYSE (Döngü biter)
      else if (actionId === 'MARK_DONE') {
        setLastAction('✅ GÖREV BİTTİ! (Artık bildirim gelmeyecek)');
        // Buraya veritabanı güncelleme kodu gelecek: updateTask(id, completed=true)
      }
    });

    return () => subscription.remove();
  }, []);

  // KATEGORİLERİ TANIMLA
  async function registerNotificationCategories() {
    await Notifications.setNotificationCategoryAsync('SAM_REMINDER', [
      {
        identifier: 'SNOOZE_INPUT',
        buttonTitle: 'Ertele (Süre Gir)', 
        textInput: {
          submitButtonTitle: 'Ertele',
          placeholder: 'Saniye yaz (örn: 10)', 
        },
        options: {
          opensAppToForeground: false, // Uygulama açılmasın
        },
      },
      {
        identifier: 'MARK_DONE',
        buttonTitle: '✅ Complete',
        options: {
          opensAppToForeground: false, // Uygulama açılmasın
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);
  }

  // YENİDEN ZAMANLAYICI (RE-SCHEDULER)
  async function rescheduleTask(seconds: number, oldContent: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: oldContent.title, // Eski başlığı koru (örn: "Video Çek")
        body: `💤 Ertelendi (${seconds}sn). Hadi yap artık!`, // Mesajı güncelle
        categoryIdentifier: 'SAM_REMINDER', // <--- İŞTE BU SAYEDE TEKRAR BUTON ÇIKACAK
        data: oldContent.data, // Eski ID'yi koru
        sound: 'default',
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds, // Kullanıcının girdiği süre
        repeats: false 
      },
    });
  }

  // İLK TEST BİLDİRİMİNİ ATAN FONKSİYON
  async function sendInitialNotification() {
    setLastAction('Bildirim atılıyor... 2sn bekle.');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Youtube Videosu 🎬",
        body: "Bu görevi bitirene kadar peşini bırakmam.",
        categoryIdentifier: 'SAM_REMINDER', // <--- İlk startı bu veriyor
        data: { taskId: '12345' },
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2, 
        repeats: false 
      },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Infinite Snooze Loop ♾️</Text>
      <Text style={styles.desc}>
        "Complete" diyene kadar her bildirimde süre girip erteleyebilirsin.
      </Text>

      <Text style={styles.status}>{lastAction}</Text>
      
      <View style={styles.spacer} />
      
      <Button title="🔔 Döngüyü Başlat (Test)" onPress={sendInitialNotification} />
      
      <View style={styles.spacer} />
      <Button title="Çıkış Yap" onPress={signOut} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
  desc: { color: '#888', textAlign: 'center', marginBottom: 20 },
  status: { color: '#fbbf24', textAlign: 'center', marginBottom: 40, fontSize: 16, fontWeight: 'bold', borderWidth:1, borderColor: '#333', padding: 10, borderRadius: 8 },
  spacer: { height: 20 }
});