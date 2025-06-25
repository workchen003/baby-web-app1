'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOutUser } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData } from 'firebase/firestore';
import AddRecordModal from '@/components/AddRecordModal';
import FloatingActionButton from '@/components/FloatingActionButton';
import { RecordData } from '@/lib/records';

type RecordType = RecordData['type'];

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const [latestRecords, setLatestRecords] = useState<DocumentData[]>([]);
  const [isRecordsLoading, setRecordsLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRecordType, setModalRecordType] = useState<RecordType>('feeding');

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
      const q = query(collection(db, "records"), where("familyId", "==", currentFamilyId), orderBy("timestamp", "desc"), limit(5));
      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLatestRecords(records);
          setFirestoreError(null);
          setRecordsLoading(false);
        },
        (error) => {
          console.error("Dashboard snapshot error:", error);
          if (error.code !== 'cancelled') {
            setFirestoreError("無法載入記錄。");
          }
          setRecordsLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [user, userProfile, loading, router]);

  const handleOpenModal = (type: RecordType) => {
    setModalRecordType(type);
    setIsModalOpen(true);
  };
  
  if (loading || !userProfile || !userProfile.familyIDs || userProfile.familyIDs.length === 0) {
    return <div className="flex min-h-screen items-center justify-center">載入中或正在重新導向...</div>;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col w-full bg-gray-50">
        <header className="w-full bg-white shadow-sm flex-shrink-0">
          <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{userProfile.displayName}的儀表板</h1>
            <button onClick={signOutUser} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">登出</button>
          </div>
        </header>
        
        <main className="w-full container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">快速新增</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => handleOpenModal('feeding')} className="p-4 bg-white rounded-lg shadow text-center hover:bg-gray-100 transition">餵奶</button>
              <button onClick={() => handleOpenModal('diaper')} className="p-4 bg-white rounded-lg shadow text-center hover:bg-gray-100 transition">換尿布</button>
              <button onClick={() => handleOpenModal('sleep')} className="p-4 bg-white rounded-lg shadow text-center hover:bg-gray-100 transition">睡眠</button>
              <button className="p-4 bg-gray-200 rounded-lg shadow text-center text-gray-500 cursor-not-allowed" disabled>其他</button>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">近期時間軸</h2>
              <Link href="/timeline" className="text-sm font-medium text-blue-600 hover:underline">查看全部 &rarr;</Link>
            </div>
            <div className="bg-white rounded-lg shadow p-4 space-y-3 min-h-[120px]">
              {isRecordsLoading ? <p>正在載入記錄...</p> : firestoreError ? <p className="text-red-500">{firestoreError}</p> : latestRecords.length > 0 ? (
                latestRecords.map((record) => (
                  <div key={record.id} className="p-3 border-b last:border-b-0">
                    <p className="font-semibold">類型: {record.type}</p>
                    {record.notes && <p className="text-gray-600">備註: {record.notes}</p>}
                    <p className="text-xs text-gray-500 mt-1">時間: {record.timestamp?.toDate().toLocaleString('zh-TW') || 'N/A'}</p>
                  </div>
                ))
              ) : <p className="text-center text-gray-500 py-4">目前沒有任何記錄。</p>}
            </div>
          </section>
        </main>
      </div>

      <FloatingActionButton onAddRecord={handleOpenModal} />

      {isModalOpen && <AddRecordModal recordType={modalRecordType} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
