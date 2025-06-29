// [修正] src/lib/records.ts

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
  getDocs,
  limit,
} from 'firebase/firestore';
import { UserProfile } from '@/contexts/AuthContext';

// [修正] 在 'type' 中加入 'snapshot' 型別，並新增 imageUrl 欄位
export interface RecordData extends DocumentData {
  familyId: string;
  babyId: string;
  creatorId: string;
  creatorName: string | null;
  type: 'feeding' | 'diaper' | 'sleep' | 'solid-food' | 'measurement' | 'bmi' | 'snapshot';
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

  // For snapshot
  imageUrl?: string;
}

/**
 * [新增] 獲取照片牆的紀錄
 * @param familyId - 家庭 ID
 * @param options - 可選參數，用於未來實作無限滾動
 * @returns 回傳包含照片紀錄的陣列
 */
export const getSnapshots = async (familyId: string, options: { perPage?: number } = {}) => {
  const perPage = options.perPage || 20;

  const recordsRef = collection(db, "records");
  const q = query(
    recordsRef,
    where("familyId", "==", familyId),
    where("type", "==", "snapshot"),
    orderBy("timestamp", "desc"),
    limit(perPage)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- 以下為既有函式，保持不變 ---
export const addRecord = async (recordData: Partial<RecordData>, userProfile: UserProfile | null) => {
  if (!recordData.familyId || !recordData.creatorId) {
    throw new Error('Family ID and Creator ID are required.');
  }
  if (!userProfile) {
    throw new Error('User profile is not available.');
  }

  try {
    const dataToSave = {
      ...recordData,
      babyId: 'baby_01',
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

export const getMeasurementRecords = async (familyId: string, babyId: string) => {
  const recordsRef = collection(db, 'records');
  const q = query(
    recordsRef,
    where('familyId', '==', familyId),
    where('babyId', '==', babyId),
    where('type', '==', 'measurement'),
    orderBy('timestamp', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};