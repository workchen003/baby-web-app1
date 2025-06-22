// src/lib/family.ts (簡化後)

import { db } from './firebase';
import {
  collection,
  doc,
  updateDoc,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * 僅建立家庭，不包含寶寶資訊
 * @param user - 當前登入的使用者物件
 * @param familyName - 新家庭的名稱
 */
export const createFamily = async (
  user: User,
  familyName: string
) => {
  // 使用批次寫入 (Batched Write) 來確保所有操作的原子性
  const batch = writeBatch(db);

  // 1. 在 /families 集合中建立新家庭文件
  const familyRef = doc(collection(db, 'families'));
  batch.set(familyRef, {
    familyName: familyName,
    creatorID: user.uid,
    members: [{ uid: user.uid, role: '爸爸' }], // 預設建立者為成員
    babyIDs: [], // 初始為空陣列
  });

  // 2. 更新 /users/{user.uid} 文件，加入新的家庭 ID
  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    familyIDs: arrayUnion(familyRef.id),
  });
  
  // 提交所有批次寫入操作
  await batch.commit();
};