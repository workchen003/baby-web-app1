'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, DocumentData } from 'firebase/firestore';
import AddRecordModal from '@/components/AddRecordModal';

export default function SolidFoodTimelinePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const [records, setRecords] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DocumentData | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (userProfile && userProfile.familyIDs && userProfile.familyIDs.length > 0) {
      const currentFamilyId = userProfile.familyIDs[0];
      const q = query(
        collection(db, "records"), 
        where("familyId", "==", currentFamilyId),
        where("type", "==", "solid-food"), // 只查詢副食品紀錄
        orderBy("timestamp", "desc")
      );

      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          if (isMounted) {
            const fetchedRecords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecords(fetchedRecords);
            setError(null);
            setIsLoading(false);
          }
        },
        (err) => {
          if (isMounted) {
            console.error("Timeline snapshot error:", err);
            if (err.name !== 'AbortError' && err.code !== 'cancelled') {
              setError("無法載入副食品記錄。");
            }
            setIsLoading(false);
          }
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }
  }, [user, userProfile, loading, router]);

  const handleEditClick = (record: DocumentData) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const getReactionText = (reaction: string) => {
    switch(reaction) {
        case 'good': return '良好';
        case 'neutral': return '普通';
        case 'bad': return '不佳/過敏';
        default: return '未記錄';
    }
  }

  if (loading || !userProfile) {
    return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col w-full bg-gray-50">
        <header className="w-full bg-white shadow-sm flex-shrink-0">
          <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">副食品時間軸</h1>
            <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">&larr; 返回儀表板</Link>
          </div>
        </header>

        <main className="w-full container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md">
            {isLoading ? (
              <p className="p-6 text-center text-gray-500">正在載入紀錄...</p>
            ) : error ? (
              <p className="p-6 text-center text-red-500">{error}</p>
            ) : records.length > 0 ? (
              <ul>
                {records.map((record, index) => (
                  <li key={record.id} className={`p-4 border-b ${index === records.length - 1 ? 'border-b-0' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-semibold text-gray-800">{record.foodItems}</p>
                        <p className="text-sm text-gray-600 mt-1">反應: {getReactionText(record.reaction)}</p>
                        {record.notes && <p className="text-sm text-gray-500 mt-1">備註: {record.notes}</p>}
                        <p className="text-xs text-gray-400 mt-2">{record.timestamp?.toDate().toLocaleString('zh-TW') || 'N/A'}</p>
                      </div>
                      <button onClick={() => handleEditClick(record)} className="text-sm text-blue-600 hover:underline">編輯</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-gray-500">目前沒有任何副食品記錄。</p>
            )}
          </div>
        </main>
      </div>

      {isModalOpen && <AddRecordModal recordType="solid-food" onClose={handleCloseModal} existingRecord={editingRecord} />}
    </>
  );
}