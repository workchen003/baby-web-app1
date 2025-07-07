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
  QueryConstraint
} from 'firebase/firestore';
import { UserProfile } from '@/contexts/AuthContext';

export type CreatableRecordType = 'feeding' | 'diaper' | 'sleep' | 'solid-food' | 'measurement' | 'snapshot' | 'pumping';

export interface RecordData extends DocumentData {
  familyId: string;
  babyId: string;
  creatorId: string;
  creatorName: string | null;
  type: 'feeding' | 'diaper' | 'sleep' | 'solid-food' | 'measurement' | 'bmi' | 'snapshot' | 'pumping';
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

    if (recordData.type === 'snapshot' && dataToSave.timestamp instanceof Timestamp) {
        const date = dataToSave.timestamp.toDate();
        dataToSave.year = date.getFullYear();
        dataToSave.month = date.getMonth() + 1;
    }

    const docRef = await addDoc(collection(db, 'records'), dataToSave);
    console.log('Document written with ID: ', docRef.id);
    return docRef;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add record.');
  }
};


export const getSnapshots = async (
  familyId: string,
  options: {
    perPage?: number;
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
    filter?: {
      year?: number;
      month?: number;
      tag?: string;
    }
  } = {}
) => {
  const perPage = options.perPage || 20;
  const recordsRef = collection(db, "records");

  const baseConstraints: QueryConstraint[] = [
    where("familyId", "==", familyId),
    where("type", "==", "snapshot"),
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
  baseConstraints.push(limit(perPage));

  if (options.lastDoc) {
    baseConstraints.push(startAfter(options.lastDoc));
  }

  const q = query(recordsRef, ...baseConstraints);

  const querySnapshot = await getDocs(q);
  const snapshots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return {
    snapshots,
    lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1],
  };
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

export const getMeasurementRecords = async (familyId: string, babyId: string): Promise<RecordData[]> => {
  const recordsRef = collection(db, 'records');
  const q = query(
    recordsRef,
    where('familyId', '==', familyId),
    where('babyId', '==', babyId),
    where('type', '==', 'measurement'),
    orderBy('timestamp', 'asc')
  );

  const querySnapshot = await getDocs(q);
  // --- vvv 這裡是本次修改的重點 vvv ---
  // 我們告訴 TypeScript，從 Firestore 回來的 doc.data() 內容，
  // 把它當作 RecordData 來對待。
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as RecordData; // 先進行型別斷言
    return {
        id: doc.id,
        ...data
    };
  });
  // --- ^^^ 這裡是本次修改的重點 ^^^ ---
};