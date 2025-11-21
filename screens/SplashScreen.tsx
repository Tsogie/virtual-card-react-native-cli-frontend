import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { useUser } from '../context/UserContext';

const { NFCModule } = NativeModules;

export default function SplashScreen({ navigation }: any) {
  const { fetchUserInfo } = useUser();

  useEffect(() => {
    // Small delay to ensure UserContext is ready
    const timer = setTimeout(() => {
      checkAuthState();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const checkAuthState = async () => {
    try {
      console.log('[Splash] Checking auth state...');
      
      // Check 1: Do we have cached user data?
      const userJson = await AsyncStorage.getItem('user');
      
      if (!userJson) {
        console.log('[Splash] No cached user → Welcome');
        navigation.replace('Welcome');
        return;
      }

      // Check 2: Is native session valid? (has JWT + deviceId)
      const isValid = await NFCModule.isSessionValid();
      
      if (!isValid) {
        console.log('[Splash] Native session invalid → Welcome');
        await AsyncStorage.removeItem('user');
        navigation.replace('Welcome');
        return;
      }

      // Check 3: Can we refresh from backend? (validates token not expired)
      try {
        await fetchUserInfo();
        console.log('[Splash] Session valid → Main');
        navigation.replace('Main');
      } catch (error) {
        // Token expired or invalid (60 min lifetime)
        console.log('[Splash] Token expired/invalid → Welcome');
        await AsyncStorage.removeItem('user');
        await NFCModule.clearAllSessionData();
        navigation.replace('Welcome');
      }

    } catch (error) {
      console.error('[Splash] Auth check failed:', error);
      navigation.replace('Welcome');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leap Wallet</Text>
      <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0F1E',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});