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
    throw error;
  }
};

/**
 * [新增] 前端呼叫後端，刪除照片與紀錄
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
    // 將後端傳來的具體錯誤訊息拋出，方便前端顯示
    throw error;
  }
};