import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUser } from '../context/UserContext';

export default function Nfc() {
  const { user, lastTransaction, transactionStatus } = useUser();

  // Get status message based on transaction state
  const getStatusMessage = () => {
    switch (transactionStatus) {
      case 'processing':
        return '💳 Processing transaction...';
      case 'success':
        return lastTransaction 
          ? `✅ Success! €${lastTransaction.fareDeducted.toFixed(2)} deducted`
          : '✅ Transaction successful';
      case 'failed':
        return '❌ Transaction failed';
      case 'offline':
        return '⚠️ Offline - Transaction queued for sync';
      case 'idle':
      default:
        return '📱 Ready to tap - Hold phone to reader';
    }
  };

  return (
    <View style={styles.container}>
      {/* Status indicator with color coding */}
      <View style={[
        styles.statusIndicator,
        transactionStatus === 'success' && styles.statusSuccess,
        transactionStatus === 'processing' && styles.statusProcessing,
        transactionStatus === 'failed' && styles.statusFailed,
        transactionStatus === 'offline' && styles.statusOffline,
      ]}>
        <Text style={styles.status}>{getStatusMessage()}</Text>
      </View>

      {/* Balance display */}
      {user && (
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>€{user.balance.toFixed(2)}</Text>
        </View>
      )}

      {/* Last transaction details (shown for 10 seconds) */}
      {lastTransaction && Date.now() - lastTransaction.timestamp < 10000 && (
        <View style={styles.transactionBox}>
          <Text style={styles.transactionLabel}>Last Transaction</Text>
          <Text style={styles.transactionText}>
            Status: {lastTransaction.status}
          </Text>
          <Text style={styles.transactionText}>
            Fare Deducted: €{lastTransaction.fareDeducted.toFixed(2)}
          </Text>
          <Text style={styles.transactionText}>
            New Balance: €{lastTransaction.newBalance.toFixed(2)}
          </Text>
        </View>
      )}

      {/* NFC Ready Indicator */}
      <View style={styles.nfcIndicator}>
        <Text style={styles.nfcIcon}>📡</Text>
        <Text style={styles.nfcText}>NFC Enabled</Text>
        <Text style={styles.nfcSubtext}>Tap your phone on the reader to pay</Text>
      </View>
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
  statusIndicator: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#C8E6C9',
    marginBottom: 12,
  },
  statusSuccess: {
    backgroundColor: '#A5D6A7',
  },
  statusProcessing: {
    backgroundColor: '#FFF9C4',
  },
  statusFailed: {
    backgroundColor: '#FFCDD2',
  },
  statusOffline: {
    backgroundColor: '#FFE082',
  },
  status: {
    fontSize: 16,
    color: '#1B5E20',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  balanceBox: {
    backgroundColor: '#A5D6A7',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 32,
    color: '#1B5E20',
    fontWeight: 'bold',
    marginTop: 4,
  },
  transactionBox: {
    backgroundColor: '#C8E6C9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
  },
  transactionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 6,
  },
  transactionText: {
    fontSize: 12,
    color: '#2E7D32',
    marginBottom: 2,
  },
  nfcIndicator: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  nfcIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  nfcText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  nfcSubtext: {
    fontSize: 12,
    color: '#558B2F',
    marginTop: 4,
    textAlign: 'center',
  },
});