// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withSpring,
//   withTiming,
// } from 'react-native-reanimated';
// import { useEffect } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
// const { NFCModule } = NativeModules;

// type Props = { 
//   cardId: string; 
// };

// export default function Nfc({ cardId }: { cardId: string }) {
//   const translateY = useSharedValue(300);
//   const scale = useSharedValue(0.8);
//   const opacity = useSharedValue(0);

//   useEffect(() => {
//     // Animate card floating in after component mounts
//     translateY.value = withSpring(0, { damping: 10 });
//     scale.value = withSpring(1);
//     opacity.value = withTiming(1, { duration: 800 });
//   }, []);

//   const animatedStyle = useAnimatedStyle(() => ({
//     transform: [{ translateY: translateY.value }, { scale: scale.value }],
//     opacity: opacity.value,
//   }));

//   return (
//     <Animated.View style={[styles.card, animatedStyle]}>
//       <Text style={styles.title}>Transit Wallet</Text>
//       <Text style={styles.cardText}>NFC Status: Ready to tap ✅</Text>
//       <TouchableOpacity style={styles.button}>
//         <Text style={styles.buttonText}>Refresh Token</Text>
//       </TouchableOpacity>
//     </Animated.View>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     width: '90%',
//     backgroundColor: '#2E7D32',
//     borderRadius: 20,
//     padding: 20,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 12,
//     elevation: 6,
//   },
//   title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 10 },
//   cardText: { color: '#C8E6C9', fontSize: 16, marginBottom: 20 },
//   button: {
//     backgroundColor: '#66BB6A',
//     paddingHorizontal: 24,
//     paddingVertical: 10,
//     borderRadius: 12,
//   },
//   buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
// });
