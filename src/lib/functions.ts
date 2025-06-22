// src/lib/functions.ts

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

// 初始化 Functions 服務
const functions = getFunctions(app);

// 建立一個指向 'createInviteCode' 的可呼叫函式參考
const createInviteCodeFunction = httpsCallable(functions, 'createInviteCode');

// 建立一個指向 'acceptInvite' 的可呼叫函式參考
const acceptInviteFunction = httpsCallable(functions, 'acceptInvite');


/**
 * 前端呼叫後端，產生邀請碼
 * @param familyId 使用者當前家庭的 ID
 * @returns {Promise<string>} 成功時返回邀請碼
 */
export const generateInviteCode = async (familyId: string): Promise<string> => {
  try {
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
    const result = await acceptInviteFunction({ inviteCode });
    return result.data as { success: boolean; message: string; };
  } catch (error) {
    console.error('Error accepting invite:', error);
    // 將 Firebase 的錯誤訊息傳遞出去，讓 UI 顯示
    throw error;
  }
};