import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

// 取得 Firebase Functions 的實例，並明確指定您 Cloud Function 的部署區域
const functions = getFunctions(app, 'asia-east1');

/**
 * 【前端呼叫】建立家庭邀請碼
 * 呼叫後端的 'createFamilyInvitation' Cloud Function
 * @param data - 包含 familyId 的物件
 * @returns - 一個 Promise，其 data 屬性為包含邀請碼 (code) 的物件
 */
export const createFamilyInvitation = httpsCallable<{ familyId: string }, { code: string }>(
  functions, 
  'createFamilyInvitation'
);

/**
 * 【前端呼叫】使用邀請碼加入家庭
 * 呼叫後端的 'joinFamilyWithInvitation' Cloud Function
 * @param data - 包含邀請碼 (code) 的物件
 * @returns - 一個 Promise，其 data 屬性為包含成功狀態 (success) 和 familyId 的物件
 */
export const joinFamilyWithInvitation = httpsCallable<{ code: string }, { success: boolean, familyId: string }>(
  functions, 
  'joinFamilyWithInvitation'
);

/**
 * 【前端呼叫】刪除照片牆的紀錄與對應的 Storage 檔案
 * @param data - 包含 recordId 和 imageUrl 的物件
 * @returns - 一個 Promise，其 data 屬性為包含成功狀態 (success) 和訊息 (message) 的物件
 */
// 注意：請確保您後端有名為 'deleteSnapshot' 的 Cloud Function
export const deleteSnapshotRecord = httpsCallable<{ recordId: string, imageUrl?: string }, { success: boolean, message: string }>(
  functions, 
  'deleteSnapshot' 
);


// --- 以下為管理員專用功能 ---

/**
 * 【網站管理員專用】從前端呼叫後端，刪除指定使用者帳號及其所有資料
 * @param data - 包含 userIdToDelete 的物件
 * @returns - 一個 Promise，其 data 屬性為包含成功狀態 (success) 和訊息 (message) 的物件
 */
// 注意：請確保您後端有名為 'deleteUserAccount' 的 Cloud Function
export const callDeleteUserAccount = httpsCallable<{ userIdToDelete: string }, { success: boolean, message: string }>(
  functions,
  'deleteUserAccount'
);

/**
 * 【網站管理員專用】從前端呼叫後端，刪除指定家庭及其所有相關資料
 * @param data - 包含 familyId 的物件
 * @returns - 一個 Promise，其 data 屬性為包含成功狀態 (success) 和訊息 (message) 的物件
 */
// 注意：請確保您後端有名為 'deleteFamily' 的 Cloud Function
export const callDeleteFamily = httpsCallable<{ familyId: string }, { success: boolean, message:string }>(
  functions,
  'deleteFamily'
);