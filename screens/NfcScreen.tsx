import { View, Text } from 'react-native';
import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type NfcScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Nfc'
>;

type Props = {
  navigation: NfcScreenNavigationProp;
};


const NfcScreen = ({ navigation }: Props) => {
  return (
    <View>
      <Text>NfcScreen</Text>
    </View>
  );
};

export default NfcScreen;    