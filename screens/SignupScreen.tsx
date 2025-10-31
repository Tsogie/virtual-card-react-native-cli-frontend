import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SignUp'
>;

type Props = {
  navigation: SignUpScreenNavigationProp;
};

export default function SignupScreen({ navigation }: Props) {  // <- add navigation
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const API_URL = 'http://172.20.10.13:3000/api';

  const handleSignUp = async () => {
    if (!username || !email) {
      Alert.alert('Error', 'Please enter both username and email.');
      return;
    }
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
      });
      const data = await response.json();
      Alert.alert('Success', 'User created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
      console.log(data);
      setUsername(''); setEmail('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to create user.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>SignUp Page</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        placeholderTextColor="#4CAF50aa"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholderTextColor="#4CAF50aa"
      />

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      {/* Login link below the Sign Up button */}
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginLink}>
          Already have an account? <Text style={styles.loginText}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F1F8F3' },
    text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
  },
  input: { width: '100%', borderWidth: 1, borderColor: '#4CAF50', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, color: '#000', backgroundColor: 'transparent' },
  button: { width: '100%', backgroundColor: '#66BB6A', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  loginLink: { fontSize: 16, color: '#2E7D32' },
  loginText: { fontWeight: 'bold', textDecorationLine: 'underline' },
});
