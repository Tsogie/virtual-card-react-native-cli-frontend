import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export default function CardDetailsScreen() {
  const navigation = useNavigation();

  // Hardcoded example of a student transport card
  const card = {
    holder: 'Tsogi Bat-Erdene',
    cardId: 'STU-98347216',
    type: 'Student Leap Card',
    validUntil: '31 Aug 2026',
    balance: '€ 18.50',
    institution: 'Dublin Cultural Institute',
  };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#2E7D32" />
      </TouchableOpacity>

      <Text style={styles.title}>Student Card Details</Text>

      {/* Card Display */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardType}>{card.type}</Text>
          <Ionicons name="school-outline" size={22} color="#fff" />
        </View>

        <Text style={styles.cardHolder}>{card.holder}</Text>
        <Text style={styles.cardId}>Card ID: {card.cardId}</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.label}>Valid Until</Text>
            <Text style={styles.value}>{card.validUntil}</Text>
          </View>
          <View>
            <Text style={styles.label}>Institution</Text>
            <Text style={styles.value}>{card.institution}</Text>
          </View>
        </View>
      </View>

      {/* Balance Section */}
      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>{card.balance}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardHolder: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  cardId: {
    color: '#C8E6C9',
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#A5D6A7',
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#C8E6C9',
    fontSize: 12,
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
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
});
