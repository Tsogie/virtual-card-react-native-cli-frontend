import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import Config from '../config';

type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Sign'
>;

type Props = {
  navigation: SignUpScreenNavigationProp;
};

export default function Sign({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const handleSignUp = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please enter username, email, and password.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${Config.BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({username, email, password}),
      });

      const token = await response.text();

      if (!response.ok) {
        throw new Error(token || 'Sign-up failed');
      }

      Alert.alert('Success', 'User created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);

      setUsername('');
      setEmail('');
      setPassword('');
  } catch (error: any) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.text}>Sign Up</Text>

          <TextInput
            style={[
              styles.input,
              focusedInput === 'username' && { borderColor: '#2E7D32' },
            ]}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedInput('username')}
            onBlur={() => setFocusedInput(null)}
            placeholderTextColor="#4CAF50aa"
          />

          <TextInput
            style={[
              styles.input,
              focusedInput === 'email' && { borderColor: '#2E7D32' },
            ]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
            placeholderTextColor="#4CAF50aa"
          />

          <TextInput
            style={[
              styles.input,
              focusedInput === 'password' && { borderColor: '#2E7D32' },
            ]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
            placeholderTextColor="#4CAF50aa"
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>
              Already have an account?{' '}
              <Text style={styles.loginText}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F1F8F3',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    color: '#000',
    backgroundColor: 'transparent',
  },
  button: {
    width: '100%',
    backgroundColor: '#66BB6A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2, 
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    fontSize: 16,
    color: '#2E7D32',
  },
  loginText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
