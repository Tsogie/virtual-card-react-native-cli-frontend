import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import Nfc from './NfcOld';
import { NativeEventEmitter, NativeModules } from 'react-native';

const { NFCModule } = NativeModules;

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Main'>;
const nfcEventEmitter = new NativeEventEmitter(NFCModule);
type UserInfo = {
  username: string;
  balance: number;
  cardId: string;
};

export default function HomeScreen() {

  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();

  const { token } = route.params;
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  //const [userInfo, setUserInfo] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const subscription = nfcEventEmitter.addListener('NfcEvent', (event) => {
    if (event.type === 'balanceUpdate') {
      setUserInfo((prev: any) => ({
        ...prev,
        balance: parseFloat(event.message),
      }));
      console.log('[LOG] Balance updated to:', event.message);
    }
  });

  return () => subscription.remove();
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await fetch('http://172.20.10.13:3000/api/userinfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch user info');

      //Saving user data to userInfo state
      const data = await response.json();
      setUserInfo(data);

      // Save local balance for offline mode
      if (data && typeof data.balance === 'number') {
        try {
          await NFCModule.saveLocalBalance(data.balance);
          console.log('[LOG] Local balance saved:', data.balance);
        } catch (e) {
          console.error('Failed to save local balance', e);
        }
      }

    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // useFocusEffect(
  //   useCallback(() => {
  //     fetchUserInfo(); // refresh balance when Home becomes active again
  //   }, [fetchUserInfo])
  // );

  useEffect(() => {
    fetchUserInfo(); // also run on first mount
  }, [fetchUserInfo]);



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
        <Text style={styles.text}>Welcome, {userInfo.username}</Text>
        <Text style={styles.subText}>Balance: €{userInfo.balance}</Text>
      </View>

      <Nfc cardId={userInfo.cardId} />
    
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

//  {/* <TouchableOpacity
//         style={styles.nfcButton}
//         onPress={() => navigation.navigate('Nfc', {cardId: userInfo.cardId})}
//         >
//         <Text style={styles.buttonText}>Go to NFC</Text>
//         </TouchableOpacity> */}