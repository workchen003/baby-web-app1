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
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  QueryConstraint,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { UserProfile } from '@/contexts/AuthContext';

// 定義可建立的紀錄類型
export type CreatableRecordType = 'feeding' | 'diaper' | 'sleep' | 'solid-food' | 'measurement' | 'snapshot' | 'pumping';

// 定義所有紀錄的資料結構
export interface RecordData extends DocumentData {
  familyId: string;
  babyId: string;
  creatorId: string;
  creatorName: string | null;
  type: CreatableRecordType | 'bmi';
  timestamp: Timestamp;
  notes?: string;
  amount?: number;
  feedMethod?: 'breast' | 'formula';
  formulaBrand?: string;
  caloriesPerMl?: number;
  diaperType?: ('wet' | 'dirty')[];
  startTime?: Timestamp;
  endTime?: Timestamp;
  foodItems?: string;
  reaction?: 'good' | 'neutral' | 'bad';
  measurementType?: 'height' | 'weight' | 'headCircumference';
  value?: number;
  imageUrl?: string;
  tags?: string[];
  year?: number;
  month?: number;
}

// 定義餐食計畫的資料結構
export interface MealPlan {
  [dateKey: string]: {
    feedCount: number;
    volumePerFeed: number;
    menu: {
      breakfast: { recipeName: string; grams: number }[];
      lunch: { recipeName: string; grams: number }[];
      dinner: { recipeName: string; grams: number }[];
      snacks: { recipeName: string; grams: number }[];
    };
  };
}

// 定義分享計畫的資料結構
export interface SharedPlanData {
    plan: MealPlan;
    babyName: string;
    createdAt: Timestamp;
    sharerId: string;
    note?: string;
}

/**
 * 建立並儲存一個可分享的計畫
 * @param data - 要分享的計畫內容
 * @returns 回傳這個分享計畫的唯一ID
 */
export const createSharedPlan = async (data: Omit<SharedPlanData, 'createdAt'>): Promise<string> => {
    const sharedPlansRef = collection(db, 'sharedMealPlans');
    const newPlanRef = doc(sharedPlansRef);
    await setDoc(newPlanRef, {
        ...data,
        createdAt: serverTimestamp(),
    });
    return newPlanRef.id;
};

/**
 * 根據 ID 獲取分享的計畫
 * @param planId - 分享計畫的唯一ID
 * @returns 回傳計畫內容或 null
 */
export const getSharedPlanById = async (planId: string): Promise<SharedPlanData | null> => {
    const planRef = doc(db, 'sharedMealPlans', planId);
    const docSnap = await getDoc(planRef);
    if (docSnap.exists()) {
        return docSnap.data() as SharedPlanData;
    }
    return null;
}

/**
 * 儲存使用者的餐食計畫
 * @param familyId - 家庭ID
 * @param plan - 計畫內容
 */
export const saveMealPlan = async (familyId: string, plan: MealPlan) => {
    const planRef = doc(db, 'mealPlans', familyId);
    await setDoc(planRef, { plan }, { merge: true });
};

/**
 * 獲取使用者的餐食計畫
 * @param familyId - 家庭ID
 * @returns 回傳計畫內容或 null
 */
export const getMealPlan = async (familyId: string): Promise<MealPlan | null> => {
    const planRef = doc(db, 'mealPlans', familyId);
    const docSnap = await getDoc(planRef);
    if (docSnap.exists()) {
        return docSnap.data().plan as MealPlan;
    }
    return null;
};

/**
 * 獲取指定日期範圍內的所有紀錄
 * @param familyId - 家庭ID
 * @param babyId - 寶寶ID
 * @param startDate - 開始日期
 * @param endDate - 結束日期
 * @returns 回傳紀錄陣列
 */
export const getRecordsForDateRange = async (familyId: string, babyId: string, startDate: Date, endDate: Date): Promise<RecordData[]> => {
    const recordsRef = collection(db, 'records');
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    const q = query(
        recordsRef,
        where('familyId', '==', familyId),
        where('babyId', '==', babyId),
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp),
        orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data() as RecordData;
        return { id: doc.id, ...data };
    });
};

/**
 * 新增一筆照護紀錄
 * @param recordData - 紀錄內容
 * @param userProfile - 使用者個人資料
 */
export const addRecord = async (recordData: Partial<RecordData>, userProfile: UserProfile | null) => {
  if (!recordData.familyId || !recordData.creatorId) throw new Error('Family ID and Creator ID are required.');
  if (!userProfile) throw new Error('User profile is not available.');
  try {
    const dataToSave = { ...recordData, babyId: 'baby_01', creatorName: userProfile.displayName, timestamp: recordData.timestamp || serverTimestamp() };
    if (recordData.type === 'snapshot' && dataToSave.timestamp instanceof Timestamp) {
        const date = dataToSave.timestamp.toDate();
        dataToSave.year = date.getFullYear();
        dataToSave.month = date.getMonth() + 1;
    }
    await addDoc(collection(db, 'records'), dataToSave);
  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add record.');
  }
};

/**
 * 獲取所有生長測量紀錄
 * @param familyId - 家庭ID
 * @param babyId - 寶寶ID
 * @returns 回傳生長紀錄陣列
 */
export const getMeasurementRecords = async (familyId: string, babyId: string): Promise<RecordData[]> => {
  const recordsRef = collection(db, 'records');
  const q = query( recordsRef, where('familyId', '==', familyId), where('babyId', '==', babyId), where('type', '==', 'measurement'), orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as RecordData;
    return { id: doc.id, ...data };
  });
};

/**
 * 更新一筆紀錄
 * @param recordId - 紀錄ID
 * @param updatedData - 要更新的資料
 */
export const updateRecord = async (recordId: string, updatedData: Partial<RecordData>) => {
  const recordRef = doc(db, 'records', recordId);
  await updateDoc(recordRef, updatedData);
};

/**
 * 刪除一筆紀錄
 * @param recordId - 紀錄ID
 */
export const deleteRecord = async (recordId: string) => {
  const recordRef = doc(db, 'records', recordId);
  await deleteDoc(recordRef);
};

/**
 * 獲取照片牆的紀錄 (支援分頁與篩選)
 * @param familyId - 家庭ID
 * @param options - 選項物件
 */
export const getSnapshots = async ( familyId: string, options: { perPage?: number; lastDoc?: QueryDocumentSnapshot<DocumentData>; filter?: { year?: number; month?: number; tag?: string; } } = {}) => {
  const perPage = options.perPage || 20;
  const recordsRef = collection(db, "records");
  const baseConstraints: QueryConstraint[] = [ where("familyId", "==", familyId), where("type", "==", "snapshot") ];
  if (options.filter) {
    if (options.filter.year) baseConstraints.push(where("year", "==", options.filter.year));
    if (options.filter.month) baseConstraints.push(where("month", "==", options.filter.month));
    if (options.filter.tag && options.filter.tag.trim() !== '') baseConstraints.push(where("tags", "array-contains", options.filter.tag.trim()));
  }
  baseConstraints.push(orderBy("timestamp", "desc"), limit(perPage));
  if (options.lastDoc) baseConstraints.push(startAfter(options.lastDoc));
  const q = query(recordsRef, ...baseConstraints);
  const querySnapshot = await getDocs(q);
  const snapshots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return { snapshots, lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1] };
};