// functions/src/index.ts

// --- Imports ---
// 導入 v2 onCall 可呼叫函式
import { onCall, HttpsError } from "firebase-functions/v2/https";
// 明確從 v1 導入背景觸發函式所需模組和型別
import { auth, firestore, EventContext, logger } from "firebase-functions/v1";
// 導入 v1/v2 共用的 Change 型別
import { Change } from "firebase-functions";
// 導入 Firebase Admin SDK
import * as admin from "firebase-admin";

// 為 mealPlanData.ts 定義型別
interface Macronutrients { carbs: number; protein: number; fat: number; }
interface Ingredient { name: string; }
export interface Recipe {
  name: string;
  category: 'staple' | 'protein' | 'vegetable' | 'fruit';
  caloriesPerGram: number;
  allergens?: ('egg' | 'fish' | 'nuts' | 'dairy' | 'gluten' | 'soy')[];
  ingredients: Ingredient[];
  nutrientsPer100g: Macronutrients;
}
export interface AgeStagePlan {
  stage: string;
  ageInMonthsStart: number;
  ageInMonthsEnd: number;
  caloriesPerKg: number;
  recipes: Recipe[];
  defaultFeedCount: number;
  defaultVolumePerFeed: number;
}
// 引入食譜資料
import { mealPlanData } from "./mealPlanData";

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// --- Cloud Functions ---

export const createProfileOnSignUp = auth.user().onCreate((user) => {
  const { uid, email, displayName, photoURL } = user;

  const userRef = db.collection("users").doc(uid);
  logger.log(`New user signed up: ${uid}. Creating profile.`);

  return userRef.set({
    uid,
    email,
    displayName,
    photoURL,
    familyIDs: [],
    role: "user",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const createInviteCode = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "您必須登入才能執行此操作。");
  const { familyId } = request.data;
  const uid = request.auth.uid;
  if (!familyId) throw new HttpsError("invalid-argument", "必須提供 'familyId'。");
  const familyDoc = await db.collection("families").doc(familyId).get();
  const familyData = familyDoc.data();
  if (!familyDoc.exists || !familyData?.memberUIDs?.includes(uid)) {
    throw new HttpsError("permission-denied", "您不是此家庭的成員。");
  }
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
  await db.collection("invites").doc(inviteCode).set({
    familyId,
    creatorId: uid,
    expiresAt,
  });
  return { code: inviteCode };
});

export const acceptInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "您必須登入才能接受邀請。");
  const uid = request.auth.uid;
  const { inviteCode } = request.data;
  if (!inviteCode) throw new HttpsError("invalid-argument", "請提供邀請碼。");
  const inviteRef = db.collection("invites").doc(inviteCode);
  const inviteDoc = await inviteRef.get();
  const inviteData = inviteDoc.data();
  if (!inviteDoc.exists || (inviteData?.expiresAt && inviteData.expiresAt.toMillis() < Date.now())) {
    throw new HttpsError("not-found", "無效或已過期的邀請碼。");
  }
  const { familyId } = inviteData as any;
  await db.runTransaction(async (transaction) => {
    const userRef = db.collection("users").doc(uid);
    const familyRef = db.collection("families").doc(familyId);
    transaction.update(familyRef, {
      members: admin.firestore.FieldValue.arrayUnion({ uid: uid, role: "成員" }),
      memberUIDs: admin.firestore.FieldValue.arrayUnion(uid)
    });
    transaction.update(userRef, {
      familyIDs: admin.firestore.FieldValue.arrayUnion(familyId),
    });
    transaction.delete(inviteRef);
  });
  return { success: true, message: "成功加入家庭！" };
});

export const deleteSnapshot = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "您必須登入才能執行此操作。");
  const { recordId, imageUrl } = request.data;
  if (!recordId || !imageUrl) throw new HttpsError("invalid-argument", "缺少必要的參數 (recordId, imageUrl)。");
  const uid = request.auth.uid;
  const recordRef = db.collection("records").doc(recordId);
  try {
    const doc = await recordRef.get();
    if (!doc.exists) throw new HttpsError("not-found", "找不到指定的紀錄文件。");
    const data = doc.data();
    if (!data || data.creatorId !== uid) throw new HttpsError("permission-denied", "您沒有權限刪除此紀錄。");
    const bucket = storage.bucket();
    const filePath = decodeURIComponent(new URL(imageUrl).pathname.split('/o/')[1].split('?')[0]);
    await bucket.file(filePath).delete();
    await recordRef.delete();
    return { success: true, message: "照片已成功刪除。" };
  } catch (error) {
    logger.error("刪除照片失敗:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "刪除過程中發生未知錯誤。");
  }
});

export const calculateAndStoreBMI = firestore
  .document("records/{recordId}")
  .onWrite(async (change: Change<firestore.DocumentSnapshot>, context: EventContext) => {
    if (!change.after.exists) {
      return null;
    }
    const newData = change.after.data();
    if (!newData || newData.type !== "measurement" || !["weight", "height"].includes(newData.measurementType)) {
      return null;
    }

    const { babyId, familyId, timestamp, creatorId, creatorName } = newData;
    const date = timestamp.toDate();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);
    const recordsRef = db.collection("records");
    const querySnapshot = await recordsRef.where("familyId", "==", familyId).where("babyId", "==", babyId).where("type", "==", "measurement").where("timestamp", ">=", startTimestamp).where("timestamp", "<=", endTimestamp).get();

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
      const bmiQuery = await recordsRef.where("familyId", "==", familyId).where("babyId", "==", babyId).where("type", "==", "bmi").where("timestamp", "==", weightTimestamp).limit(1).get();
      if (bmiQuery.empty) {
        await recordsRef.add({
          familyId, babyId, type: "bmi",
          value: parseFloat(bmiValue.toFixed(2)),
          timestamp: weightTimestamp, creatorId, creatorName,
        });
        logger.log(`BMI calculated for baby ${babyId}: ${bmiValue.toFixed(2)}`);
      }
    }
    return null;
});

