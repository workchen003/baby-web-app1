// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';

export default function DashboardPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [latestRecords, setLatestRecords] = useState<DocumentData[]>([]);
  const [isRecordsLoading, setRecordsLoading] = useState(true);

  // 從 userProfile 中取得 familyId，確保它是可選的
  const familyId = userProfile?.familyIDs?.[0]; // 假設每個用戶只屬於一個家庭

  // 新增一個判斷旗標，用於確認 userProfile 是否已載入並包含有效的 familyIDs
  // 這有助於在家庭資料完全準備好之前，避免發出 Firestore 查詢
  const isProfileReadyForQueries = userProfile && userProfile.familyIDs && userProfile.familyIDs.length > 0;

  // 在數據未完全準備好時顯示載入狀態或等待訊息
  if (authLoading || !isProfileReadyForQueries) {
    // 可選：如果用戶已登入但沒有家庭ID，則重定向到家庭創建/入職頁面
    // 這在 AuthContext 完成載入後觸發，確保用戶Profile已存在但無家庭ID
    if (!authLoading && userProfile && !userProfile.familyIDs?.length) {
      router.push('/onboarding/create-family'); // 重定向到家庭設定頁面
      return null; // 不渲染儀表板內容，等待重定向
    }
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        正在驗證使用者與家庭資料...
      </div>
    );
  }

  // 當程式碼執行到這裡時，userProfile 已載入且 familyId 確定存在。

  useEffect(() => {
    // 只有在 familyId 確實可用且 profile 準備好進行查詢時才嘗試查詢
    // 上方的條件判斷已經確保了這些前置條件，因此這裡的 familyId 必定存在
    const q = query(
      collection(db, "records"),
      where("familyId", "==", familyId),
      orderBy("timestamp", "desc"),
      limit(10)
    );
    
    setRecordsLoading(true); // 在啟動快照前，將載入狀態設為 true
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLatestRecords(records);
      setRecordsLoading(false);
    }, (error) => {
      console.error("Error fetching latest records:", error);
      setRecordsLoading(false);
      // 特定的權限錯誤處理
      if (error.code === 'permission-denied') {
          console.error("Firestore 權限被拒絕，無法查詢記錄。請檢查安全規則或數據一致性。");
          // 您可以選擇在這裡向用戶顯示友善的錯誤訊息，或重定向到其他頁面。
          // 例如：router.push('/permission-error');
      }
    });
    
    return () => {
      console.log("正在取消 records 快照監聽。");
      unsubscribe();
    };
  }, [familyId, isProfileReadyForQueries]); // 將 isProfileReadyForQueries 加入依賴項

  return (
    <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">儀表板總覽</h1>
        <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">近期活動時間軸</h2>
            <Link href="/timeline" className="text-sm font-medium text-blue-600 hover:underline">查看完整時間軸 &rarr;</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-4 space-y-3 min-h-[300px]">
            {isRecordsLoading ? <p className="text-center p-4">正在載入記錄...</p> : latestRecords.length > 0 ? (
            latestRecords.map((record) => (
                <div key={record.id} className="p-3 border-b last:border-b-0">
                <p className="font-semibold">類型: {getRecordTitle(record)}</p>
                {record.notes && <p className="text-gray-600">備註: {record.notes}</p>}
                <p className="text-xs text-gray-500">{record.timestamp?.toDate().toLocaleString()}</p>
                </div>
            ))
            ) : (
            <p className="text-center p-4">目前沒有近期活動記錄。</p>
            )}
        </div>
        </section>
        {/* 其他儀表板區塊 (例如寶寶資料) 也應遵循類似模式 */}
    </div>
  );
}

// 輔助函數，用於獲取記錄標題
function getRecordTitle(record: DocumentData) {
  switch (record.type) {
    case 'feeding': return '餵食';
    case 'diaper': return '換尿布';
    case 'sleep': return '睡眠';
    case 'medication': return '用藥';
    case 'growth': return '生長紀錄';
    case 'tummyTime': return 'Tummy Time';
    case 'vaccination': return '疫苗';
    case 'photoDiary': return '照片手札';
    case 'bmi': return 'BMI';
    case 'measurement':
      switch(record.measurementType) {
        case 'height': return '身高';
        case 'weight': return '體重';
        case 'headCircumference': return '頭圍';
        default: return '生長記錄';
      }
    default: return '紀錄';
  }
}