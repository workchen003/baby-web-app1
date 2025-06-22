// src/contexts/AuthContext.tsx (更新後)

'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile extends DocumentData {
  uid: string;
  email: string | null;
  displayName: string | null;
  familyIDs?: string[];
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refetchUserProfile: () => Promise<void>; // 【新增】定義刷新函式
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  refetchUserProfile: async () => {}, // 初始空函式
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserData = useCallback(async (currentUser: User): Promise<UserProfile> => {
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        const newUserProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            familyIDs: [],
        };
        await setDoc(userRef, { ...newUserProfile, lastLogin: serverTimestamp() });
        return newUserProfile;
    } else {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        return userDoc.data() as UserProfile;
    }
  }, []);

  // 【新增】一個可從外部呼叫的刷新函式
  const refetchUserProfile = useCallback(async () => {
    if (user) {
      const profile = await syncUserData(user);
      setUserProfile(profile);
    }
  }, [user, syncUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await syncUserData(user);
        setUser(user);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserData]);

  const value = { user, userProfile, loading, refetchUserProfile }; // 【新增】將函式提供出去

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};