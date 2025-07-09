// src/lib/family.ts
import { db } from './firebase';
// 移除了 writeBatch，改為單獨的 setDoc
import { doc, setDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { UserProfile } from '@/contexts/AuthContext';

export async function createFamily(user: UserProfile, familyName: string): Promise<string> {
  const familyDocRef = doc(db, 'families', crypto.randomUUID());
  const userDocRef = doc(db, 'users', user.uid);

  const newFamily = {
    id: familyDocRef.id,
    name: familyName,
    members: [user.displayName],
    memberUIDs: [user.uid],
    createdAt: Timestamp.now(),
    creatorId: user.uid,
  };

  // ✅【關鍵修正】: 將批次寫入拆分為兩個獨立的 await 操作

  try {
    // 步驟一：先建立家庭文件
    console.log("偵錯日誌：正嘗試建立家庭文件...");
    await setDoc(familyDocRef, newFamily);
    console.log("偵錯日誌：成功建立家庭文件。");

  } catch (error) {
    console.error("【錯誤點A】建立家庭文件時失敗！", error);
    throw error; // 將錯誤拋出，讓前端可以捕捉到
  }

  try {
    // 步驟二：再更新使用者文件
    console.log("偵錯日誌：正嘗試更新使用者文件...");
    await setDoc(userDocRef, { 
      familyIDs: arrayUnion(familyDocRef.id) 
    }, { merge: true });
    console.log("偵錯日誌：成功更新使用者文件。");

  } catch (error) {
    console.error("【錯誤點B】更新使用者文件時失敗！", error);
    throw error; // 將錯誤拋出，讓前端可以捕捉到
  }

  return familyDocRef.id;
}