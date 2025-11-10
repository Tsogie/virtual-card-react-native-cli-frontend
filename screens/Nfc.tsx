import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, NativeEventEmitter } from 'react-native';
import { NativeModules } from 'react-native';

const { NFCModule } = NativeModules;
//const nfcEmitter = new NativeEventEmitter(NFCModule);

type Props = { 
  cardId: string; 
};

export default function Nfc({ cardId }: Props) {
  const [status, setStatus] = useState('Initializing NFC...');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);

  //adding expiration 
//   useEffect(() => {
//   if (tokenValid) {
//     const timer = setTimeout(() => {
//       setTokenValid(false);
//       setStatus('Token expired – please refresh 🔁');
//     }, 60000); // expires in 1 minute for demo
//     return () => clearTimeout(timer);
//   }
// }, [tokenValid]);

 useEffect(() => {
  const eventEmitter = new NativeEventEmitter(NFCModule);
  const subscription = eventEmitter.addListener('NfcEvent', (event) => {
    console.log('NFC Event:', event);
    if (event.type === 'success') {
      setStatus('✅ Fare deducted successfully');
      setTokenValid(false);
    } else {
      setStatus(`❌ ${event.message}`);
    }
  });

  return () => subscription.remove();
}, []);

  // Save token to NFC/HCE module (clears old token first)
  const saveTokenToNfc = async (jwtToken: string) => {
    try {
      await NFCModule.clearJwtToken(); // always clear old token first
      await NFCModule.saveJwtToken(jwtToken);
      setToken(jwtToken);
      setTokenValid(true);
      setStatus('NFC Ready – Tap to pay ✅');
    } catch (e) {
      console.error(e);
      setStatus('Failed to save token to NFC module');
      Alert.alert('Error', 'Failed to save token to NFC module');
      setTokenValid(false);
    }
  };

  // Fetch token from backend
  const fetchTokenFromBackend = async () => {
    if (!cardId) {
      setStatus('Card ID missing');
      setTokenValid(false);
      return;
    }

    setLoading(true);
    setStatus('Fetching token from backend...');
    try {
      const response = await fetch(`http://172.20.10.13:3000/api/wallet/${cardId}`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const newToken = await response.text();

      await saveTokenToNfc(newToken);
      //Alert.alert('Success', 'Token fetched and saved to NFC module!');
    } catch (e) {
      console.error(e);
      setStatus('Failed to fetch token');
      Alert.alert('Error', 'Failed to fetch token from backend');
      setTokenValid(false);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch when component mounts
  useEffect(() => {
    fetchTokenFromBackend();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>

      {loading && <ActivityIndicator size="small" color="#2E7D32" style={{ marginTop: 10 }} />}

      {/* Refresh button to fetch a new token from backend */}
      <TouchableOpacity style={styles.button} onPress={fetchTokenFromBackend} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Refresh Token</Text>
        )}
      </TouchableOpacity>

      <Text style={{ marginTop: 10 }}>
        Token Status: {tokenValid ? 'Valid ✅' : 'Invalid ❌'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    marginTop: 16,
  },
  status: {
    fontSize: 18,
    color: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
    width: '60%',
    backgroundColor: '#66BB6A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
