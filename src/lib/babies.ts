// src/lib/babies.ts

import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';

export interface BabyProfile extends DocumentData {
  id: string;
  name: string;
  birthDate: Date;
  gender: 'boy' | 'girl';
  gestationalAgeWeeks: number; // 出生週數
  familyId: string;
}

// 獲取寶寶資料
export const getBabyProfile = async (
  babyId: string
): Promise<BabyProfile | null> => {
  const babyRef = doc(db, 'babies', babyId);
  const babySnap = await getDoc(babyRef);

  if (!babySnap.exists()) {
    return null;
  }

  const data = babySnap.data();
  return {
    id: babySnap.id,
    name: data.name,
    birthDate: (data.birthDate as Timestamp).toDate(),
    gender: data.gender,
    gestationalAgeWeeks: data.gestationalAgeWeeks,
    familyId: data.familyId,
  };
};

// 更新或建立寶寶資料
export const updateBabyProfile = async (
  babyId: string,
  data: Omit<BabyProfile, 'id' | 'familyId'> & { familyId: string }
) => {
  const babyRef = doc(db, 'babies', babyId);
  // 我們使用 setDoc 搭配 merge: true，這樣如果文件不存在就會建立，如果存在就會更新。
  await setDoc(babyRef, data, { merge: true });
};