export const getMealPlanSuggestions = onCall<{ babyAgeInMonths: number }, Promise<{ stage: AgeStagePlan | null; recipes: Recipe[]; suggestedCalories: number }>>(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "您必須登入才能取得建議。");
    const { babyAgeInMonths } = request.data;
    if (typeof babyAgeInMonths !== 'number') throw new HttpsError("invalid-argument", "必須提供寶寶的月齡 (babyAgeInMonths)。");
    
    const activeStage = mealPlanData.find(stage => babyAgeInMonths >= stage.ageInMonthsStart && babyAgeInMonths < stage.ageInMonthsEnd) || null;
    const availableRecipes = activeStage ? activeStage.recipes : [];
    const estimatedWeight = 3 + babyAgeInMonths * 0.5;
    const suggestedCalories = activeStage ? activeStage.caloriesPerKg * estimatedWeight : 750;

    return { stage: activeStage, recipes: availableRecipes, suggestedCalories: Math.round(suggestedCalories) };
});

// --- 管理員專用 Cloud Functions ---

export const deleteUserAccount = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "您必須登入才能執行此操作。");
    
    const callerUid = request.auth.uid;
    const callerDoc = await db.collection("users").doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
        throw new HttpsError("permission-denied", "只有網站管理員才能執行此操作。");
    }

    const { userIdToDelete } = request.data;
    if (!userIdToDelete || typeof userIdToDelete !== 'string') {
        throw new HttpsError("invalid-argument", "必須提供要刪除的使用者 ID (userIdToDelete)。");
    }
    
    logger.log(`Admin ${callerUid} is attempting to delete user ${userIdToDelete}`);

    try {
        const userRef = db.collection("users").doc(userIdToDelete);
        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new HttpsError("not-found", `找不到 ID 為 ${userIdToDelete} 的使用者。`);
        
        await admin.auth().deleteUser(userIdToDelete);
        await userRef.delete();

        logger.log(`Successfully deleted user ${userIdToDelete} by admin ${callerUid}`);
        return { success: true, message: `使用者 ${userIdToDelete} 已被成功刪除。` };

    } catch (error) {
        logger.error(`Failed to delete user ${userIdToDelete}`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "刪除使用者過程中發生未知錯誤。");
    }
});

export const deleteFamily = onCall(async (request) => {
    if (!request.auth || (await db.collection('users').doc(request.auth.uid).get()).data()?.role !== 'admin') {
        throw new HttpsError('permission-denied', '只有網站管理員可以刪除家庭。');
    }

    const { familyId } = request.data;
    if (!familyId || typeof familyId !== 'string') {
        throw new HttpsError('invalid-argument', '必須提供要刪除的家庭 ID (familyId)。');
    }
    
    logger.log(`Admin ${request.auth.uid} is attempting to delete family ${familyId}`);
    
    const batch = db.batch();
    const familyRef = db.collection('families').doc(familyId);

    try {
        const familyDoc = await familyRef.get();
        if (!familyDoc.exists) throw new HttpsError('not-found', `找不到 ID 為 ${familyId} 的家庭。`);
        
        const familyData = familyDoc.data();

        if (familyData && familyData.memberUIDs && familyData.memberUIDs.length > 0) {
            for (const uid of familyData.memberUIDs) {
                const userRef = db.collection('users').doc(uid);
                batch.update(userRef, { familyIDs: admin.firestore.FieldValue.arrayRemove(familyId) });
            }
        }

        const babiesSnapshot = await db.collection('babies').where('familyId', '==', familyId).get();
        babiesSnapshot.forEach(doc => batch.delete(doc.ref));

        const recordsSnapshot = await db.collection('records').where('familyId', '==', familyId).get();
        recordsSnapshot.forEach(doc => {
            if (doc.data().type === 'snapshot' && doc.data().imageUrl) {
                try {
                    const filePath = decodeURIComponent(new URL(doc.data().imageUrl).pathname.split('/o/')[1].split('?')[0]);
                    storage.bucket().file(filePath).delete().catch(e => logger.error(`Failed to delete storage file ${filePath}`, e));
                } catch(e) {
                    logger.error(`Invalid imageUrl format, cannot delete from storage: ${doc.data().imageUrl}`, e);
                }
            }
            batch.delete(doc.ref);
        });
        
        batch.delete(familyRef);
        await batch.commit();

        logger.log(`Successfully deleted family ${familyId} by admin ${request.auth.uid}`);
        return { success: true, message: `家庭 ${familyId} 及其所有資料已被成功刪除。` };

    } catch (error) {
        logger.error(`Failed to delete family ${familyId}`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "刪除家庭過程中發生未知錯誤。");
    }
});