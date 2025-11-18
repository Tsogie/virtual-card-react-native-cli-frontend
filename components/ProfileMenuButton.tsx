import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { NativeModules } from 'react-native';

const { NFCModule } = NativeModules;

export default function ProfileMenuButton() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  const handleLogout = async (navigation: any) => {
    try {
      // Clear device key
      await EncryptedStorage.removeItem('device_key');

      // Clear local balance in HCE module
      await NFCModule.saveLocalBalance(0);

      // Navigate to login screen
      navigation.replace('Login');

      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setVisible(true)} style={{ marginRight: 15 }}>
        <Ionicons name="person-circle-outline" size={36} color="#2E7D32" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setVisible(false);
                navigation.navigate('Profile' as never);
              }}
            >
              <Text style={styles.text}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setVisible(false);
                navigation.navigate('CardDetails' as never);
              }}
            >
              <Text style={styles.text}>Card Details</Text>
            </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={async () => {
              setVisible(false);
              await handleLogout(navigation);
            }}
          >
            <Text style={[styles.text, { color: 'red' }]}>Logout</Text>
          </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menu: {
    marginTop: 60,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 5,
    paddingVertical: 8,
    minWidth: 150,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
});
