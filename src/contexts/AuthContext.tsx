// src/contexts/AuthContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // 使用 tsconfig.json 中的路徑別名 @/*

// 定義 Context 的值型別
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// 建立 Context
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// 建立 Context Provider 元件
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged 會在使用者登入、登出或 token 刷新時觸發
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // 元件卸載時取消監聽
    return () => unsubscribe();
  }, []);

  const value = { user, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 建立自訂 Hook，方便其他元件使用
export const useAuth = () => {
  return useContext(AuthContext);
};