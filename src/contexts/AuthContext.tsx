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
  role?: 'admin' | 'user';
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
        role: 'user',
      };
      await setDoc(userRef, { 
        ...newUserProfile, 
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      return newUserProfile;
    } else {
      const existingData = userDoc.data() as UserProfile;
      const dataToUpdate: Partial<UserProfile> = {
        lastLogin: serverTimestamp(),
      };
      let roleToReturn = existingData.role;

      if (!existingData.role) {
        dataToUpdate.role = 'user';
        roleToReturn = 'user';
      }
      
      await setDoc(userRef, dataToUpdate, { merge: true });
      return { ...existingData, role: roleToReturn };
    }
  }, []);

  const refetchUserProfile = useCallback(async () => {
    if (user) {
      try {
        const profile = await syncUserData(user);
        setUserProfile(profile);
      } catch (error: unknown) {
        console.error("Error refetching user profile:", error);
      }
    }
  }, [user, syncUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const profile = await syncUserData(user);
          setUser(user);
          setUserProfile(profile);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error: unknown) { // <-- 修正點一：明確指定 error 型別
        console.error("Error during auth state change:", error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe(); // 修正點二：確保 cleanup 函式有實際作用
    };
  }, [syncUserData]);

  const value = { user, userProfile, loading, refetchUserProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};