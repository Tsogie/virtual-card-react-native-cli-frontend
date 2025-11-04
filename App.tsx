// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import Sign from './screens/Sign';
import HomeScreen from './screens/HomeScreen';
import NfcScreen from './screens/NfcScreen';

// Define the routes and params (none for now)
export type RootStackParamList = {
  Welcome: undefined;
  Sign: undefined;
  Login: undefined;
  Home: { token: string };  
  Nfc: { cardId: string }; 
};

// Create the stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Sign" component={Sign} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Nfc" component={NfcScreen} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}
