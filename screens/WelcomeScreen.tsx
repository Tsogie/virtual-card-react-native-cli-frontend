import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import Ionicons from 'react-native-vector-icons/Ionicons';


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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Top Spacer */}
      <View style={styles.topSpacer} />

      {/* Logo/Icon Section */}
      <View style={styles.logoContainer}>
        <View style={styles.iconWrapper}>
          <Ionicons name="card" size={64} color="#4CAF50" />
        </View>
        <View style={styles.pulseCircle} />
      </View>

      {/* Title Section */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Virtual Leap Card</Text>
        <Text style={styles.subtitle}>
          Secure NFC Payments for{'\n'}Irish Public Transport
        </Text>
      </View>

      {/* Features List */}
    
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
          <Text style={styles.featureText}>Secure payment</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="flash" size={20} color="#4CAF50" />
          <Text style={styles.featureText}>Instant NFC tap-to-pay</Text>
        </View>
        <View style={styles.featureItem}>
           <Ionicons name="cloud-offline" size={20} color="#4CAF50" />
           <Text style={styles.featureText}>Offline support</Text>
         </View>
      </View>

      {/* Bottom Spacer */}
      <View style={styles.bottomSpacer} />

      {/* Buttons Section */}
      <View style={styles.buttonsContainer} >
        {/* Sign Up Button */}
        <TouchableOpacity
          style={styles.signUpButton}
          onPress={() => navigation.navigate('Sign')}
          activeOpacity={0.8}
        >
          <Text style={styles.signUpButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLinkContainer}
        >
          <Text style={styles.loginLink}>
            Already have an account?{' '}
            <Text style={styles.loginText}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🇮🇪 Made for Irish Public Transport
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1E', 
    paddingHorizontal: 24,
  },

  topSpacer: {
    flex: 1,
  },

  // Logo Section
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
    zIndex: 10,
  },
  pulseCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#4CAF5030',
  },

  // Title Section
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E9AAF',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Features
  featuresContainer: {
    paddingHorizontal: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2F3E',
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
    fontWeight: '500',
  },

  bottomSpacer: {
    flex: 1,
  },

  // Buttons
  buttonsContainer: {
    marginBottom: 24,
  },
  signUpButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },

  // Login Link
  loginLinkContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginLink: {
    fontSize: 15,
    color: '#8E9AAF',
  },
  loginText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#5A6B7D',
  },
});

