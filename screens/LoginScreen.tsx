import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert 
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('http://172.20.10.13:3000/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: username,
      });

      const textResponse = await response.text(); 

      if (response.ok) {
        console.log('JWT Token:', textResponse);
        //Alert.alert('Login Success', `JWT Token:\n${textResponse}`);
        
        // await AsyncStorage.setItem('token', textResponse);
        // navigation.navigate('Welcome');
        //navigation.navigate('Home', { token: textResponse });
        navigation.replace('Main', {token: textResponse });

      } else {
        Alert.alert('Login Failed', textResponse || 'User not found');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Could not connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login Page</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholderTextColor="#4CAF50aa"
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.5 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Sign')}>
            <Text style={styles.signUpLink}>
            Create a new account? <Text style={styles.signUpText}>Sign Up</Text>
            </Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F8F3',
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
  },

  input: { width: '100%', borderWidth: 1, borderColor: '#4CAF50', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, color: '#000', backgroundColor: 'transparent' },

  signUpLink: { fontSize: 16, color: '#2E7D32' },
  signUpText: { fontWeight: 'bold', textDecorationLine: 'underline' },
  button: { width: '100%', backgroundColor: '#66BB6A', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
