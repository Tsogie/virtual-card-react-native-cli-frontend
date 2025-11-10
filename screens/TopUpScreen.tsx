import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { NativeModules } from 'react-native';

const { NFCModule } = NativeModules;
const { height, width } = Dimensions.get('window');

type TopUpScreenRouteProp = RouteProp<RootStackParamList, 'TopUp'>;

export default function TopUpScreen() {
  const route = useRoute<TopUpScreenRouteProp>();
  const { token } = route.params;

  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user info
  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await fetch('http://172.20.10.13:3000/api/userinfo', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch user info');
      const data = await response.json();
      setUserInfo(data);

      // Save local balance for offline mode
      if (typeof data.balance === 'number') {
        await NFCModule.saveLocalBalance(data.balance);
        console.log('[LOG] Local balance saved:', data.balance);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchUserInfo();
    }, [fetchUserInfo])
  );

  const handleTopUp = async () => {
    if (!userInfo?.cardId) {
      Alert.alert('Error', 'Card ID not found.');
      return;
    }

    try {
      const response = await fetch(
        `http://172.20.10.13:3000/api/wallet/topup/${userInfo.cardId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Top-up failed');

      const resultText = await response.text();
      Alert.alert('✅ Success', resultText);
      fetchUserInfo(); // Refresh balance
    } catch (error) {
      console.error('Error topping up:', error);
      Alert.alert('Error', 'Failed to top up your balance.');
    }
  };

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
      <Text style={styles.header}>Top Up</Text>

      {/* Card Detail Box */}
      <View style={styles.cardBox}>
        <Text style={styles.cardHolder}>{userInfo.username}</Text>
        <Text style={styles.cardDetail}>Card ID: {userInfo.cardId}</Text>
        <Text style={styles.cardDetail}>Card Type: Student</Text>
        <Text style={styles.cardDetail}>Valid Until: 31 Aug 2026</Text>
      </View>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>€{userInfo.balance}</Text>
      </View>

      <TouchableOpacity style={styles.topUpButton} onPress={handleTopUp}>
        <Text style={styles.buttonText}>Top Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    paddingTop: 100,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
  },
  cardBox: {
    backgroundColor: '#4CAF50',
    width: width * 0.85,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardHolder: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardDetail: {
    color: '#C8E6C9',
    fontSize: 14,
    marginVertical: 2,
  },
  balanceBox: {
    backgroundColor: '#fff',
    width: width * 0.8,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 3,
  },
  balanceLabel: {
    color: '#777',
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 26,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginTop: 5,
  },
  topUpButton: {
    width: width * 0.6,
    height: 50,
    backgroundColor: '#43A047',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    color: '#2E7D32',
    marginTop: 10,
  },
});
