// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider } from './context/UserContext';

import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import Sign from './screens/Sign';
import BottomTabs from './BottomTabs';
import TopUpScreen from './screens/TopUpScreen';
import ProfileScreen from './screens/ProfileScreen';
import CardDetailsScreen from './screens/CardDetailsScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Sign: undefined;
  Login: undefined;
  Main: { token: string, deviceKey: string }; 
  Profile: undefined;
  CardDetails: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Sign" component={Sign} />
          <Stack.Screen name="Login" component={LoginScreen} />
      
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="CardDetails" component={CardDetailsScreen} />
          <Stack.Screen name="Main" component={BottomTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}


  //  <Stack.Screen
  //         name="TopUp"
  //         component={TopUpScreen}
  //         options={{
  //           headerShown: true,
  //           title: 'Top Up',
  //           headerTintColor: '#0a310cff',
  //         }}
  //       />
