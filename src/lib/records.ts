// src/lib/records.ts

import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp, 
  DocumentData,
  Timestamp,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { UserProfile } from '@/contexts/AuthContext';

// 定義記錄的基礎型別，方便在應用程式中傳遞與使用
export interface RecordData extends DocumentData {
  familyId: string;
  babyId: string;
  creatorId: string;
  creatorName: string | null;
  type: 'feeding' | 'diaper' | 'sleep' | 'solid-food' | 'measurement' | 'bmi';
  timestamp: Timestamp;
  notes?: string;
  
  // For feeding
  amount?: number;
  method?: 'bottle' | 'breastfeeding';
  
  // For diaper
  diaperType?: ('wet' | 'dirty')[];

  // For sleep
  startTime?: Timestamp;
  endTime?: Timestamp;

  // For solid food
  foodItems?: string;
  reaction?: 'good' | 'neutral' | 'bad';

  // For measurement or BMI
  measurementType?: 'height' | 'weight' | 'headCircumference';
  value?: number;
}

/**
 * 新增一筆記錄到 Firestore
 * @param recordData 包含要新增欄位的資料物件
 * @param userProfile 當前登入者的個人資料，用於獲取名稱
 */
export const addRecord = async (recordData: Partial<RecordData>, userProfile: UserProfile | null) => {
  if (!recordData.familyId || !recordData.creatorId) {
    throw new Error('Family ID and Creator ID are required.');
  }
  if (!userProfile) {
    throw new Error('User profile is not available.');
  }

  try {
    // 如果傳入的資料沒有 timestamp，才使用伺服器當前時間
    const dataToSave = {
      ...recordData,
      babyId: 'baby_01', // 暫時寫死
      creatorName: userProfile.displayName,
      timestamp: recordData.timestamp || serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'records'), dataToSave);
    console.log('Document written with ID: ', docRef.id);
    return docRef;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add record.');
  }
};


/**
 * 更新一筆既有的記錄
 * @param recordId 要更新的記錄文件的 ID
 * @param updatedData 包含要更新欄位的物件
 */
export const updateRecord = async (recordId: string, updatedData: Partial<RecordData>) => {
  if (!recordId) {
    throw new Error('Record ID is required for updating.');
  }
  const recordRef = doc(db, 'records', recordId);
  try {
    // 直接使用傳入的 updatedData，它可能包含新的 timestamp
    await updateDoc(recordRef, updatedData);
    console.log('Document updated with ID: ', recordId);
  } catch (e) {
    console.error('Error updating document: ', e);
    throw new Error('Failed to update record.');
  }
};

/**
 * 刪除一筆記錄
 * @param recordId 要刪除的記錄文件的 ID
 */
export const deleteRecord = async (recordId: string) => {
  if (!recordId) {
    throw new Error('Record ID is required for deletion.');
  }
  const recordRef = doc(db, 'records', recordId);
  try {
    await deleteDoc(recordRef);
    console.log('Document deleted with ID: ', recordId);
  } catch (e) {
    console.error('Error deleting document: ', e);
    throw new Error('Failed to delete record.');
  }
};

/**
 * 獲取指定寶寶的所有測量記錄
 * @param familyId 家庭 ID
 * @param babyId 寶寶 ID
 * @returns 回傳包含所有測量記錄的陣列
 */
export const getMeasurementRecords = async (familyId: string, babyId: string) => {
  const recordsRef = collection(db, 'records');
  const q = query(
    recordsRef,
    where('familyId', '==', familyId),
    where('babyId', '==', babyId),
    where('type', '==', 'measurement'),
    orderBy('timestamp', 'asc') // 按時間升序排列
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};