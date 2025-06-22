// functions/src/index.ts (使用 v2 語法修正後)

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// 初始化 Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * [Callable Function] 建立一個有時效性的家庭邀請碼
 * v2 語法：(request) => { ... }
 * @param request - 包含 request.auth 和 request.data
 * @returns - { code: string } 包含新產生的邀請碼
 */
export const createInviteCode = onCall(async (request) => {
  // 1. 驗證使用者是否已登入 (v2 語法：使用 request.auth)
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  // 2. 從 request.data 取得 familyId
  const { familyId } = request.data;
  const uid = request.auth.uid;

  if (!familyId) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a 'familyId'."
    );
  }

  // 3. 驗證呼叫者是否為該家庭成員
  const familyDoc = await db.collection("families").doc(familyId).get();
  const familyData = familyDoc.data();

  if (!familyDoc.exists || !familyData?.members?.some((m: any) => m.uid === uid)) {
    throw new HttpsError(
      "permission-denied",
      "You are not a member of this family."
    );
  }

  // 4. 建立邀請文件
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + 24 * 60 * 60 * 1000 // 24 小時後過期
  );

  await db.collection("invites").doc(inviteCode).set({
    familyId: familyId,
    creatorId: uid,
    expiresAt: expiresAt,
  });

  return { code: inviteCode };
});


/**
 * [Callable Function] 接受邀請並加入家庭
 * v2 語法：(request) => { ... }
 * @param request - 包含 request.auth 和 request.data
 * @returns - { success: boolean, message: string }
 */
export const acceptInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to accept an invite."
    );
  }
  
  const uid = request.auth.uid;
  const { inviteCode } = request.data;

  if (!inviteCode) {
    throw new HttpsError(
      "invalid-argument",
      "Please provide an invite code."
    );
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