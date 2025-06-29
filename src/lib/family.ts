// src/lib/family.ts

import { db } from './firebase';
import {
  collection,
  doc,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * 建立家庭
 * @param user - 當前登入的使用者物件
 * @param familyName - 新家庭的名稱
 * @param role - 使用者在家庭中的角色
 */
export const createFamily = async (
  user: User,
  familyName: string,
  role: string
) => {
  const batch = writeBatch(db);

  const familyRef = doc(collection(db, 'families'));
  
  // [修改] 在建立家庭文件時，同時儲存一個 memberUIDs 陣列
  // 這將大大簡化安全規則的撰寫
  batch.set(familyRef, {
    familyName: familyName,
    creatorID: user.uid,
    // 儲存包含詳細資訊的成員物件
    members: [{ uid: user.uid, role: role }],
    // 同時也儲存一個只包含 UID 的陣列，專門給安全規則使用
    memberUIDs: [user.uid], 
    babyIDs: [],
    // [新增] 新增 PDF 匯出相關欄位
    lastPdfExportYear: null, // 儲存上次匯出的年份，例如 2025
    pdfExportCount: 0,
  });

  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    familyIDs: arrayUnion(familyRef.id),
  });
  
  await batch.commit();
};