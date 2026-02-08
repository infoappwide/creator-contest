import { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../viewmodels/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) Alert.alert('Hata', error.message);
  }

  async function handleRegister() {
    setLoading(true);
    // Hızlı test için username'i email'in başı yapıyoruz
    const username = email.split('@')[0];
    const { error } = await signUp(email, password, username);
    setLoading(false);
    if (error) Alert.alert('Hata', error.message);
    else Alert.alert('Başarılı', 'Kayıt olundu! Giriş yapabilirsin.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vibecode Reminders</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button title={loading ? "İşleniyor..." : "Giriş Yap"} onPress={handleLogin} />
      </View>
      
      <TouchableOpacity onPress={handleRegister} style={{ marginTop: 20 }}>
        <Text style={{ color: '#fff' }}>Hesabın yok mu? Kayıt Ol</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#000' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 40, textAlign: 'center' },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333'
  },
  buttonContainer: { marginTop: 10 }
});