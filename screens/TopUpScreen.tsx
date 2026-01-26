import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { NativeModules } from 'react-native';
import Config from '../config';

const { NFCModule } = NativeModules;

export default function TopUpScreen() {
  const { user, setUser } = useContext(UserContext)!;

  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setShowCustomInput(false);
    setCustomAmount('');
  };

  const handleCustomSelect = () => {
    setShowCustomInput(true);
    setSelectedAmount(null);
  };

  const handleCustomAmountChange = (text: string) => {
    // Remove invalid characters
    let cleaned = text.replace(/[^0-9.]/g, '');

    // Prevent starting with a dot
    if (cleaned.startsWith('.')) {
      cleaned = '0' + cleaned;
    }

    // Allow only 1 decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts[1];
    }

    // Limit to 2 decimal places
    if (parts[1]?.length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2);
    }

    setCustomAmount(cleaned);

    if (cleaned) {
      setSelectedAmount(parseFloat(cleaned));
    } else {
      setSelectedAmount(null);
    }
  };


  const handleTopUpPress = () => {
    if (!selectedAmount || selectedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid amount');
      return;
    }
    if (selectedAmount < 0.01) {
      Alert.alert('Invalid Amount', 'Minimum top-up is €0.01');
      return;
    }
    if (selectedAmount > 100) {
      Alert.alert('Amount Too Large', 'Maximum top-up is €100');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmTopUp = async () => {
    if (!user?.cardId || !selectedAmount) return;

    setShowConfirmDialog(false);
    setLoading(true);

    try {
      const token = await NFCModule.getJwtToken();
      const response = await fetch(`${Config.BASE_URL}${Config.API.TOPUP}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: selectedAmount }),
      });

      if (!response.ok) throw new Error('Top-up failed');

      const result = await response.json();
      if (result.success) {
        setUser(prev => prev ? { ...prev, balance: result.newBalance } : prev);
        await NFCModule.saveLocalBalance(result.newBalance);
        
        displayToast(`Successfully added €${selectedAmount.toFixed(2)}`);
        
        setSelectedAmount(null);
        setCustomAmount('');
        setShowCustomInput(false);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const newBalance = selectedAmount ? user.balance + selectedAmount : user.balance;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Top Up Balance</Text>
          <Text style={styles.headerSubtitle}>Add money to your Leap Card</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>€{user.balance.toFixed(2)}</Text>
        </View>

        {/* Amount Selection */}
        <Text style={styles.sectionTitle}>Select Amount</Text>
        <View style={styles.amountGrid}>
          <TouchableOpacity
            style={[
              styles.amountCard,
              selectedAmount === 5 && !showCustomInput && styles.amountCardSelected,
            ]}
            onPress={() => handleAmountSelect(5)}
          >
            <Text
              style={[
                styles.amountText,
                selectedAmount === 5 && !showCustomInput && styles.amountTextSelected,
              ]}
            >
              €5
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.amountCard,
              selectedAmount === 10 && !showCustomInput && styles.amountCardSelected,
            ]}
            onPress={() => handleAmountSelect(10)}
          >
            <Text
              style={[
                styles.amountText,
                selectedAmount === 10 && !showCustomInput && styles.amountTextSelected,
              ]}
            >
              €10
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.amountCard, showCustomInput && styles.amountCardSelected]}
            onPress={handleCustomSelect}
          >
            <Text style={[styles.amountText, showCustomInput && styles.amountTextSelected]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Amount Input */}
        {showCustomInput && (
          <View style={styles.customInputContainer}>
            <View style={styles.customInputHeader}>
              <Text style={styles.customInputLabel}>Enter Amount</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCustomInput(false);
                  setCustomAmount('');
                  setSelectedAmount(null);
                }}
              >
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.customInputWrapper}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={styles.customInput}
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#5A6B7D"
                autoFocus
              />
            </View>

            <Text style={styles.customInputHint}>Maximum: €100.00</Text>
          </View>
        )}

        {/* Preview Card */}
        {typeof selectedAmount === "number" && selectedAmount > 0 && (
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Top-up Amount</Text>
              <Text style={styles.previewValue}>+€{selectedAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.previewRow}>
              <Text style={styles.previewLabelBold}>New Balance</Text>
              <Text style={styles.previewValueBold}>€{newBalance.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Top Up Button */}
        <TouchableOpacity
          style={[
            styles.button,
            (!selectedAmount || selectedAmount <= 0 || loading) && styles.buttonDisabled,
          ]}
          onPress={handleTopUpPress}
          disabled={!selectedAmount || selectedAmount <= 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {selectedAmount ? `Top Up €${selectedAmount.toFixed(2)}` : 'Select Amount'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.infoText}>{"💳 Instant & Secure Payment"}</Text>

      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Top-Up</Text>
            <Text style={styles.modalMessage}>
              Add €{selectedAmount?.toFixed(2)} to your Leap Card?
            </Text>
            <Text style={styles.modalBalance}>
              New balance: €{newBalance.toFixed(2)}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowConfirmDialog(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleConfirmTopUp}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Simple Toast */}
      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {toastMessage}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141923',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141923',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E9AAF',
  },
  scrollContent: {
    padding: 24,
    paddingTop: (StatusBar.currentHeight || 0) + 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E9AAF',
  },
  balanceCard: {
    backgroundColor: '#1E242E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#2A2F3E',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#8E9AAF',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  amountCard: {
    flex: 1,
    backgroundColor: '#1E242E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2A2F3E',
  },
  amountCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  amountText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  amountTextSelected: {
    color: '#4CAF50',
  },
  customInputContainer: {
    backgroundColor: '#1E242E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  customInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customInputLabel: {
    fontSize: 13,
    color: '#8E9AAF',
  },
  clearButton: {
    fontSize: 20,
    color: '#8E9AAF',
    fontWeight: 'bold',
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    padding: 0,
  },
  customInputHint: {
    fontSize: 12,
    color: '#8E9AAF',
  },
  previewCard: {
    backgroundColor: '#1E242E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2F3E',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#8E9AAF',
  },
  previewValue: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2F3E',
    marginVertical: 12,
  },
  previewLabelBold: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  previewValueBold: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#2A2F3E',
  },
  buttonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 13,
    color: '#8E9AAF',
    textAlign: 'center',
    marginBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E242E',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: '#2A2F3E',
  },
  modalTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#8E9AAF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalBalance: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#2A2F3E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 20,
    zIndex: 9999,
    elevation: 10,
  },
  toastText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});