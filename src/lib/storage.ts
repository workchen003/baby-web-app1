import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";
import { v4 as uuidv4 } from 'uuid'; // 我們需要一個套件來產生唯一的檔名

// 請先安裝 uuid 套件
// 在終端機執行: pnpm add uuid && pnpm add -D @types/uuid

const storage = getStorage(app);

/**
 * 上傳檔案到 Firebase Storage
 * @param file - 使用者選擇的檔案物件
 * @param userId - 當前使用者的 ID
 * @returns 回傳上傳成功後的公開下載 URL
 */
export const uploadImage = async (file: File, userId: string): Promise<string> => {
  if (!file || !userId) {
    throw new Error("檔案和使用者 ID 為必填項。");
  }

  // 產生一個唯一的檔名，避免檔案覆蓋
  const fileExtension = file.name.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  
  // 建立一個指向 'user_uploads/{userId}/uniqueFileName' 的參照
  const storageRef = ref(storage, `user_uploads/${userId}/${uniqueFileName}`);

  try {
    // 上傳檔案
    const snapshot = await uploadBytes(storageRef, file);
    
    // 獲取下載 URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("圖片上傳失敗:", error);
    throw new Error("無法上傳圖片，請稍後再試。");
  }
};