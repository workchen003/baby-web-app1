// src/app/timeline/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, DocumentData, Timestamp, deleteDoc, doc, QueryConstraint } from 'firebase/firestore';
import { Milk, Baby, Soup, Ruler, Sun, Moon, Droplets, Syringe } from 'lucide-react';

type FilterType = 'all' | 'feeding' | 'diaper' | 'solid-food' | 'measurement' | 'other';

const recordIcons: { [key: string]: React.ReactNode } = {
    feeding: <Milk className="h-5 w-5 text-blue-500" />,
    diaper: <Baby className="h-5 w-5 text-green-500" />,
    'solid-food': <Soup className="h-5 w-5 text-orange-500" />,
    measurement: <Ruler className="h-5 w-5 text-purple-500" />,
    sleep: <Moon className="h-5 w-5 text-indigo-500" />,
    vitamin: <Sun className="h-5 w-5 text-yellow-500" />, 
    medicine: <Syringe className="h-5 w-5 text-red-500" />, 
    default: <Droplets className="h-5 w-5 text-gray-500" />,
};

const filterButtons: { type: FilterType, label: string, icon: React.ReactNode }[] = [
    { type: 'all', label: '全部', icon: <span className="text-xs">All</span> },
    { type: 'feeding', label: '餵奶', icon: recordIcons.feeding },
    { type: 'diaper', label: '尿布', icon: recordIcons.diaper },
    { type: 'solid-food', label: '副食品', icon: recordIcons['solid-food'] },
    { type: 'measurement', label: '生長', icon: recordIcons.measurement },
    { type: 'other', label: '其他', icon: <span className="text-xs">...</span> },
];

export default function TimelinePage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [allRecords, setAllRecords] = useState<DocumentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    const familyId = userProfile?.familyIDs?.[0];
    if (authLoading || !familyId) {
        return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">正在驗證使用者與家庭資料...</div>;
    }

    useEffect(() => {
        // 【核心修改】查詢邏輯大幅簡化！
        const constraints: QueryConstraint[] = [
            where("familyId", "==", familyId),
            orderBy("timestamp", "desc")
        ];

        // 根據 filter 動態增加查詢條件
        if (filter !== 'all') {
            if (filter === 'other') {
                // 查詢不屬於主要分類的其他類型
                constraints.push(where("type", "not-in", ['feeding', 'diaper', 'solid-food', 'measurement']));
            } else {
                // 查詢特定類型
                constraints.push(where("type", "==", filter));
            }
        }
        
        // 組合出最終的查詢
        const q = query(collection(db, "records"), ...constraints);
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAllRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (error) => {
            console.error("Timeline snapshot error:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [familyId, filter]);

    const handleDelete = async (recordId: string) => {
        if (window.confirm('您確定要刪除這筆紀錄嗎？')) {
            await deleteDoc(doc(db, 'records', recordId));
        }
    };

    const getRecordDescription = (record: DocumentData): string => {
        switch (record.type) {
            case 'feeding': return `${record.amount || '--'} ml`;
            case 'diaper': 
                return (record.diaperType || []).join(' + ');
            case 'solid-food':
                return `${record.foodItems || ''} ${record.amount || ''}g`;
            case 'measurement':
                return `${record.measurementType}: ${record.value}`;
            default:
                return record.notes || '無備註';
        }
    }

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-4">完整時間軸</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">詳細紀錄</h3>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                        {filterButtons.map(btn => (
                            <button key={btn.type} onClick={() => setFilter(btn.type)} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filter === btn.type ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`} title={btn.label}>
                                {btn.icon}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {isLoading ? <p>載入中...</p> : allRecords.length > 0 ? (
                        allRecords.map(record => (
                            <div key={record.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-50">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    {recordIcons[record.type] || recordIcons.default}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm">
                                        <span className="font-semibold">{(record.timestamp as Timestamp).toDate().toLocaleTimeString('zh-TW', { hour: '2-digit', minute:'2-digit' })}</span>
                                        <span className="ml-2">{getRecordDescription(record)}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">({record.creatorName || '未知'})</p>
                                </div>
                                <button onClick={() => handleDelete(record.id)} className="text-red-400 hover:text-red-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))
                    ) : <p className="text-center py-8 text-gray-500">找不到符合條件的紀錄。</p>}
                </div>
            </div>
        </div>
    );
}