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

  // **關鍵邏輯**：此函式負責在使用者登入時，同步其在 Firestore 中的資料。
  const syncUserData = useCallback(async (currentUser: User): Promise<UserProfile> => {
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    // 如果使用者文件不存在（代表是第一次登入）
    if (!userDoc.exists()) {
      console.log(`User profile for ${currentUser.uid} not found. Creating new profile.`);
      const newUserProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        familyIDs: [],
        role: 'user', // 預設角色
      };
      
      // **建立文件**：這個 setDoc 操作將被新的安全規則所允許。
      await setDoc(userRef, {
        ...newUserProfile,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      return newUserProfile;
    } else {
      // 如果文件已存在，則更新最後登入時間並回傳資料
      const existingData = userDoc.data() as UserProfile;
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      return existingData;
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
      } catch (error: unknown) {
        console.error("Error during auth state change:", error);
        setUser(null);
        setUserProfile(null);
      } finally {
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