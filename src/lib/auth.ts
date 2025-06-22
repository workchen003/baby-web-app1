// src/lib/auth.ts (修正後)

import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";

/**
 * 透過 Google 彈出視窗登入
 */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error during Google sign-in:", error);
    return null;
  }
};

/**
 * 登出
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

/**
 * [後端預留] 使用 Email 和密碼註冊
 * 注意：此功能根據專案計畫書，初期不在 UI 上提供入口
 */
// 修正：為 email 和 password 加上 string 型別
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing up with email:", error);
    return null;
  }
};

/**
 * [後端預留] 使用 Email 和密碼登入
 * 注意：此功能根據專案計畫書，初期不在 UI 上提供入口
 */
// 修正：為 email 和 password 加上 string 型別
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email:", error);
    return null;
  }
};