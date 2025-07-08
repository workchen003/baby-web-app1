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
 * @param role - 使用者在家庭中的角色 (例如：爸爸、媽媽)
 */
export const createFamily = async (
  user: User,
  familyName: string,
  role: string
) => {
  const batch = writeBatch(db);

  // 產生一個新的 family 文件參照
  const familyRef = doc(collection(db, 'families'));
  
  // 在建立家庭文件時，同時儲存一個 memberUIDs 陣列
  // 這將大大簡化未來安全規則的撰寫
  batch.set(familyRef, {
    familyName: familyName,
    creatorID: user.uid,
    // 【核心修改】儲存包含詳細資訊的成員物件陣列
    members: [{ uid: user.uid, role: role }],
    // 同時也儲存一個只包含 UID 的陣列，專門給安全規則使用
    memberUIDs: [user.uid], 
    babyIDs: [], // 未來可在此存放家庭內所有寶寶的 ID
    createdAt: new Date(), // 直接使用客戶端時間
  });

  // 更新當前使用者的 user 文件，將新的 family ID 加入
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    familyIDs: arrayUnion(familyRef.id),
  });
  
  // 一次性提交所有操作
  await batch.commit();
};