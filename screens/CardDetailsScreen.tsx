import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CardDetailsScreen() {
  const { user } = useContext(UserContext)!;
  const navigation = useNavigation();

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <Text style={styles.errorText}>Session expired</Text>
        <Text style={styles.errorSubtext}>Please log in again</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' as never }],
          })}
        >
          <Text style={styles.logoutText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Card Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Virtual Card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#1A1F2E', '#242938']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.virtualCard}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardBrand}>LEAP CARD</Text>
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            </View>

            {/* NFC Chip Icon */}
            <View style={styles.chipIcon}>
              <Ionicons name="hardware-chip" size={32} color="#FFD700" />
            </View>

            {/* Card Number */}
            <Text style={styles.cardNumber}>
              **** **** **** {user.cardId.slice(-4)}
            </Text>

            {/* Card Info */}
            <View style={styles.cardInfo}>
              <View>
                <Text style={styles.cardLabel}>CARD HOLDER</Text>
                <Text style={styles.cardValue}>{user.username.toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.cardLabel}>VALID UNTIL</Text>
                <Text style={styles.cardValue}>08/26</Text>
              </View>
            </View>

            {/* Card Type Badge */}
            <View style={styles.cardTypeBadge}>
              <Text style={styles.cardTypeText}>STUDENT</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Information</Text>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ID</Text>
              <Text style={styles.detailValue}>{user.cardId}</Text>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Card Type</Text>
              <Text style={styles.detailValue}>Student Leap Card</Text>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.activeStatus}>
                <View style={[styles.activeDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={[styles.detailValue, { color: '#4CAF50' }]}>Active</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Balance</Text>
              <Text style={[styles.detailValue, { fontSize: 18, fontWeight: 'bold' }]}>
                €{user.balance.toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Registered</Text>
              <Text style={styles.detailValue}>16 Nov 2024</Text>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valid Until</Text>
              <Text style={styles.detailValue}>31 Aug 2026</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1E',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0F1E',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E9AAF',
  },

  scrollContent: {
    paddingTop: (StatusBar.currentHeight || 0) + 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Virtual Card
  cardContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  virtualCard: {
    padding: 24,
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardBrand: {
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
  chipIcon: {
    marginBottom: 16,
  },
  cardNumber: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 24,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 9,
    color: '#8E9AAF',
    marginBottom: 4,
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardTypeBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  cardTypeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Section
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 12,
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2F3E',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E9AAF',
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#2A2F3E',
    marginVertical: 16,
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  // Error
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8E9AAF',
    marginBottom: 24,
  },
    // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  logoutText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});