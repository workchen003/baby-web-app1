// src/lib/records.ts

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// 簡易的新增記錄函式範例
// 未來我們會擴充這個檔案，加入更多參數與功能
export const addRecord = async (familyId: string, creatorId: string) => {
  if (!familyId || !creatorId) {
    throw new Error('Family ID and Creator ID are required.');
  }

  try {
    // 範例：新增一筆換尿布記錄
    const docRef = await addDoc(collection(db, 'records'), {
      familyId: familyId,
      babyId: 'baby_01', // 暫時寫死，未來會動態選擇
      creatorId: creatorId,
      creatorName: '測試員', // 未來應從 userProfile 傳入
      type: 'diaper',
      timestamp: serverTimestamp(), // 使用伺服器時間
      notes: '這是一筆測試記錄',
      diaperType: ['wet'],
    });
    console.log('Document written with ID: ', docRef.id);
    return docRef;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add record.');
  }
};