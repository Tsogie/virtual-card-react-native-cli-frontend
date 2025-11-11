import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
// import { RouteProp, useRoute } from '@react-navigation/native';
// import { RootStackParamList } from '../App';
import { UserContext } from '../context/UserContext';
import { NativeModules } from 'react-native';

const { NFCModule } = NativeModules;
const { width } = Dimensions.get('window');

//type TopUpScreenRouteProp = RouteProp<RootStackParamList, 'TopUp'>;

export default function TopUpScreen() {

  //const route = useRoute<TopUpScreenRouteProp>();
  //const { token } = route.params;

  const { user, setUser } = useContext(UserContext)!; // Non-null assertion
  const [loading, setLoading] = useState(false);

  const handleTopUp = async () => {
    if (!user?.cardId) {
      Alert.alert('Error', 'Card ID not found.');
      return;
    }

    setLoading(true);
    try {
      // Send top-up request
      const response = await fetch(
        `http://172.20.10.13:3000/api/wallet/topup/${user.cardId}`,
        {
          method: 'PUT',
          
        }
      );

      if (!response.ok) throw new Error('Top-up failed');

      const result = await response.json(); // <-- JSON object now
      if (result.success) {
        Alert.alert('✅ Success', `Top-up successful! New balance: €${result.balance}`);

        // Update balance in context and local NFC storage
        setUser(prev => prev ? { ...prev, balance: result.balance } : prev);
        await NFCModule.saveLocalBalance(result.balance);
      } else {
        Alert.alert('Error', 'Top-up failed on backend.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to top up your balance.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
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

      <View style={styles.cardBox}>
        <Text style={styles.cardHolder}>{user.username}</Text>
        <Text style={styles.cardDetail}>Card ID: {user.cardId}</Text>
        <Text style={styles.cardDetail}>Card Type: Student</Text>
        <Text style={styles.cardDetail}>Valid Until: 31 Aug 2026</Text>
      </View>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>€{user.balance}</Text>
      </View>

      <TouchableOpacity
        style={styles.topUpButton}
        onPress={handleTopUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Top Up</Text>
        )}
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
