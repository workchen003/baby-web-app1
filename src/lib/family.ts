// src/lib/family.ts

import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  arrayUnion,
  writeBatch,
  DocumentData,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { User } from 'firebase/auth';

// 定義家庭成員的詳細資料結構
export interface FamilyMember {
    uid: string;
    role: string;
    displayName?: string; // 從 users 集合中取得
    photoURL?: string;    // 從 users 集合中取得
}

// 定義完整家庭資料的結構
export interface FamilyDetails extends DocumentData {
    id: string;
    familyName: string;
    creatorID: string;
    members: FamilyMember[];
    memberUIDs: string[];
}

/**
 * 建立家庭
 */
export const createFamily = async (
  user: User,
  familyName: string,
  role: string
) => {
  const batch = writeBatch(db);
  const familyRef = doc(collection(db, 'families'));
  
  batch.set(familyRef, {
    familyName: familyName,
    creatorID: user.uid,
    members: [{ uid: user.uid, role: role }],
    memberUIDs: [user.uid], 
    babyIDs: [],
    createdAt: new Date(),
  });

  const userRef = doc(db, 'users', user.uid);
  batch.update(userRef, {
    familyIDs: arrayUnion(familyRef.id),
  });
  
  await batch.commit();
};

/**
 * 【網站管理員專用】獲取所有家庭的列表
 */
export const getAllFamilies = async (): Promise<FamilyDetails[]> => {
    const familiesSnapshot = await getDocs(collection(db, "families"));
    return familiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyDetails));
}

/**
 * 【核心修改】獲取指定家庭的詳細資料，包含成員的公開資訊
 * @param familyId 家庭 ID
 * @returns 家庭詳細資料或 null
 */
export const getFamilyDetails = async (familyId: string): Promise<FamilyDetails | null> => {
    if (!familyId) return null;

    const familyRef = doc(db, 'families', familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
        console.warn(`Family with ID ${familyId} not found.`);
        return null;
    }

    const familyData = familySnap.data();
    const memberUIDs = familyData.memberUIDs || [];

    if (memberUIDs.length === 0) {
        // ▼▼▼【修正一】▼▼▼
        // 明確列出所有屬性，確保符合 FamilyDetails 型別
        return { 
            id: familySnap.id, 
            familyName: familyData.familyName,
            creatorID: familyData.creatorID,
            memberUIDs: familyData.memberUIDs,
            members: [], // 確保 members 是一個空陣列
        };
    }
    
    const usersQuery = query(collection(db, 'users'), where('uid', 'in', memberUIDs));
    const usersSnapshot = await getDocs(usersQuery);
    const usersDataMap = new Map<string, DocumentData>();
    usersSnapshot.forEach(userDoc => {
        usersDataMap.set(userDoc.id, userDoc.data());
    });

    const hydratedMembers: FamilyMember[] = familyData.members.map((member: { uid: string; role: string }) => {
        const userData = usersDataMap.get(member.uid);
        return {
            ...member,
            displayName: userData?.displayName || '未知成員',
            photoURL: userData?.photoURL || '',
        };
    });

    // ▼▼▼【修正二】▼▼▼
    // 同樣，明確列出所有屬性，讓 TypeScript 安心
    return {
        id: familySnap.id,
        familyName: familyData.familyName,
        creatorID: familyData.creatorID,
        memberUIDs: familyData.memberUIDs,
        members: hydratedMembers,
    };
};