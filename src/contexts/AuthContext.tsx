'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  familyIDs?: string[];
  role?: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 除錯碼：監聽 Auth 狀態變化 ---
  useEffect(() => {
    console.log('[AuthContext] 正在設定 onAuthStateChanged 監聽器...');
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // 這個日誌會告訴我們，Firebase 的登入/登出狀態是否正常觸發
      console.log(`[AuthContext] onAuthStateChanged 觸發！firebaseUser:`, firebaseUser ? `UID: ${firebaseUser.uid}` : 'null');
      
      if (firebaseUser) {
        // 狀態1: 使用者已登入，設定 user 物件
        setUser(firebaseUser);
      } else {
        // 狀態2: 使用者已登出，清空所有資料
        setUser(null);
        setUserProfile(null);
        setLoading(false); // 登出後，結束載入狀態
      }
    });

    return () => {
      console.log('[AuthContext] 正在清理 onAuthStateChanged 監聽器。');
      unsubscribeAuth();
    };
  }, []);

  // --- 除錯碼：監聽 Firestore 資料變化 ---
  useEffect(() => {
    // 這個 effect 會在上面 user 狀態更新後觸發
    if (user) {
      console.log(`[AuthContext] user 狀態已更新 (UID: ${user.uid})，準備設定 userProfile 的 onSnapshot 監聽器。`);
      const userDocRef = doc(db, 'users', user.uid);
      
      const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
        // 這個日誌會告訴我們，與 Firestore 的連線是否成功，以及文件是否存在
        console.log(`[AuthContext] onSnapshot 觸發！文件 (users/${user.uid}) 是否存在: ${docSnap.exists()}`);
        
        if (docSnap.exists()) {
          const profileData = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
          // 這個日誌最關鍵，它會顯示我們從資料庫拿到的確切資料
          console.log('[AuthContext] 成功取得 userProfile，資料內容:', profileData);
          setUserProfile(profileData);
        } else {
          // 如果文件不存在，代表後端的 Cloud Function 可能有問題或延遲
          console.warn(`[AuthContext] 使用者文件 (users/${user.uid}) 尚不存在。正在等待後端 Cloud Function 建立...`);
          setUserProfile(null);
        }
        
        // 無論如何，只要 onSnapshot 有回應，就代表驗證流程已告一段落，可以停止主要載入動畫
        console.log('[AuthContext] onSnapshot 回應，設定 loading 為 false。');
        setLoading(false);

      }, (error) => {
        // 如果監聽本身就出錯（例如網路問題或權限不足），這裡會顯示
        console.error("[AuthContext] 監聽 userProfile 時發生嚴重錯誤:", error);
        setUserProfile(null);
        setLoading(false);
      });

      return () => {
        console.log(`[AuthContext] 正在清理 userProfile (UID: ${user.uid}) 的 onSnapshot 監聽器。`);
        unsubscribeSnapshot();
      };
    } else {
      // 如果 user 是 null (例如登出時)，這裡會被觸發
      console.log('[AuthContext] user 狀態為 null，無需設定 onSnapshot 監聽器。');
    }
  }, [user]); // 這個 effect 只依賴 user 物件的變化

  // 這個日誌會顯示每一次元件重新渲染時的狀態，幫助我們追蹤流程
  console.log('[AuthContext] Provider 正在渲染...',"Loading:", loading, "User:", user?.uid, "Profile:", userProfile?.uid);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);