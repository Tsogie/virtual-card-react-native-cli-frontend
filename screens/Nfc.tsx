import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUser } from '../context/UserContext';

export default function Nfc() {
  const { lastTransaction, transactionStatus } = useUser();

  const getStatusMessage = () => {
    switch (transactionStatus) {
      case 'processing':
        return '⏳ Processing...';
      case 'success':
        return lastTransaction 
          ? `✅ €${lastTransaction.fareDeducted.toFixed(2)} deducted`
          : '✅ Success';
      case 'failed':
        return '❌ Failed';
      case 'offline':
        return '📴 Queued for sync';
      default:
        return '📱 Ready to tap';
    }
  };

  const getStatusColor = () => {
    switch (transactionStatus) {
      case 'success': return '#4CAF50';
      case 'processing': return '#FF9800';
      case 'failed': return '#F44336';
      case 'offline': return '#2196F3';
      default: return '#8E9AAF';
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Card */}
      <View style={[styles.statusCard, { borderColor: getStatusColor() }]}>
        <View style={styles.nfcIconContainer}>
          <Text style={styles.nfcIcon}>📡</Text>
        </View>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusMessage()}
        </Text>
        <Text style={styles.instructionText}>
          Hold phone near reader to pay
        </Text>
      </View>

      {/* Last Transaction */}
      {lastTransaction && Date.now() - lastTransaction.timestamp < 10000 && (
        <View style={styles.transactionCard}>
          <Text style={styles.transactionTitle}>Last Transaction</Text>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Amount</Text>
            <Text style={styles.transactionValue}>
              €{lastTransaction.fareDeducted.toFixed(2)}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>New Balance</Text>
            <Text style={styles.transactionValue}>
              €{lastTransaction.newBalance.toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  statusCard: {
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  nfcIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#242938',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  nfcIcon: {
    fontSize: 36,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#8E9AAF',
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2A2F3E',
  },
  transactionTitle: {
    fontSize: 14,
    color: '#8E9AAF',
    fontWeight: '600',
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionLabel: {
    fontSize: 14,
    color: '#8E9AAF',
  },
  transactionValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});