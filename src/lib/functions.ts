// src/lib/functions.ts

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

// 建議明確指定您 Cloud Function 的部署區域
const functions = getFunctions(app, 'asia-east1');

/**
 * 前端呼叫後端，產生邀請碼
 * @param familyId 使用者當前家庭的 ID
 * @returns {Promise<string>} 成功時返回邀請碼
 */
export const generateInviteCode = async (familyId: string): Promise<string> => {
  try {
    const createInviteCodeFunction = httpsCallable(functions, 'createInviteCode');
    const result = await createInviteCodeFunction({ familyId });
    const data = result.data as { code: string };
    return data.code;
  } catch (error) {
    console.error('Error generating invite code:', error);
    throw new Error('無法產生邀請碼，請稍後再試。');
  }
};

/**
 * 前端呼叫後端，接受邀請
 * @param inviteCode 使用者輸入的邀請碼
 * @returns {Promise<{success: boolean; message: string;}>} 成功或失敗的結果
 */
export const joinFamilyWithCode = async (inviteCode: string) => {
  try {
    const acceptInviteFunction = httpsCallable(functions, 'acceptInvite');
    const result = await acceptInviteFunction({ inviteCode });
    return result.data as { success: boolean; message: string; };
  } catch (error) {
    console.error('Error accepting invite:', error);
    // 將後端傳來的具體錯誤訊息拋出，方便前端顯示
    throw error;
  }
};

/**
 * 前端呼叫後端，刪除照片與紀錄
 * @param recordId Firestore 文件的 ID
 * @param imageUrl Storage 圖片的 URL
 * @returns 成功或失敗的結果
 */
export const deleteSnapshotRecord = async (recordId: string, imageUrl: string) => {
  try {
    const deleteSnapshotFunction = httpsCallable(functions, 'deleteSnapshot');
    const result = await deleteSnapshotFunction({ recordId, imageUrl });
    return result.data as { success: boolean; message: string; };
  } catch (error) {
    console.error('刪除照片時發生錯誤:', error);
    throw error;
  }
};


// ▼▼▼【第五步核心：新的前端呼叫函式】▼▼▼

/**
 * 【網站管理員專用】從前端呼叫後端，刪除指定使用者
 * @param userIdToDelete 要刪除的使用者 ID
 * @returns 成功或失敗的結果
 */
export const callDeleteUserAccount = async (userIdToDelete: string) => {
  try {
    const deleteUserFunction = httpsCallable(functions, 'deleteUserAccount');
    const result = await deleteUserFunction({ userIdToDelete });
    return result.data as { success: boolean; message: string; };
  } catch (error) {
    console.error('刪除使用者時發生錯誤:', error);
    throw error;
  }
};

/**
 * 【網站管理員專用】從前端呼叫後端，刪除指定家庭
 * @param familyId 要刪除的家庭 ID
 * @returns 成功或失敗的結果
 */
export const callDeleteFamily = async (familyId: string) => {
  try {
    const deleteFamilyFunction = httpsCallable(functions, 'deleteFamily');
    const result = await deleteFamilyFunction({ familyId });
    return result.data as { success: boolean; message: string; };
  } catch (error) {
    console.error('刪除家庭時發生錯誤:', error);
    throw error;
  }
};