// src/app/dashboard/page.tsx

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOutUser } from '@/lib/auth';
import { addRecord } from '@/lib/records';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';

// --- 【建議 1 & 3】定義型別與常數 ---
const COLLECTIONS = {
  RECORDS: 'records',
};
const RECORD_FIELDS = {
  FAMILY_ID: 'familyId',
  TIMESTAMP: 'timestamp',
};

interface Record {
  id: string;
  type: string;
  notes: string;
  timestamp: Timestamp; // 使用 Firebase 的 Timestamp 型別
  [key: string]: any; // 允許其他欄位
}

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const [latestRecords, setLatestRecords] = useState<Record[]>([]);
  const [isRecordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  // --- 【建議 2】從 userProfile 中取出穩定的依賴值 ---
  const currentFamilyId = userProfile?.familyIDs?.[0];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    
    // 將判斷邏輯移到 effect 內部，並依賴 currentFamilyId
    if (!currentFamilyId) {
      if (!loading && user) { // 確保在非載入狀態下才導向
        router.replace('/onboarding/create-family');
      }
      return;
    }
      
    const q = query(
      collection(db, COLLECTIONS.RECORDS),
      where(RECORD_FIELDS.FAMILY_ID, "==", currentFamilyId),
      orderBy(RECORD_FIELDS.TIMESTAMP, "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const records = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Record)); // 轉換成我們的 Record 型別
        setLatestRecords(records);
        setRecordsLoading(false);
        setRecordsError(null);
      }, 
      (error) => {
        console.error("Firestore snapshot error:", error);
        setRecordsError("無法載入紀錄，請稍後再試。");
        setRecordsLoading(false);
      }
    );

    return () => unsubscribe();
  // --- 【建議 2】更新依賴陣列 ---
  }, [user, currentFamilyId, loading, router]);

  const handleAddTestRecord = async () => {
    if (currentFamilyId && user) {
      try {
        await addRecord(currentFamilyId, user.uid);
        alert('測試記錄已新增！');
      } catch (error) {
        // --- 【建議 4】改善錯誤處理 ---
        console.error("新增測試記錄失敗:", error);
        alert('新增失敗！詳細錯誤請見開發者控制台。');
      }
    } else {
        alert('無法獲取家庭資訊，請重新整理。');
    }
  };
  
  if (loading || (!currentFamilyId && !loading)) {
    return <div className="flex min-h-screen items-center justify-center">載入中或正在重新導向...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col w-full bg-gray-50">
      <header /* ... */ >
        {/* Header 內容不變 */}
      </header>
      
      <main className="w-full container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ... Sections ... */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">近期時間軸</h2>
            <button onClick={handleAddTestRecord} className="text-sm bg-gray-200 px-3 py-1 rounded-md hover:bg-gray-300">新增測試記錄</button>
          </div>
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            {isRecordsLoading ? (
              <p>正在載入記錄...</p>
            ) : recordsError ? (
              <p className="text-center text-red-500 py-4">{recordsError}</p>
            ) : latestRecords.length > 0 ? (
              latestRecords.map((record) => (
                <div key={record.id} className="p-2 border-b last:border-b-0">
                  <p className="font-semibold">類型: {record.type}</p>
                  <p>備註: {record.notes}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {/* 使用 ?. 來安全地存取 toDate */}
                    時間: {record.timestamp?.toDate().toLocaleString() || 'N/A'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">目前沒有任何記錄。</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}