import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, NativeEventEmitter } from 'react-native';
import Config from '../config';

const { NFCModule } = NativeModules;

type User = {
  username: string;
  cardId: string;
  balance: number;
};

type Transaction = {
  status: string;
  fareDeducted: number;
  newBalance: number;
  timestamp: number;
};

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  lastTransaction: Transaction | null;
  transactionStatus: 'idle' | 'processing' | 'success' | 'failed' | 'offline';
  refreshBalance: () => Promise<void>;
  isLoadingBalance: boolean;
  fetchUserInfo: () => Promise<void>;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

type Props = { children: ReactNode };

export const UserProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'processing' | 'success' | 'failed' | 'offline'>('idle');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);


  // Load user from AsyncStorage on app start
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Sync backend URL to native code
        await NFCModule.setBaseUrl(Config.BASE_URL);
        console.log('[UserContext] Backend URL synced to native code');

        const json = await AsyncStorage.getItem('user');
        if (json) {
          const userData = JSON.parse(json);
          setUser(userData);

          // Also fetch fresh data from backend if user exists
          try {
            await fetchUserInfo();
          } catch (error) {
            console.log('[UserContext] Could not fetch fresh user info, using cached data');
          }
        }
      } catch (error) {
        console.error('[UserContext] Failed to load user from storage:', error);
      }
    };

    initializeUser();
  }, []);

  // Save user to AsyncStorage whenever it changes
  useEffect(() => {
    if (user) {
      AsyncStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  // CENTRALIZED: Listen to NFC events
  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NFCModule);
    
    const subscription = eventEmitter.addListener('NfcEvent', (event) => {
      console.log('[UserContext] NFC Event:', event);
      
      switch (event.type) {
        case 'balanceUpdate':
          // Local balance deducted (before backend sync)
          const newBalance = parseFloat(event.message);
          setUser(prev => prev ? { ...prev, balance: newBalance } : null);
          setTransactionStatus('processing');
          console.log('[UserContext] Local balance updated to:', newBalance);
          break;

        case 'transactionComplete':
          // Backend sync successful - parse complete transaction data
          try {
            const result = JSON.parse(event.message);
            
            setUser(prev => prev ? { ...prev, balance: result.newBalance } : null);
            
            setLastTransaction({
              status: result.status,
              fareDeducted: result.fareDeducted,
              newBalance: result.newBalance,
              timestamp: Date.now(),
            });
            
            setTransactionStatus('success');
            
            console.log('[UserContext] Transaction complete:', result);
            
            // Clear status after 5 seconds
            setTimeout(() => setTransactionStatus('idle'), 5000);
            
          } catch (e) {
            console.error('[UserContext] Failed to parse transaction:', e);
            setTransactionStatus('failed');
          }
          break;

        case 'failure':
          // Transaction failed
          console.error('[UserContext] Transaction failed:', event.message);
          setTransactionStatus('failed');
          setTimeout(() => setTransactionStatus('idle'), 5000);
          break;

        case 'syncFailed':
          // Backend unreachable - transaction queued offline
          console.warn('[UserContext] Sync failed (offline):', event.message);
          setTransactionStatus('offline');
          setTimeout(() => setTransactionStatus('idle'), 5000);
          break;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  //  Fetch user info from backend using stored token
  const fetchUserInfo = async () => {
    try {
      // Get token from native storage
      const token = await NFCModule.getJwtToken();

      const response = await fetch(`${Config.BASE_URL}${Config.API.USER_INFO}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();
      
      setUser({
        username: userInfo.username,
        cardId: userInfo.cardId,
        balance: userInfo.balance,
      });
      
      //  Sync local balance with backend (source of truth)
      await NFCModule.saveLocalBalance(userInfo.balance);
      
      console.log('[UserContext] User info fetched successfully');
      
    } catch (error) {
      console.error('[UserContext] Failed to fetch user info:', error);
      throw error; // Re-throw so caller can handle
    }
  };

  // Refresh balance from backend
  const refreshBalance = async () => {
    setIsLoadingBalance(true);
    try {
      await fetchUserInfo();
    } catch (error) {
      console.error('[UserContext] Failed to refresh balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      lastTransaction,
      transactionStatus,
      refreshBalance,
      isLoadingBalance,
      fetchUserInfo,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};