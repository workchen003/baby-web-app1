// src/contexts/AuthContext.tsx (增加新用戶導向邏輯)

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation'; // 引入 useRouter

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

const syncAndCheckUserData = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  
  // 先用 getDoc 讀取一次資料
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // 如果文件不存在 (代表是全新用戶)，才進行寫入
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      authProvider: "google",
      lastLogin: serverTimestamp(),
      familyIDs: [], // 預設一個空的 familyIDs
    };
    await setDoc(userRef, userData);
    // 返回 true 表示是新用戶
    return true;
  } else {
    // 如果文件已存在，檢查是否有 familyIDs
    await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    const hasFamily = userDoc.data()?.familyIDs?.length > 0;
    // 返回 false 表示是老用戶或已有家庭
    return !hasFamily;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // 初始化 router

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          // 【修改】呼叫新的函式，並取得是否為新用戶的結果
          const isNewUserWithoutFamily = await syncAndCheckUserData(user);
          if (isNewUserWithoutFamily) {
            // 如果是沒有家庭的新用戶，導向建立頁面
            router.push('/onboarding/create-family');
          }
        } catch (error) {
          console.error("CRITICAL: Error during user data sync/check.", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};