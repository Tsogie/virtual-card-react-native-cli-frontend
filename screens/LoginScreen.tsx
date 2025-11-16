// LoginScreen.tsx
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { NativeModules } from 'react-native';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import Config from '../config';

const { NFCModule } = NativeModules;

export default function LoginScreen() {
  // ✅ Use useNavigation hook instead of props
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('UserContext not found');
  }
  const { fetchUserInfo } = context;

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    try {
      setLoading(true);

      // 1. Login and get JWT token
      const response = await fetch(`${Config.BASE_URL}${Config.API.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: username,
      });

      const token = await response.text(); 

      if (!response.ok) {
        Alert.alert('Login Failed', token || 'User not found');
        return;
      }

      // 2. Save token to native storage
      await NFCModule.saveJwtToken(token);

      // 3. Generate or retrieve Keystore keypair
      const alias = `wallet_key_${username}`;
      const publicKey = await NFCModule.generateKeyPair(alias);
      console.log("Generated/Retrieved public key:", publicKey);

      // 4. Save alias locally
      await EncryptedStorage.setItem("current_key_alias", alias);
      await NFCModule.saveKeyAlias(alias); 

      // 5. Register device with backend
      const registerRes = await fetch(`${Config.BASE_URL}${Config.API.DEVICE_REGISTER}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alias, publicKey }),
      });
      
      const data = await registerRes.json();
      const deviceId = data.deviceId as string;
      await NFCModule.saveDeviceId(deviceId); 
      
      console.log('Device registered:', data.message);

      // 6. Fetch user info and populate context
      await fetchUserInfo();

      // 7. Clear offline queue from previous session
      await NFCModule.clearQueue();
      
      Alert.alert('Login Successful', `Welcome ${username}!`);
      
      // 8. Navigate without token param
      navigation.replace('Main');

    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Could not connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login Page</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholderTextColor="#4CAF50aa"
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.5 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Sign')}>
        <Text style={styles.signUpLink}>
          Create a new account? <Text style={styles.signUpText}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F8F3',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
  },
  input: { 
    width: '100%', 
    borderWidth: 1, 
    borderColor: '#4CAF50', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginBottom: 16, 
    color: '#000', 
    backgroundColor: 'transparent' 
  },
  signUpLink: { fontSize: 16, color: '#2E7D32' },
  signUpText: { fontWeight: 'bold', textDecorationLine: 'underline' },
  button: { 
    width: '100%', 
    backgroundColor: '#66BB6A', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginBottom: 16 
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});