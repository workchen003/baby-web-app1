// src/contexts/AuthContext.tsx (最終修正版 - 新增錯誤處理)

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
  refetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  refetchUserProfile: async () => {},
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

  const refetchUserProfile = useCallback(async () => {
    if (user) {
      try {
        const profile = await syncUserData(user);
        setUserProfile(profile);
      } catch (error) {
        console.error("Error refetching user profile:", error);
      }
    }
  }, [user, syncUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // **關鍵修改：使用 try...catch...finally 包裹非同步操作**
      try {
        if (user) {
          const profile = await syncUserData(user);
          setUser(user);
          setUserProfile(profile);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error during auth state change:", error);
        // 發生錯誤時，將使用者狀態重置，避免不一致
        setUser(null);
        setUserProfile(null);
      } finally {
        // 無論成功或失敗，最終都將 loading 狀態設為 false
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [syncUserData]);

  const value = { user, userProfile, loading, refetchUserProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};