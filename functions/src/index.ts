import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// v2 onCall 函式需要從 'firebase-functions/v2/https' 引入
import { onCall, HttpsError } from "firebase-functions/v2/https";

// v2 Firestore 觸發器需要從 'firebase-functions/v2/firestore' 引入
import { onDocumentWritten } from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();

// --- 舊有的 onCall 函式，更新為 v2 onCall 語法 ---
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
    });
    transaction.update(userRef, {
      familyIDs: admin.firestore.FieldValue.arrayUnion(familyId),
    });
    transaction.delete(inviteRef);
  });
  return { success: true, message: "Successfully joined the family!" };
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