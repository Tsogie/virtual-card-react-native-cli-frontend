import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

export default function HomeScreen() {
  const { user, refreshBalance, isLoadingBalance, fetchUserInfo, lastTransaction, transactionStatus } = useUser();
  const [initialLoading, setInitialLoading] = useState(true);
  const navigation = useNavigation();
  
  // Pulse animation for "Ready to Tap"
  const pulseAnim = new Animated.Value(1);

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
  }, []);

  // Pulse animation
  useEffect(() => {
    if (transactionStatus === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [transactionStatus]);

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <Text style={styles.errorText}>Unable to load account</Text>
        <Text style={styles.errorSubtext}>Please try logging in again</Text>
      </View>
    );
  }

  const getStatusInfo = () => {
    switch (transactionStatus) {
      case 'processing':
        return { text: 'Processing...', color: '#FF9800', icon: '⏳' };
      case 'success':
        return { text: 'Transaction Complete', color: '#4CAF50', icon: '✅' };
      case 'failed':
        return { text: 'Transaction Failed', color: '#F44336', icon: '❌' };
      case 'offline':
        return { text: 'Queued for Sync', color: '#2196F3', icon: '📴' };
      default:
        return { text: 'Ready to Tap', color: '#4CAF50', icon: '📱' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isLoadingBalance} 
            onRefresh={refreshBalance}
            tintColor="#FFFFFF"
          />
        }
        contentContainerStyle={{
          paddingTop: (StatusBar.currentHeight || 0) + 20,
        }}
      >
        {/* Small Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.username}>{user.username}</Text>
        </View>

        {/* MAIN CARD */}
        <View style={styles.mainCardContainer}>
          <LinearGradient
            colors={['#1A1F2E', '#242938']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.mainCard}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>LEAP CARD</Text>

              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />

            </View>

            {/* Balance - Large Display */}
            <View style={styles.balanceSection}>
              <View style={styles.balanceRow}>
                <Text style={styles.currencySymbol}>€</Text>
                <Text style={styles.balanceAmount}>{user.balance.toFixed(2)}</Text>
              </View>
              
              {/* Last Transaction Info */}
              {lastTransaction && (
                <Text style={styles.lastTransaction}>
                  Last: -€{lastTransaction.fareDeducted.toFixed(2)}
                </Text>
              )}
            </View>

            {/* Card Details */}
            <View style={styles.cardDetails}>
              <View>
                <Text style={styles.detailLabel}>Card ID</Text>
                <Text style={styles.detailValue}>**** {user.cardId.slice(-4)}</Text>
              </View>
              <View style={styles.statusBadge}>
                <View style={[styles.activeDot, { backgroundColor: statusInfo.color }]} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>

            {/* Ready to Tap Section - PROMINENT */}
            <Animated.View 
              style={[
                styles.readyToTapSection,
                { 
                  transform: [{ scale: transactionStatus === 'idle' ? pulseAnim : 1 }],
                  borderColor: statusInfo.color,
                }
              ]}
            >
              <Text style={styles.tapIcon}>{statusInfo.icon}</Text>
              <Text style={[styles.tapStatus, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* Instruction Text */}
        <Text style={styles.instructionText}>
          📱 Hold near reader to pay
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Quick Actions - 2 Only */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('TopUp')}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>💳</Text>
              </View>
              <Text style={styles.actionText}>Top Up</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Transactions')}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📊</Text>
              </View>
              <Text style={styles.actionText}>Transactions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Badge */}
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityTitle}>Hardware-backed Security</Text>
          </View>
          <Text style={styles.securityText}>
            Payments protected with cryptographic keys stored in secure hardware
          </Text>
        </View>

        {/* Bottom Spacing */}
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1E',
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0F1E',
  },
  loadingCard: {
    padding: 32,
    borderRadius: 16,
    backgroundColor: '#1A1F2E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8E9AAF',
  },

  // Header - Smaller
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#8E9AAF',
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // MAIN CARD - Center Focus
  mainCardContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  mainCard: {
    padding: 24,
    minHeight: 320, 
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 12,
    color: '#8E9AAF',
    fontWeight: '700',
    letterSpacing: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Balance Section
  balanceSection: {
    marginBottom: 24,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 4,
  },
  balanceAmount: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  lastTransaction: {
    fontSize: 14,
    color: '#8E9AAF',
  },

  // Card Details
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 11,
    color: '#8E9AAF',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // READY TO TAP - PROMINENT
  readyToTapSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  tapIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  tapStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Instruction
  instructionText: {
    fontSize: 14,
    color: '#8E9AAF',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#2A2F3E',
    marginHorizontal: 24,
    marginBottom: 24,
  },

  // Quick Actions - 2 Cards
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2F3E',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#242938',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Security Card
  securityCard: {
    marginHorizontal: 24,
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2F3E',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  securityTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  securityText: {
    fontSize: 13,
    color: '#8E9AAF',
    lineHeight: 20,
  },
});