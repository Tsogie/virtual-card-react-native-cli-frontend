import React, { useContext, useState} from 'react';
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
  Animated,
  KeyboardAvoidingView,
  Platform,
  FlatList, // FlatList instead of ScrollView
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
  const [lastTopUp, setLastTopUp] = useState<{ amount: number; date: string } | null>(null);
  
  // Toast animation
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = new Animated.Value(0);

  // useEffect(() => {
  //   const mockLastTopUp = {
  //     amount: 10,
  //     date: new Date(Date.now() - 86400000).toLocaleDateString('en-IE', {
  //       day: 'numeric',
  //       month: 'short',
  //     }),
  //   };
  //   setLastTopUp(mockLastTopUp);
  // }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
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
    const cleaned = text.replace(/[^0-9.]/g, '');
    setCustomAmount(cleaned);
    if (cleaned) {
      setSelectedAmount(parseFloat(cleaned));
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

      const response = await fetch(
        `${Config.BASE_URL}/api/wallet/topup/${user.cardId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Top-up failed');

      const result = await response.json();
      if (result.success) {
        setUser(prev => prev ? { ...prev, balance: result.balance } : prev);
        await NFCModule.saveLocalBalance(result.balance);

        setLastTopUp({
          amount: selectedAmount,
          date: new Date().toLocaleDateString('en-IE', {
            day: 'numeric',
            month: 'short',
          }),
        });

        showToast(`✅ Successfully added €${selectedAmount.toFixed(2)}`);

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
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const newBalance = selectedAmount ? user.balance + selectedAmount : user.balance;

  // Create content sections as array for FlatList
  const renderContent = () => [
    // Balance Card
    <View key="balance" style={styles.balanceCard}>
      {/* CARD HEADER WITH STATUS DOT */}
      <View style={styles.cardHeader}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
      </View>

      <Text style={styles.balanceAmount}>€{user.balance.toFixed(2)}</Text>
      
      {lastTopUp && (
        <View style={styles.lastTopUpContainer}>
          <Text style={styles.lastTopUpText}>
            Last top-up: €{lastTopUp.amount} • {lastTopUp.date}
          </Text>
        </View>
      )}
    </View>,

    // Amount Section
    <View key="amounts" style={styles.amountSection}>
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
          style={[
            styles.amountCard,
            showCustomInput && styles.amountCardSelected,
          ]}
          onPress={handleCustomSelect}
        >
          <Text
            style={[
              styles.amountText,
              showCustomInput && styles.amountTextSelected,
            ]}
          >
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {showCustomInput && (
        <View style={styles.customInputContainer}>
          <View style={styles.customInputHeader}>
            <Text style={styles.customInputLabel}>Enter Custom Amount</Text>
            <TouchableOpacity onPress={() => {
              setShowCustomInput(false);
              setCustomAmount('');
              setSelectedAmount(null);
            }}>
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
              returnKeyType="done"
            />
          </View>
          
          <Text style={styles.customInputHint}>Maximum: €100.00</Text>
        </View>
      )}
    </View>,

    // Preview Card
    selectedAmount && selectedAmount > 0 ? (
      <View key="preview" style={styles.previewCard}>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Top-up Amount</Text>
          <Text style={styles.previewValue}>+€{selectedAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.previewDivider} />
        <View style={styles.previewRow}>
          <Text style={styles.previewLabelBold}>New Balance</Text>
          <Text style={styles.previewValueBold}>€{newBalance.toFixed(2)}</Text>
        </View>
      </View>
    ) : null,

    // Top Up Button
    <TouchableOpacity
      key="button"
      style={[
        styles.topUpButton,
        (!selectedAmount || selectedAmount <= 0 || loading) && styles.topUpButtonDisabled,
      ]}
      onPress={handleTopUpPress}
      disabled={!selectedAmount || selectedAmount <= 0 || loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text style={styles.topUpButtonText}>
            {selectedAmount ? `Top Up €${selectedAmount.toFixed(2)}` : 'Select Amount'}
          </Text>
        </>
      )}
    </TouchableOpacity>,

    // Info Text
    <Text key="info" style={styles.infoText}>💳 Instant & Secure Payment</Text>,

    // Bottom Spacing
    <View key="spacing" style={{ height: 200 }} />,
  ].filter(Boolean); // Remove null items

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* FlatList for sticky header */}
      <FlatList
        data={renderContent()}
        renderItem={({ item }) => item}
        keyExtractor={(item, index) => `content-${index}`}
        ListHeaderComponent={
          // Sticky Header
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Top Up Balance</Text>
            <Text style={styles.headerSubtitle}>Add money to your Leap Card</Text>
          </View>
        }
        stickyHeaderIndices={[0]} // Makes header sticky
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
      />

      {/* Confirmation Dialog */}
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
              New balance will be €{newBalance.toFixed(2)}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowConfirmDialog(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleConfirmTopUp}
              >
                <Text style={styles.modalButtonConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
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

  // FlatList content style
  listContent: {
    paddingHorizontal: 24,
  },

  // Header (Sticky)
  header: {
    backgroundColor: '#141923', 
    paddingTop: (StatusBar.currentHeight || 0) + 20,
    paddingBottom: 16,
    marginBottom: 16,
    marginHorizontal: -24, // Compensate for listContent padding
    paddingHorizontal: 24,
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

  // Balance Card
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
    marginBottom: 12,
  },
  cardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8, // Space before balance amount
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  
  lastTopUpContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2F3E',
  },
  lastTopUpText: {
    fontSize: 12,
    color: '#8E9AAF',
  },

  // Amount Section
  amountSection: {
    marginBottom: 24,
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
  },
  amountCard: {
    flex: 1,
    backgroundColor: '#1E242E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2A2F3E',
    position: 'relative',
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
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  popularText: {
    fontSize: 12,
  },

  // Custom Input
  customInputContainer: {
    marginTop: 16,
    backgroundColor: '#1E242E',
    borderRadius: 12,
    padding: 20,
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

  // Preview Card
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
  previewDivider: {
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

  // Top Up Button
  topUpButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  topUpButtonDisabled: {
    backgroundColor: '#2A2F3E',
    elevation: 0,
    shadowOpacity: 0,
  },
  topUpButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 8,
  },

  // Info Text
  infoText: {
    fontSize: 13,
    color: '#8E9AAF',
    textAlign: 'center',
  },

  // Modal
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
  modalButtonCancelText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});


