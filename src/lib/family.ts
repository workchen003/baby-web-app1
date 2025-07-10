// src/lib/family.ts
import { db } from './firebase'; // 確保路徑正確
import { doc, collection, writeBatch, Timestamp, arrayUnion } from 'firebase/firestore';
import { UserProfile } from '@/contexts/AuthContext'; // 引入 UserProfile 接口

interface FamilyData {
  name: string;
  memberUIDs: string[];
  createdAt: Timestamp;
  // 可以添加其他家庭相關的字段，例如：
  // lastActivity: Timestamp;
}

/**
 * 建立新家庭並原子地更新使用者資料。
 * 使用批次寫入確保操作的原子性，避免競態條件導致權限問題。
 * @param userProfile 當前登入用戶的 Profile 資料。
 * @param familyName 要建立的家庭名稱。
 * @returns Promise<string> 返回新建立的家庭 ID。
 * @throws Error 如果使用者資料無效或建立家庭失敗。
 */
export const createFamily = async (userProfile: UserProfile, familyName: string): Promise<string> => {
  if (!userProfile || !userProfile.uid) {
    throw new Error('使用者資料無效，無法建立家庭。');
  }

  const batch = writeBatch(db); // 初始化批次寫入

  // 1. 建立新的家庭文件
  const familyDocRef = doc(collection(db, 'families')); // 自動產生新的文件 ID
  const newFamilyData: FamilyData = {
    name: familyName,
    memberUIDs: [userProfile.uid], // 初始成員就是建立者
    createdAt: Timestamp.now(),
  };
  batch.set(familyDocRef, newFamilyData); // 將家庭建立操作加入批次

  // 2. 更新使用者文件，將新的 familyID 加入其 familyIDs 陣列
  const userDocRef = doc(db, 'users', userProfile.uid);
  batch.update(userDocRef, { // 使用 updateDoc 更語義化地更新現有文檔
    familyIDs: arrayUnion(familyDocRef.id), // 使用 arrayUnion 安全地加入 ID
    lastLogin: Timestamp.now(), // 更新用戶上次登入時間
    // 確保 displayName 不為 null，如果需要可以加入預設值
    // displayName: userProfile.displayName || '新成員',
  }); // 將使用者更新操作加入批次

  try {
    await batch.commit(); // 提交所有批次操作 (這兩個操作要麼一起成功，要麼一起失敗)

    console.log('偵錯日誌：成功透過批次操作建立家庭文件並更新使用者文件。');
    return familyDocRef.id; // 返回新建立的家庭 ID
  } catch (error) {
    console.error("偵錯日誌：建立家庭失敗:", error);
    throw error; // 重新拋出錯誤以便前端處理
  }
};