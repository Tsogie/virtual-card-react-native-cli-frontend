import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  username: string;
  cardId: string;
  balance: number;
  
};

type UserContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

type Props = { children: ReactNode };


export const UserProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);

  // load user from AsyncStorage on app start
  useEffect(() => {
    AsyncStorage.getItem('user')
      .then(json => {
        if (json) setUser(JSON.parse(json));
      });
  }, []);

  // save user to AsyncStorage whenever it changes
  useEffect(() => {
    if (user) AsyncStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
