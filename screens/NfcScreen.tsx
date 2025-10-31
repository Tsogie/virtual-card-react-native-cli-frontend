import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { NativeModules } from 'react-native';
import { RouteProp } from '@react-navigation/native';

const { NFCModule } = NativeModules;

type NfcScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Nfc'
>;

type NfcScreenRouteProp = RouteProp<RootStackParamList, 'Nfc'>;

type Props = {
  navigation: NfcScreenNavigationProp;
  route: NfcScreenRouteProp;
};


export default function NfcScreen({ navigation, route }: Props) {

  const { cardId } = route.params;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ready to get token');

  const fetchAndSaveToken = async () => {
    setLoading(true);
    try {
      
      const response = await fetch(`http://172.20.10.13:3000/api/wallet/${cardId}`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const token = await response.text(); 
      await NFCModule.saveJwtToken(token);

      setStatus(`Token saved: ${token}`);
      Alert.alert('Success', 'Token fetched from backend and saved to NFC module!');
    } catch (e: any) {
      console.error(e);
      setStatus('Failed to fetch or save token');
      Alert.alert('Error', 'Failed to fetch or save token');
    } finally {
      setLoading(false);
    }
  };

  const clearToken = async () => {
    try {
      await NFCModule.clearJwtToken();
      setStatus('Token cleared');
      Alert.alert('Success', 'Token cleared!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to clear token');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Digital Leap Wallet</Text>

      <Text style={{ marginBottom: 20, textAlign: 'center' }}>{status}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={fetchAndSaveToken}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Get NFC Token</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={clearToken}
      >
        <Text style={styles.buttonText}>Clear Token</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.loginLink}>
          Return to home? <Text style={styles.loginText}>Home</Text>
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
    padding: 24,
    backgroundColor: '#F1F8F3',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#2E7D32',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#66BB6A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  loginLink: { fontSize: 16, color: '#2E7D32' },
  loginText: { fontWeight: 'bold', textDecorationLine: 'underline' },
});
   