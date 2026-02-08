import { View, Button, Alert, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  
  // Form State'leri
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY'>('NONE');
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState('');

  useEffect(() => {
    async function setup() {
      // 1. İzinleri Kontrol Et
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') await Notifications.requestPermissionsAsync();
      
      // 2. Kategorileri Kaydet
      await registerNotificationCategories();
    }
    setup();

    // 3. DİNLEYİCİ (LISTENER) - İŞTE BU EKSİKTİ!
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier;
      const content = response.notification.request.content;
      
      // A) KULLANICI ERTELEME YAPARSA
      if (actionId === 'SNOOZE_INPUT') {
        const userText = (response as any).userText; // Girilen saniye
        let seconds = parseInt(userText, 10);

        if (isNaN(seconds)) seconds = 60; // Varsayılan 60sn

        // Yeni bildirim kur (Recursive Snooze)
        rescheduleSnoozedTask(seconds, content);
        
        console.log(`Snooze edildi: ${seconds}sn`);
        setLastAction(`🔄 Ertelendi: ${seconds} saniye sonra tekrar çalacak.`);
      } 
      
      // B) TAMAMLANDI DERSE
      else if (actionId === 'MARK_DONE') {
        console.log("Görev Tamamlandı");
        setLastAction('✅ Görev Bitti!');
        // Burada DB update yapılabilir: updateTaskStatus(taskId, true)
      }
    });

    return () => subscription.remove();
  }, []);

  // Kategorileri Tanımla
  async function registerNotificationCategories() {
    await Notifications.setNotificationCategoryAsync('SAM_REMINDER', [
      {
        identifier: 'SNOOZE_INPUT',
        buttonTitle: 'Ertele (Süre Gir)', 
        textInput: {
          submitButtonTitle: 'Ertele',
          placeholder: 'Saniye (örn: 10)', 
        },
        options: {
          opensAppToForeground: false, // Uygulama açılmasın
        },
      },
      {
        identifier: 'MARK_DONE',
        buttonTitle: '✅ Complete',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }

  // --- 1. GÖREV OLUŞTURMA (DB + İlk Bildirim) ---
  async function handleCreateTask() {
    if (!title.trim()) {
      Alert.alert('Hata', 'Lütfen bir görev başlığı gir.');
      return;
    }
    if (!session?.user) return;

    setLoading(true);

    // RRULE Oluştur
    let rruleString = null;
    if (recurrence === 'DAILY') rruleString = 'FREQ=DAILY;INTERVAL=1';
    if (recurrence === 'WEEKLY') rruleString = 'FREQ=WEEKLY;INTERVAL=1';

    // DB'ye Kaydet
    const { data, error } = await supabase.from('tasks').insert({
      user_id: session.user.id,
      title: title,
      start_date: date.toISOString(),
      is_recurring: recurrence !== 'NONE',
      recurrence_rule: rruleString,
      is_completed: false,
      snooze_duration: 10,
    } as any).select().single();

    if (error) {
      Alert.alert('Hata', error.message);
    } else if (data) {
      // İLK BİLDİRİMİ PLANLA (TARİH BAZLI)
      await scheduleInitialTask((data as any).title, date, (data as any).id);
      
      Alert.alert('Başarılı', 'Görev oluşturuldu! Zamanı gelince bildirim düşecek. 🚀');
      setTitle('');
      setRecurrence('NONE');
    }
    setLoading(false);
  }

  // --- 2. İLK BİLDİRİM FONKSİYONU (TARİH TETİKLEYİCİLİ) ---
  async function scheduleInitialTask(taskTitle: string, taskDate: Date, taskId: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hatırlatıcı 🔔",
        body: taskTitle,
        categoryIdentifier: 'SAM_REMINDER', // Kategori Önemli!
        data: { taskId: taskId },
        sound: 'default',
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: taskDate // Kullanıcının seçtiği tam tarih
      },
    });
  }

  // --- 3. SNOOZE BİLDİRİM FONKSİYONU (SANİYE TETİKLEYİCİLİ) ---
  async function rescheduleSnoozedTask(seconds: number, oldContent: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: oldContent.title,
        body: `💤 Ertelendi (${seconds}sn). Hadi yap artık!`,
        categoryIdentifier: 'SAM_REMINDER', // Tekrar buton çıksın diye
        data: oldContent.data,
        sound: 'default',
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds, // Saniye cinsinden erteleme
        repeats: false 
      },
    });
  }

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Yeni Görev Ekle 📝</Text>
      
      <Text style={styles.status}>{lastAction}</Text>

      <Text style={styles.label}>Görev Başlığı</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Örn: Video editle..." 
        placeholderTextColor="#666"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Zaman</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>
          {date.toLocaleString('tr-TR')} 📅
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={onChangeDate}
          minimumDate={new Date()}
        />
      )}

      <Text style={styles.label}>Tekrar Durumu</Text>
      <View style={styles.recurrenceContainer}>
        {['NONE', 'DAILY', 'WEEKLY'].map((item) => (
          <TouchableOpacity 
            key={item}
            style={[styles.recButton, recurrence === item && styles.recButtonActive]}
            onPress={() => setRecurrence(item as any)}
          >
            <Text style={[styles.recText, recurrence === item && styles.recTextActive]}>
              {item === 'NONE' ? 'Tek Sefer' : item === 'DAILY' ? 'Her Gün' : 'Her Hafta'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.spacer} />

      <Button 
        title={loading ? "Kaydediliyor..." : "Görevi Oluştur"} 
        onPress={handleCreateTask} 
        disabled={loading}
      />
      
      <View style={styles.spacer} />
      <Button title="Çıkış Yap" onPress={signOut} color="red" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 20 },
  status: { color: '#fbbf24', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  label: { color: '#aaa', marginBottom: 8, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  dateButton: {
    backgroundColor: '#1c1c1e',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center'
  },
  dateText: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold' },
  recurrenceContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  recButton: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  recButtonActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
  recText: { color: '#888', fontSize: 12, fontWeight: '600' },
  recTextActive: { color: '#000' },
  spacer: { height: 20 }
});