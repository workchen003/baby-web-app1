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
  batch.set(familyRef, {
    familyName: familyName,
    creatorID: user.uid,
    members: [{ uid: user.uid, role: role }],
    babyIDs: [],
  });

  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    familyIDs: arrayUnion(familyRef.id),
  });
  
  await batch.commit();
};