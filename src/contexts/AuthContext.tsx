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
  role?: 'admin' | 'user'; // role 欄位維持可選
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

  // **** 核心修正點 ****
  const syncUserData = useCallback(async (currentUser: User): Promise<UserProfile> => {
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // 情況1：新使用者註冊
      const newUserProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        familyIDs: [],
        role: 'user', // 新註冊的使用者，預設角色為 'user'
      };
      await setDoc(userRef, { 
          ...newUserProfile, 
          lastLogin: serverTimestamp(),
          createdAt: serverTimestamp() 
      });
      // 直接回傳我們剛剛建立的 profile 物件
      return newUserProfile;
    } else {
      // 情況2：現有使用者登入
      const existingData = userDoc.data() as UserProfile;
      const dataToUpdate: any = {
        lastLogin: serverTimestamp()
      };
      let roleToReturn = existingData.role;

      // 如果資料庫中的使用者沒有 role 欄位，幫他們補上 'user'
      if (!existingData.role) {
        dataToUpdate.role = 'user';
        roleToReturn = 'user'; // 確保回傳的 profile 也有這個新角色
        await setDoc(userRef, dataToUpdate, { merge: true });
      } else {
        // 如果已有角色，只需更新登入時間
        await setDoc(userRef, dataToUpdate, { merge: true });
      }
      
      // 回傳一個包含最新角色的 profile 物件
      return { ...existingData, role: roleToReturn };
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
      try {
        if (user) {
          const profile = await syncUserData(user);
          setUser(user);
          setUserProfile(profile);
        } else {
          setUser(null);
          setUserProfile(null);ㄋ
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