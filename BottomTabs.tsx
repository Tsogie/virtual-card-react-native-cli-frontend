import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from './screens/HomeScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import ProfileScreen from './screens/ProfileScreen';

import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from './App';

const Tab = createBottomTabNavigator();

type BottomTabsRouteProp = RouteProp<RootStackParamList, 'Main'>;

const getTabBarIcon = (routeName: string) => ({ color, size }: { color: string; size: number }) => {

  let iconName: string;

  switch (routeName) {
    case 'Home':
      iconName = 'home-outline';
      break;
    case 'Transactions':
      iconName = 'card-outline';
      break;
    case 'Profile':
      iconName = 'person-outline';
      break;
    default:
      iconName = 'alert-circle-outline';
  }

  return <Ionicons name={iconName} size={size} color={color} />;
};

export default function BottomTabs() {

  const route = useRoute<BottomTabsRouteProp>();
  const { token } = route.params; // now token exists

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: getTabBarIcon(route.name),
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: 'gray',
      })}
    >
     <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        initialParams={{ token }} 
        />

      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} initialParams={{ token }}  />
    </Tab.Navigator>
  );
}
