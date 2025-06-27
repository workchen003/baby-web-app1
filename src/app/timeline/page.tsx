'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, DocumentData } from 'firebase/firestore';
import AddRecordModal from '@/components/AddRecordModal';
import FloatingActionButton from '@/components/FloatingActionButton';

// --- 核心修正：定義一個「可手動建立」的紀錄類型，並排除 'bmi' ---
type CreatableRecordType = 'feeding' | 'diaper' | 'sleep' | 'solid-food' | 'measurement';


// --- 核心修正：元件名稱改為 TimelinePage ---
export default function TimelinePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  // --- 核心修正：變數名稱更符合語意 ---
  const [allRecords, setAllRecords] = useState<DocumentData[]>([]);
  const [isRecordsLoading, setRecordsLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRecordType, setModalRecordType] = useState<CreatableRecordType>('feeding');

  // 編輯模式用的 State
  const [editingRecord, setEditingRecord] = useState<DocumentData | null>(null);

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
      // --- 核心修正：移除 limit(5)，以讀取所有紀錄 ---
      const q = query(collection(db, "records"), where("familyId", "==", currentFamilyId), orderBy("timestamp", "desc"));
      
      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllRecords(records);
          setFirestoreError(null);
          setRecordsLoading(false);
        },
        (error) => {
          console.error("Timeline snapshot error:", error);
          if (error.code !== 'cancelled') {
            setFirestoreError("無法載入記錄。");
          }
          setRecordsLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [user, userProfile, loading, router]);

  const handleOpenModal = (type: CreatableRecordType, record: DocumentData | null = null) => {
    setModalRecordType(type);
    setEditingRecord(record);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  }

  if (loading || !userProfile || !userProfile.familyIDs || userProfile.familyIDs.length === 0) {
    return <div className="flex min-h-screen items-center justify-center">載入中或正在重新導向...</div>;
  }

  const getRecordTitle = (record: DocumentData) => {
    switch(record.type) {
      case 'feeding': return '餵奶';
      case 'diaper': return '換尿布';
      case 'sleep': return '睡眠';
      case 'solid-food': return '副食品';
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

  const getUnit = (record: DocumentData) => {
    if (record.type === 'measurement') {
        return record.measurementType === 'weight' ? 'kg' : 'cm';
    }
    if (record.type === 'feeding') {
        return 'ml';
    }
    return '';
  }

  return (
    <>
      <div className="flex min-h-screen flex-col w-full bg-gray-50">
        <header className="w-full bg-white shadow-sm flex-shrink-0">
          <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* --- 核心修正：標題更新 --- */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">完整時間軸</h1>
            <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">&larr; 返回儀表板</Link>
          </div>
        </header>
        
        <main className="w-full container mx-auto flex-grow py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            {isRecordsLoading ? <p>正在載入記錄...</p> : firestoreError ? <p className="text-red-500">{firestoreError}</p> : allRecords.length > 0 ? (
              allRecords.map((record) => (
                <div key={record.id} className="p-4 border-b last:border-b-0 flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{getRecordTitle(record)}</p>
                    {record.type === 'solid-food' && record.foodItems && (<p className="text-gray-600">內容: {record.foodItems}</p>)}
                    {record.type === 'feeding' && record.amount && (<p className="text-gray-600">奶量: {record.amount} ml</p>)}
                    {(record.type === 'measurement' || record.type === 'bmi') && record.value && (<p className="text-gray-600">數值: {record.value} {getUnit(record)}</p>)}
                    {record.notes && <p className="text-gray-600 mt-1">備註: {record.notes}</p>}
                    <p className="text-xs text-gray-500 mt-2">記錄者: {record.creatorName || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">時間: {record.timestamp?.toDate().toLocaleString('zh-TW') || 'N/A'}</p>
                  </div>
                  <div>
                    <button 
                      onClick={() => handleOpenModal(record.type, record)}
                      className="text-sm text-blue-600 hover:underline"
                      // BMI 是自動計算的，不應該能被編輯
                      disabled={record.type === 'bmi'}
                    >
                      編輯
                    </button>
                  </div>
                </div>
              ))
            ) : <p className="text-center text-gray-500 py-8">目前沒有任何記錄。</p>}
          </div>
        </main>
      </div>

      <FloatingActionButton onAddRecord={(type) => handleOpenModal(type)} />

      {isModalOpen && <AddRecordModal recordType={modalRecordType} onClose={handleCloseModal} existingRecord={editingRecord} />}
    </>
  );
}