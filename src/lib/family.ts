// src/lib/family.ts (更新後)

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
 * 建立家庭
 * @param user - 當前登入的使用者物件
 * @param familyName - 新家庭的名稱
 * @param role - 使用者在家庭中的角色
 */
export const createFamily = async (
  user: User,
  familyName: string,
  role: string // 【新增】接收角色參數
) => {
  const batch = writeBatch(db);

  const familyRef = doc(collection(db, 'families'));
  batch.set(familyRef, {
    familyName: familyName,
    creatorID: user.uid,
    members: [{ uid: user.uid, role: role }], // 【修改】使用傳入的角色
    babyIDs: [],
  });

  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    familyIDs: arrayUnion(familyRef.id),
  });
  
  await batch.commit();
};