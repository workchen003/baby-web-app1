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
  Timestamp
} from 'firebase/firestore';
import { UserProfile } from '@/contexts/AuthContext';

// 定義記錄的基礎型別，方便在應用程式中傳遞與使用
export interface RecordData extends DocumentData {
  familyId: string;
  babyId: string;
  creatorId: string;
  creatorName: string | null;
  type: 'feeding' | 'diaper' | 'sleep' | 'solid-food'; // --- 修改：新增 'solid-food' ---
  timestamp: Timestamp;
  notes?: string;
  
  // 針對不同類型的可選欄位
  amount?: number;
  method?: 'bottle' | 'breastfeeding';
  diaperType?: ('wet' | 'dirty')[];
  startTime?: Timestamp;
  endTime?: Timestamp;

  // --- 新增：針對副食品的欄位 ---
  foodItems?: string; // 吃了什麼，用文字記錄
  reaction?: 'good' | 'neutral' | 'bad'; // 寶寶反應
}

/**
 * 新增一筆記錄到 Firestore
 * @param recordData 不包含 timestamp 等伺服器生成欄位的資料物件
 * @param userProfile 當前登入者的個人資料，用於獲取名稱
 * @returns 回傳一個指向新建立文件的參照
 */
export const addRecord = async (recordData: Omit<RecordData, 'timestamp' | 'creatorName' | 'babyId'>, userProfile: UserProfile | null) => {
  if (!recordData.familyId || !recordData.creatorId) {
    throw new Error('Family ID and Creator ID are required.');
  }
  if (!userProfile) {
    throw new Error('User profile is not available.');
  }

  try {
    const docRef = await addDoc(collection(db, 'records'), {
      ...recordData,
      babyId: 'baby_01', // 暫時寫死，未來會動態選擇
      creatorName: userProfile.displayName, // 從 userProfile 動態獲取
      timestamp: serverTimestamp(), // 使用伺服器時間
    });
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