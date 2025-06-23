// src/lib/auth.ts

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";
// 【新增】從 firebase/app 匯入 FirebaseError 型別
import { FirebaseError } from "firebase/app";

let isSigningIn = false;

export const signInWithGoogle = async () => {
  if (isSigningIn) return null;
  isSigningIn = true;

  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: unknown) { // 【修改】將 error 的型別從 any 改為 unknown
    // 【修改】使用型別檢查來安全地存取 error 的屬性
    if (error instanceof FirebaseError && error.code !== "auth/cancelled-popup-request") {
      console.error("Error during Google sign-in:", error);
    }
    return null;
  } finally {
    isSigningIn = false;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing up with email:", error);
    return null;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email:", error);
    return null;
  }
};