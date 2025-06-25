// src/app/dashboard/page.tsx (最終修正版 - 新增錯誤處理)

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOutUser } from '@/lib/auth';
import { addRecord } from '@/lib/records';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const [latestRecords, setLatestRecords] = useState<DocumentData[]>([]);
  const [isRecordsLoading, setRecordsLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (userProfile) {
      if (!userProfile.familyIDs || userProfile.familyIDs.length === 0) {
        router.replace('/onboarding/create-family');
        return;
      }
      
      const currentFamilyId = userProfile.familyIDs[0];
      
      const q = query(
        collection(db, "records"),
        where("familyId", "==", currentFamilyId),
        orderBy("timestamp", "desc"),
        limit(5)
      );

      const unsubscribe = onSnapshot(q, 
        // Success Callback
        (querySnapshot) => {
          const records: DocumentData[] = [];
          querySnapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
          });
          setLatestRecords(records);
          setFirestoreError(null); // 成功讀取，清除錯誤訊息
          setRecordsLoading(false);
        },
        // **新增的錯誤處理 Callback**
        (error) => {
          console.error("Firestore snapshot listener error:", error);
          // AbortError 通常是良性的，我們可以忽略它
          if (error.code !== 'cancelled') {
            setFirestoreError("無法載入記錄，請檢查您的網路連線或權限設定。");
          }
          setRecordsLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, userProfile, loading, router]);

  const handleAddTestRecord = async () => {
    if (userProfile && user && userProfile.familyIDs) {
      try {
        await addRecord(userProfile.familyIDs[0], user.uid);
        alert('測試記錄已新增！');
      } catch (error) {
        alert('新增失敗！');
      }
    }
  };
  
  if (loading || !userProfile || !userProfile.familyIDs || userProfile.familyIDs.length === 0) {
    return <div className="flex min-h-screen items-center justify-center">載入中或正在重新導向...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col w-full bg-gray-50">
      <header className="w-full bg-white shadow-sm flex-shrink-0">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            {userProfile.displayName}的儀表板
          </h1>
          <button onClick={signOutUser} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
            登出
          </button>
        </div>
      </header>
      
      <main className="w-full container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ... 快速新增區塊維持不變 ... */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">近期時間軸</h2>
            <button onClick={handleAddTestRecord} className="text-sm bg-gray-200 px-3 py-1 rounded-md">新增測試記錄</button>
          </div>
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            {isRecordsLoading ? (
              <p>正在載入記錄...</p>
            ) : firestoreError ? (
              <p className="text-red-500">{firestoreError}</p> // 顯示錯誤訊息
            ) : latestRecords.length > 0 ? (
              latestRecords.map((record) => (
                <div key={record.id} className="p-2 border-b">
                  <p>類型: {record.type}</p>
                  <p>備註: {record.notes}</p>
                  <p className="text-xs text-gray-500">
                    時間: {record.timestamp?.toDate().toLocaleString() || 'N/A'}
                  </p>
                </div>
              ))
            ) : (
              <p>目前沒有任何記錄。</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}