import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

type Props = {
  navigation: WelcomeScreenNavigationProp;
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Virtual Leap Card</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Sign')}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

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
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, color: '#2E7D32', textAlign: 'center' },
  button: { width: '100%', backgroundColor: '#018651', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  loginLink: { fontSize: 16, color: '#2E7D32' },
  loginText: { fontWeight: 'bold', textDecorationLine: 'underline' },
});
