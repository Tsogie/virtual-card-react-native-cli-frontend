import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Nfc from './Nfc';
import { useUser } from '../context/UserContext';
import { NativeModules } from 'react-native';
const { NFCModule } = NativeModules;

export default function HomeScreen() {
  const { user, refreshBalance, isLoadingBalance, fetchUserInfo } = useUser();
  const [initialLoading, setInitialLoading] = useState(true);

  // Only needed if user navigated here directly (not from login)
  useEffect(() => {
    const loadUserIfNeeded = async () => {
      if (!user) {
        try {
          await fetchUserInfo();
        } catch (error) {
          console.error('[HomeScreen] Failed to load user:', error);
        }
      }
      setInitialLoading(false);
    };

    loadUserIfNeeded();
  }, []); // Only run once on mount

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load user data</Text>
        <Text style={styles.subText}>Please try logging in again</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl 
          refreshing={isLoadingBalance} 
          onRefresh={refreshBalance}
          colors={['#2E7D32']}
          tintColor="#2E7D32"
        />
      }
    >
      <View style={styles.centerContent}>
        <View style={styles.headerSection}>
          <Text style={styles.welcomeText}>Welcome, {user.username}! 👋</Text>
          <Text style={styles.subtitle}>Your digital Leap Card is ready</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>€{user.balance.toFixed(2)}</Text>
        </View>
        <TouchableOpacity onPress={async () => {
          const result = await NFCModule.manualSyncTest();
          Alert.alert('Result', result);
        }}>
          <Text>🧪 TEST SYNC NOW</Text>
        </TouchableOpacity>

        {/* NFC Component - gets all data from context automatically */}
        <Nfc />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Transactions are secured with hardware-backed cryptographic keys
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
  centerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#558B2F',
    marginTop: 8,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: '#A5D6A7',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: '#DCEDC8',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#558B2F',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingText: {
    color: '#2E7D32',
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#C62828',
    fontWeight: '600',
  },
  subText: {
    fontSize: 14,
    color: '#558B2F',
    marginTop: 8,
  },
});