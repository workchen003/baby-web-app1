// src/lib/babies.ts

import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';

// 定義奶類類型
export type MilkType = 'breast' | 'formula' | 'mixed';

// 定義寶寶的個人資料結構
export interface BabyProfile extends DocumentData {
  id: string;
  name: string;
  birthDate: Date;
  gender: 'boy' | 'girl';
  gestationalAgeWeeks: number; // 出生週數
  familyId: string; // 【重要】標示此寶寶屬於哪個家庭

  // 新增的詳細資料欄位
  milkType?: MilkType;
  formulaBrand?: string;
  formulaCalories?: number; // 每 100ml 的熱量
  knownAllergens?: string[];
  watchListFoods?: string[];
}

/**
 * 【核心修改】獲取指定 ID 的寶寶資料
 * @param babyId - 寶寶的唯一文件 ID
 * @returns 回傳寶寶的個人資料，若不存在則回傳 null
 */
export const getBabyProfile = async (
  babyId: string
): Promise<BabyProfile | null> => {
  if (!babyId) {
    console.warn("getBabyProfile called with no babyId.");
    return null;
  }
  const babyRef = doc(db, 'babies', babyId);
  const babySnap = await getDoc(babyRef);

  if (!babySnap.exists()) {
    console.warn(`Baby profile with ID ${babyId} not found.`);
    return null;
  }

  const data = babySnap.data();
  // 將從 Firestore 讀取的 Timestamp 物件轉換回 JavaScript 的 Date 物件
  return {
    id: babySnap.id,
    name: data.name,
    birthDate: (data.birthDate as Timestamp).toDate(),
    gender: data.gender,
    gestationalAgeWeeks: data.gestationalAgeWeeks,
    familyId: data.familyId,
    milkType: data.milkType,
    formulaBrand: data.formulaBrand,
    formulaCalories: data.formulaCalories,
    knownAllergens: data.knownAllergens || [],
    watchListFoods: data.watchListFoods || [],
  };
};

/**
 * 【核心修改】更新或建立寶寶的個人資料
 * @param babyId - 寶寶的唯一文件 ID
 * @param data - 要更新或建立的資料
 */
export const updateBabyProfile = async (
  babyId: string,
  // 這裡我們要求傳入的資料必須包含 familyId
  data: Omit<BabyProfile, 'id'> & { familyId: string }
) => {
  const babyRef = doc(db, 'babies', babyId);
  // 使用 setDoc 搭配 { merge: true }，如果文件不存在就會建立，如果存在就會更新指定的欄位。
  await setDoc(babyRef, data, { merge: true });
};