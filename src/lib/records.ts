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
// ✅【最終整合】: 使用正確的 UserProfile 匯入路徑
import { UserProfile } from '@/contexts/AuthContext';

// 定義可建立的紀錄類型
export type CreatableRecordType = 'feeding' | 'diaper' | 'sleep' | 'solid-food' | 'measurement' | 'snapshot' | 'pumping';

// 定義所有紀錄的資料結構 (與您提供的版本完全一致)
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

// 建立並儲存一個可分享的計畫
export const createSharedPlan = async (data: Omit<SharedPlanData, 'createdAt'>): Promise<string> => {
    const sharedPlansRef = collection(db, 'sharedMealPlans');
    const newPlanRef = doc(sharedPlansRef);
    await setDoc(newPlanRef, {
        ...data,
        createdAt: serverTimestamp(),
    });
    return newPlanRef.id;
};

// 根據 ID 獲取分享的計畫
export const getSharedPlanById = async (planId: string): Promise<SharedPlanData | null> => {
    const planRef = doc(db, 'sharedMealPlans', planId);
    const docSnap = await getDoc(planRef);
    if (docSnap.exists()) {
        return docSnap.data() as SharedPlanData;
    }
    return null;
}

// 儲存使用者的餐食計畫
export const saveMealPlan = async (familyId: string, plan: MealPlan) => {
    const planRef = doc(db, 'mealPlans', familyId);
    await setDoc(planRef, { plan }, { merge: true });
};

// 獲取使用者的餐食計畫
export const getMealPlan = async (familyId: string): Promise<MealPlan | null> => {
    const planRef = doc(db, 'mealPlans', familyId);
    const docSnap = await getDoc(planRef);
    if (docSnap.exists()) {
        return docSnap.data().plan as MealPlan;
    }
    return null;
};

// 獲取指定日期範圍內的所有紀錄
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

// 新增一筆照護紀錄 (採用扁平化結構且型別安全)
export const addRecord = async (recordData: Partial<RecordData>, userProfile: UserProfile | null) => {
  if (!recordData.familyId || !recordData.creatorId || !recordData.babyId) {
      throw new Error('Family ID, Baby ID, and Creator ID are required.');
  }
  if (!userProfile) throw new Error('User profile is not available.');
  
  try {
    const finalTimestamp = recordData.timestamp || Timestamp.now();
    
    // 建立一個與您 RecordData 結構完全匹配的儲存物件
    const dataToSave: Omit<RecordData, 'id'> = {
        familyId: recordData.familyId,
        babyId: recordData.babyId,
        creatorId: recordData.creatorId,
        creatorName: userProfile.displayName,
        type: recordData.type as CreatableRecordType,
        timestamp: finalTimestamp,
        notes: recordData.notes,
        amount: recordData.amount,
        feedMethod: recordData.feedMethod,
        formulaBrand: recordData.formulaBrand,
        caloriesPerMl: recordData.caloriesPerMl,
        diaperType: recordData.diaperType,
        startTime: recordData.startTime,
        endTime: recordData.endTime,
        foodItems: recordData.foodItems,
        reaction: recordData.reaction,
        measurementType: recordData.measurementType,
        value: recordData.value,
        imageUrl: recordData.imageUrl,
        tags: recordData.tags,
    };
    
    if (recordData.type === 'snapshot') {
        const date = finalTimestamp.toDate();
        dataToSave.year = date.getFullYear();
        dataToSave.month = date.getMonth() + 1;
    }

    await addDoc(collection(db, 'records'), dataToSave as DocumentData);

  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add record.');
  }
};

// 獲取所有生長測量紀錄
export const getMeasurementRecords = async (familyId: string, babyId: string): Promise<RecordData[]> => {
  const recordsRef = collection(db, 'records');
  const q = query( recordsRef, where('familyId', '==', familyId), where('babyId', '==', babyId), where('type', '==', 'measurement'), orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as RecordData;
    return { id: doc.id, ...data };
  });
};

// 更新一筆紀錄
export const updateRecord = async (recordId: string, updatedData: Partial<RecordData>) => {
  const recordRef = doc(db, 'records', recordId);
  await updateDoc(recordRef, updatedData);
};

// 刪除一筆紀錄
export const deleteRecord = async (recordId: string) => {
  const recordRef = doc(db, 'records', recordId);
  await deleteDoc(recordRef);
};

// 獲取照片牆的紀錄 (支援分頁與篩選)
export const getSnapshots = async ( familyId: string, options: { perPage?: number; lastDoc?: QueryDocumentSnapshot<DocumentData>; filter?: { year?: number; month?: number; tag?: string; } } = {}) => {
  const perPage = options.perPage || 20;
  const recordsRef = collection(db, "records");
  
  const baseConstraints: QueryConstraint[] = [ 
    where("familyId", "==", familyId), 
    where("type", "==", "snapshot") 
  ];
  
  if (options.filter) {
    if (options.filter.year) {
      baseConstraints.push(where("year", "==", options.filter.year));
    }
    if (options.filter.month) {
      baseConstraints.push(where("month", "==", options.filter.month));
    }
    if (options.filter.tag && options.filter.tag.trim() !== '') {
      baseConstraints.push(where("tags", "array-contains", options.filter.tag.trim()));
    }
  }

  baseConstraints.push(orderBy("timestamp", "desc"));
  if (options.lastDoc) {
    baseConstraints.push(startAfter(options.lastDoc));
  }
  baseConstraints.push(limit(perPage));
  
  const q = query(recordsRef, ...baseConstraints);
  const querySnapshot = await getDocs(q);
  
  const snapshots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return { 
    snapshots, 
    lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1] 
  };
};