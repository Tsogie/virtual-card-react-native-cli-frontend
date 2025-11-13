import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useNavigation, useRoute } from '@react-navigation/native';
import Nfc from './NfcOld';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { UserContext } from '../context/UserContext';
const { NFCModule } = NativeModules;

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Main'>;
const nfcEventEmitter = new NativeEventEmitter(NFCModule);


export default function HomeScreen() {

  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();

  const { token, deviceKey } = route.params;

  //const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  //const [userInfo, setUserInfo] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  const context = useContext(UserContext);
  if (!context) {
    throw new Error('UserContext not found. Make sure your component is wrapped in UserProvider.');
  }

  const { user, setUser } = context;
  useEffect(() => {
    if (!deviceKey) return;

    (async () => {
      try {
        await NFCModule.saveDeviceKey(deviceKey);
        console.log('Device key saved to SharedPreferences on Android');
        await NFCModule.clearQueue();
        console.log('Queue cleared');
      } catch (e) {
        console.error('Failed to save device key:', e);
      }
    })();
  }, [deviceKey]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('http://172.20.10.13:3000/api/userinfo', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch user info');
        const data = await response.json();
        setUser(data);

        if (data?.balance !== undefined) {
          await NFCModule.saveLocalBalance(data.balance);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [token, setUser]);

  // NFC listener
  useEffect(() => {
    const subscription = nfcEventEmitter.addListener('NfcEvent', (event) => {
      if (event.type === 'balanceUpdate') {
        setUser(prev => prev ? { ...prev, balance: parseFloat(event.message) } : prev);
      }
    });
    return () => subscription.remove();
  }, [setUser]);



  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading user info...</Text>
      </View>
    );
  }

  return (
  <View style={styles.container}>
    <View style={styles.centerContent}>

      <View style={styles.content}>
        <Text style={styles.text}>Welcome, {user?.username}</Text>
        <Text style={styles.subText}>Balance: €{user?.balance}</Text>
      </View>

     {user?.cardId && <Nfc cardId={user.cardId} />}

    </View>
  </View>
);
}

//const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
 container: {
  flex: 1,
  backgroundColor: '#E8F5E9',
  justifyContent: 'space-around', // spread content evenly vertically
  alignItems: 'center',
  },
  centerContent: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
},
  content: {
    alignItems: 'center',
    marginBottom: 100,
  },

  text: {
    fontSize: 22,
    color: '#2E7D32',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subText: {
    fontSize: 18,
    color: '#388E3C',
    textAlign: 'center',
    marginTop: 6,
  },
  
  
  loadingText: { 
    color: '#2E7D32', 
    marginTop: 10, 
  }

});
