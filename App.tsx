import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './context/UserContext';

import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import Sign from './screens/Sign';
import BottomTabs from './BottomTabs';
import ProfileScreen from './screens/ProfileScreen';
import CardDetailsScreen from './screens/CardDetailsScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import TopUpScreen from './screens/TopUpScreen';

export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Sign: undefined;
  Login: undefined;
  Main: undefined;
  Profile: undefined;
  CardDetails: undefined;
  TopUp: undefined;
  Transactions: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Sign" component={Sign} />
          <Stack.Screen name="Login" component={LoginScreen} />
      
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="CardDetails" component={CardDetailsScreen} />
          <Stack.Screen name="Main" component={BottomTabs} />
          <Stack.Screen name="TopUp" component={TopUpScreen} />
          <Stack.Screen name="Transactions" component={TransactionsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}


