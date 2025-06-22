import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 從環境變數讀取您的 Firebase 專案設定
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 初始化 Firebase App
// 透過 getApps().length 檢查，避免在 Next.js 的熱重載(hot-reloading)中重複初始化
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 匯出我們需要的 Firebase 服務
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };