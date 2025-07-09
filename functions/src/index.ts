import { setGlobalOptions } from "firebase-functions/v2";

// 為所有 v2 函式設定全域選項，解決部署問題並統一區域
setGlobalOptions({ region: "asia-east1" });

import * as admin from "firebase-admin";
import { auth } from "firebase-functions/v1";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { nanoid } from "nanoid";
import { getStorage } from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

// ---------------- v1 Functions ---------------- //

/**
 * 在新使用者透過 Firebase Authentication 註冊時觸發。
 * 此函式的目的是在 Firestore 的 'users' 集合中，為新使用者建立一筆對應的個人資料文件。
 * 加入了詳細的日誌記錄，並使用最穩健的方式處理傳入的 user 物件，以避免前端與後端的競爭問題。
 */
export const createProfileOnSignUp = auth.user().onCreate(async (user) => {
  logger.info(`New user signed up: ${user.uid}, Email: ${user.email}`);
  
  // 雙重保險，確保 user 物件中有 uid
  if (!user.uid) {
    logger.error("User object from Auth trigger is missing uid.", { user });
    return;
  }

  const userProfile = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || '新使用者', // 提供一個預設名字
    photoURL: user.photoURL || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(), // 建立時也記錄時間
    role: 'user', // 預設角色
    familyIDs: [],  // 初始化家庭ID陣列
  };

  try {
    await db.collection("users").doc(user.uid).set(userProfile);
    logger.info(`Successfully created profile for user: ${user.uid}`);
  } catch (error) {
    logger.error(`Failed to create profile for user: ${user.uid}`, { error });
  }
});

/**
 * 在使用者從 Firebase Authentication 中被刪除時觸發。
 * 清理與該使用者相關的所有資料，包括 users 文件、家庭成員資格、以及儲存的檔案。
 */
export const onUserDelete = auth.user().onDelete(async (user) => {
  const { uid } = user;
  const userDocRef = db.collection("users").doc(uid);

  const userDoc = await userDocRef.get();
  const userData = userDoc.data();
  // 注意：欄位名稱應為 'familyIDs' 而非 'families'，與 userProfile 一致
  const familyIDs = userData?.familyIDs || [];

  const batch = db.batch();
  batch.delete(userDocRef);

  for (const familyId of familyIDs) {
    const familyDocRef = db.collection("families").doc(familyId);
    batch.update(familyDocRef, {
      members: admin.firestore.FieldValue.arrayRemove(uid),
      memberUIDs: admin.firestore.FieldValue.arrayRemove(uid) // 同時更新 UID 列表
    });
  }

  const bucket = getStorage().bucket();
  await bucket.deleteFiles({ prefix: `users/${uid}/` });

  return batch.commit();
});

// ---------------- v2 Functions ---------------- //

/**
 * 當寶寶的健康紀錄文件被建立或更新時觸發，自動計算 BMI。
 */
export const calculateAndStoreBMI = onDocumentWritten(
  "babies/{babyId}/records/{recordId}",
  async (event) => {
    if (!event.data?.after.exists) {
      logger.log("Document deleted, skipping BMI calculation.");
      return null;
    }

    const recordData = event.data.after.data();
    if (!recordData) {
      logger.log("No data in the document, skipping.");
      return null;
    }

    const { height, weight } = recordData;

    if (height && weight && height > 0 && weight > 0) {
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      const roundedBmi = Math.round(bmi * 100) / 100;

      return event.data.after.ref.set({ bmi: roundedBmi }, { merge: true });
    }

    return null;
  },
);

/**
 * 可呼叫函式 (Callable Function)，用於建立家庭邀請碼。
 */
export const createFamilyInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "使用者未登入");
  }

  const { familyId } = request.data;
  if (!familyId) {
    throw new HttpsError("invalid-argument", "缺少 familyId");
  }

  const invitationCode = nanoid(8);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小時後過期

  await db.collection("invitations").doc(invitationCode).set({
    familyId,
    code: invitationCode,
    expiresAt,
    createdAt: new Date(),
    createdBy: request.auth.uid,
  });

  return { code: invitationCode };
});

/**
 * 可呼叫函式 (Callable Function)，用於透過邀請碼加入家庭。
 */
export const joinFamilyWithInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "使用者未登入");
  }
  const { code } = request.data;
  if (!code) {
    throw new HttpsError("invalid-argument", "缺少邀請碼");
  }

  const invitationRef = db.collection("invitations").doc(code);
  const invitationDoc = await invitationRef.get();

  if (!invitationDoc.exists) {
    throw new HttpsError("not-found", "邀請碼無效");
  }
  
  const invitationData = invitationDoc.data();
  if (!invitationData) {
      throw new HttpsError("internal", "找不到邀請資料。");
  }

  if (invitationData.expiresAt.toDate() < new Date()) {
    await invitationRef.delete();
    throw new HttpsError("deadline-exceeded", "邀請碼已過期");
  }

  const { familyId } = invitationData;
  if (!familyId) {
    throw new HttpsError("internal", "邀請資料錯誤，缺少 familyId");
  }
  
  const familyRef = db.collection("families").doc(familyId);
  const userRef = db.collection("users").doc(request.auth.uid);

  await db.runTransaction(async (transaction) => {
    transaction.update(familyRef, {
      members: admin.firestore.FieldValue.arrayUnion(request.auth!.token.name || request.auth!.token.email),
      memberUIDs: admin.firestore.FieldValue.arrayUnion(request.auth!.uid)
    });
    transaction.update(userRef, {
      familyIDs: admin.firestore.FieldValue.arrayUnion(familyId),
    });
    transaction.delete(invitationRef);
  });

  return { success: true, familyId };
});