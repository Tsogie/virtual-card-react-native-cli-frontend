import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../App'; // adjust path if needed
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Main'>;

export default function ProfileScreen(){
  
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute<ProfileScreenRouteProp>();
  const { token } = route.params;

  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
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
        const data = await response.json();
        setUserInfo(data);
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    }, [token]);
  
    useFocusEffect(
      useCallback(() => {
        fetchUserInfo(); 
      }, [fetchUserInfo])
    );
  
    useEffect(() => {
      fetchUserInfo(); 
    }, [fetchUserInfo]);
  
  
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
            'Authorization': `Bearer ${token}`,
          },
        }
      );
  
      if (!response.ok) {
        throw new Error('Top-up failed');
      }
  
      const resultText = await response.text(); 
      Alert.alert('✅ Success', resultText); 
  
      fetchUserInfo(); 
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

    <SafeAreaView style={styles.container}>
      
        <View>
          <Text style={styles.text}>Account details</Text>
        </View>
        
        <View style={styles.content}>
          {userInfo ? (
            <>
              
              <Text style={styles.subText}>Username: {userInfo.username}</Text>
              <Text style={styles.subText}>Email: {userInfo.email}</Text>
              <Text style={styles.subText}>Card: {userInfo.cardId}</Text>
              <Text style={styles.subText}>Balance: €{userInfo.balance}</Text>
            </>
          ) : (
            <Text style={styles.text}>Failed to load user info</Text>
          )}
        </View>
  
  
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.topUpButton} onPress={handleTopUp}>
              <Text style={styles.buttonText}>Top Up</Text>
          </TouchableOpacity>
  
          <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => navigation.navigate('Login')}
          >
              <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
          </View>
    
    </SafeAreaView>  
    );
}
   

const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center', // center content vertically
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  text: {
    fontSize: 22,
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 100,
    
  },
  subText: {
    fontSize: 18,
    color: 'black',
    textAlign: 'center',
    marginTop: 6,
  },
  buttonContainer: {
    height: height / 3, // 1/3 of screen
    justifyContent: 'center', // center buttons vertically
    alignItems: 'center',
    width: '100%',
    },
  topUpButton: {
    width: width * 0.6, // 60% of screen width
    height: 50, // fixed height
    backgroundColor: '#66BB6A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15, 
  },
  logoutButton: {
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
  nfcButton: {
  width: width * 0.6,
  height: 50,
  backgroundColor: '#4fae82ff', // different color to stand out
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 15,
},

});