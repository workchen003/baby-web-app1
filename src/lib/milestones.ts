// src/lib/milestones.ts

import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
} from 'firebase/firestore';

export interface AchievedMilestone {
  id: string; // The document ID in Firestore
  milestoneId: string; // The unique ID of the milestone from the JSON file
  achievedDate: Date; // The date the milestone was achieved
}

// 根據 babyId 從 Firestore 獲取所有已達成的里程碑
export const getAchievedMilestones = async (
  familyId: string,
  babyId: string
): Promise<Map<string, AchievedMilestone>> => {
  const achievements = new Map<string, AchievedMilestone>();
  const q = query(
    collection(db, 'achieved_milestones'),
    where('familyId', '==', familyId),
    where('babyId', '==', babyId)
  );

  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    achievements.set(data.milestoneId, {
      id: doc.id,
      milestoneId: data.milestoneId,
      achievedDate: (data.achievedDate as Timestamp).toDate(),
    });
  });

  return achievements;
};

// 批次儲存更新後的里程碑狀態
export const saveAchievedMilestones = async (
  familyId: string,
  babyId: string,
  creatorId: string,
  updates: Map<string, Date | null> // Map<milestoneId, achievedDate | null> (null to delete)
) => {
  const batch = writeBatch(db);

  for (const [milestoneId, achievedDate] of updates.entries()) {
    // 使用 babyId 和 milestoneId 組成一個穩定且唯一的文件 ID
    const docRef = doc(collection(db, 'achieved_milestones'), `${babyId}_${milestoneId}`);

    if (achievedDate) {
      // 新增或更新
      batch.set(docRef, {
        familyId,
        babyId,
        creatorId,
        milestoneId,
        achievedDate,
      });
    } else {
      // 刪除
      batch.delete(docRef);
    }
  }

  await batch.commit();
};