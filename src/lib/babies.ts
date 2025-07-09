import { db } from './firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * 定義寶寶個人資料的資料結構。
 * - birthDate 使用 Firestore 原生的 Timestamp 型別，以確保資料一致性。
 */
export interface BabyProfile {
  id: string;
  name: string;
  birthDate: Timestamp;
  gender: 'boy' | 'girl';
  familyId: string;
}

/**
 * 根據 babyId 從 Firestore 中讀取寶寶的個人資料。
 * @param babyId - 寶寶的文件 ID (例如 'baby_01')。
 * @returns - 如果文件存在，則回傳 BabyProfile 物件；否則回傳 null。
 */
export async function getBabyProfile(babyId: string): Promise<BabyProfile | null> {
  const babyDocRef = doc(db, 'babies', babyId);
  const babyDocSnap = await getDoc(babyDocRef);

  if (babyDocSnap.exists()) {
    // 將讀取到的資料轉換為 BabyProfile 型別
    return { id: babyDocSnap.id, ...babyDocSnap.data() } as BabyProfile;
  }
  return null;
}

/**
 * 建立或更新寶寶的個人資料。
 * 使用 setDoc 搭配 { merge: true }，如果文件已存在則更新，不存在則建立。
 * @param babyId - 寶寶的文件 ID。
 * @param data - 要更新或建立的資料，可以是 BabyProfile 的部分欄位。
 */
export async function updateBabyProfile(babyId: string, data: Partial<Omit<BabyProfile, 'id'>>): Promise<void> {
  const babyDocRef = doc(db, 'babies', babyId);
  await setDoc(babyDocRef, data, { merge: true });
}