// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();

// --- 既有的 onCall 函式 ---
export const createInviteCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const { familyId } = request.data;
  const uid = request.auth.uid;
  if (!familyId) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'familyId'.");
  }
  const familyDoc = await db.collection("families").doc(familyId).get();
  const familyData = familyDoc.data();
  if (!familyDoc.exists || !familyData?.members?.some((m: any) => m.uid === uid)) {
    throw new HttpsError("permission-denied", "You are not a member of this family.");
  }
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
  await db.collection("invites").doc(inviteCode).set({
    familyId: familyId,
    creatorId: uid,
    expiresAt: expiresAt,
  });
  return { code: inviteCode };
});

export const acceptInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to accept an invite.");
  }
  const uid = request.auth.uid;
  const { inviteCode } = request.data;
  if (!inviteCode) {
    throw new HttpsError("invalid-argument", "Please provide an invite code.");
  }
  const inviteRef = db.collection("invites").doc(inviteCode);
  const inviteDoc = await inviteRef.get();
  const inviteData = inviteDoc.data();
  if (!inviteDoc.exists || (inviteData?.expiresAt && inviteData.expiresAt.toMillis() < Date.now())) {
    throw new HttpsError("not-found", "Invalid or expired invite code.");
  }
  const { familyId } = inviteData as any;
  await db.runTransaction(async (transaction) => {
    const userRef = db.collection("users").doc(uid);
    const familyRef = db.collection("families").doc(familyId);
    transaction.update(familyRef, {
      members: admin.firestore.FieldValue.arrayUnion({ uid: uid, role: "成員" }),
      memberUIDs: admin.firestore.FieldValue.arrayUnion(uid) // [重要] 確保加入家庭時也更新 memberUIDs
    });
    transaction.update(userRef, {
      familyIDs: admin.firestore.FieldValue.arrayUnion(familyId),
    });
    transaction.delete(inviteRef);
  });
  return { success: true, message: "Successfully joined the family!" };
});

/**
 * [新增] 刪除照片手札的 Cloud Function
 * @param data - 包含 recordId 和 imageUrl 的物件
 */
export const deleteSnapshot = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "您必須登入才能執行此操作。");
  }

  const { recordId, imageUrl } = request.data;
  if (!recordId || !imageUrl) {
    throw new HttpsError("invalid-argument", "缺少必要的參數 (recordId, imageUrl)。");
  }

  const uid = request.auth.uid;
  const recordRef = db.collection("records").doc(recordId);

  try {
    const doc = await recordRef.get();
    if (!doc.exists) {
      throw new HttpsError("not-found", "找不到指定的紀錄文件。");
    }
    const data = doc.data();

    // 權限驗證：確保只有紀錄的建立者才能刪除
    if (!data || data.creatorId !== uid) {
      throw new HttpsError("permission-denied", "您沒有權限刪除此紀錄。");
    }

    // 1. 從 Storage 刪除圖片檔案
    const bucket = admin.storage().bucket();
    // 從 URL 中解析出檔案在 Storage 中的路徑
    const filePath = decodeURIComponent(new URL(imageUrl).pathname.split('/o/')[1].split('?')[0]);
    await bucket.file(filePath).delete();

    // 2. 從 Firestore 刪除紀錄文件
    await recordRef.delete();

    return { success: true, message: "照片已成功刪除。" };
  } catch (error) {
    functions.logger.error("刪除照片失敗:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "刪除過程中發生未知錯誤。");
  }
});

// --- BMI 計算函式，更新為 v2 onDocumentWritten 語法 ---
export const calculateAndStoreBMI = onDocumentWritten("records/{recordId}", async (event) => {
  // 從 event.data 中獲取文件快照
  if (!event.data?.after.exists) {
    // 這是刪除事件，不處理
    return null;
  }

  const newData = event.data.after.data();

  if (!newData) {
      functions.logger.log("No data associated with the event.");
      return null;
  }

  if (newData.type !== "measurement" || !["weight", "height"].includes(newData.measurementType)) {
    return null;
  }
  
  const { babyId, familyId, timestamp, creatorId, creatorName } = newData;
  const date = timestamp.toDate();
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
  const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);
  
  const recordsRef = db.collection("records");
  
  const querySnapshot = await recordsRef
    .where("familyId", "==", familyId)
    .where("babyId", "==", babyId)
    .where("type", "==", "measurement")
    .where("timestamp", ">=", startTimestamp)
    .where("timestamp", "<=", endTimestamp)
    .get();

  let weight: number | null = null;
  let height: number | null = null;
  let weightTimestamp: admin.firestore.Timestamp | null = null;

  querySnapshot.forEach((doc) => {
    const record = doc.data();
    if (record.measurementType === "weight") {
      weight = record.value;
      weightTimestamp = record.timestamp;
    }
    if (record.measurementType === "height") {
      height = record.value;
    }
  });

  if (weight && height && weightTimestamp) {
    const heightInMeters = height / 100;
    const bmiValue = weight / (heightInMeters * heightInMeters);

    const bmiQuery = await recordsRef
      .where("familyId", "==", familyId)
      .where("babyId", "==", babyId)
      .where("type", "==", "bmi")
      .where("timestamp", "==", weightTimestamp)
      .limit(1)
      .get();

    if (bmiQuery.empty) {
      await recordsRef.add({
        familyId,
        babyId,
        type: "bmi",
        value: parseFloat(bmiValue.toFixed(2)),
        timestamp: weightTimestamp,
        creatorId: creatorId,
        creatorName: creatorName,
      });
      functions.logger.log(`BMI calculated and stored for baby ${babyId} on ${date.toLocaleDateString()}: ${bmiValue.toFixed(2)}`);
    } else {
      functions.logger.log(`BMI record already exists for baby ${babyId} on ${date.toLocaleDateString()}`);
    }
  }
  
  return null;
});