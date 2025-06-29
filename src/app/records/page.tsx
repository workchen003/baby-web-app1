// src/app/records/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CreatableRecordType } from '@/lib/records';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, DocumentData, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { Milk, Syringe, Baby, Soup, Ruler, Sun, Moon, Droplets, Utensils, Replace } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- 子元件區 ---

// 快速新增卡片
const QuickAddCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
            {icon}
            <h4 className="font-semibold text-gray-700">{title}</h4>
        </div>
        {children}
    </div>
);

// 今日儀表板
const TodayDashboard = ({ stats }: { stats: any }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">今日儀表板</h3>
        <div className="space-y-4">
            <div>
                <div className="flex justify-between text-sm mb-1">
                    <span>熱量總覽 (估算)</span>
                    <span>{stats.calories.current} / {stats.calories.target} kcal</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${stats.calories.percentage}%` }}></div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-sm text-gray-500">總擠乳量</p><p className="text-xl font-bold">{stats.pumped || 0} ml</p></div>
                <div><p className="text-sm text-gray-500">總餵奶量</p><p className="text-xl font-bold">{stats.fed || 0} ml</p></div>
                <div><p className="text-sm text-gray-500">母乳收支平衡</p><p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.balance >= 0 ? '+' : ''}{stats.balance} ml</p></div>
            </div>
        </div>
    </div>
);

// 今日統計圖表
const TodayStatsChart = ({ data }: { data: any[] }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm h-full">
        <h3 className="text-lg font-semibold mb-4">今日統計</h3>
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" barSize={20} radius={[0, 10, 10, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);


// --- 主頁面元件 ---
export default function CareRecordsPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [records, setRecords] = useState<DocumentData[]>([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(true);

    // --- 新狀態: 快速新增的輸入值 ---
    const [feedingAmount, setFeedingAmount] = useState('');
    const [pumpAmount, setPumpAmount] = useState('');
    const [solidFoodName, setSolidFoodName] = useState('');
    const [solidFoodAmount, setSolidFoodAmount] = useState('');
    
    const getTodayStartEnd = useCallback((date: Date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return {
            start: Timestamp.fromDate(start),
            end: Timestamp.fromDate(end)
        };
    }, []);

    // 獲取當日紀錄
    useEffect(() => {
        if (!userProfile?.familyIDs?.[0]) return;

        const { start, end } = getTodayStartEnd(selectedDate);
        const q = query(
            collection(db, "records"),
            where("familyId", "==", userProfile.familyIDs[0]),
            where("timestamp", ">=", start),
            where("timestamp", "<=", end),
            orderBy("timestamp", "desc")
        );
        setIsLoadingRecords(true);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoadingRecords(false);
        });
        return () => unsubscribe();
    }, [userProfile, selectedDate, getTodayStartEnd]);

    // 儀表板與統計圖表的資料計算
    const { dashboardStats, chartData } = useMemo(() => {
        const stats = {
            fed: 0,
            pumped: 0,
            diapers: 0,
            solidFoods: 0,
        };
        records.forEach(r => {
            if (r.type === 'feeding') stats.fed += r.amount || 0;
            if (r.type === 'pumping') stats.pumped += r.amount || 0; // 假設 type='pumping'
            if (r.type === 'diaper') stats.diapers += 1;
            if (r.type === 'solid-food') stats.solidFoods +=1;
        });

        const dashboard = {
            calories: { current: 71, target: 750, percentage: (71/750)*100 },
            fed: stats.fed,
            pumped: stats.pumped,
            balance: stats.pumped - stats.fed,
        };
        const chart = [
            { name: '餵奶', value: stats.fed, color: '#3b82f6' },
            { name: '擠奶', value: stats.pumped, color: '#8b5cf6' },
            { name: '尿布', value: stats.diapers, color: '#10b981' },
            { name: '副食品', value: stats.solidFoods, color: '#f97316' },
        ];
        return { dashboardStats: dashboard, chartData: chart };
    }, [records]);


    if (loading || !userProfile) {
        return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
    }
    
    return (
        <div className="p-4 md:p-8 space-y-8">
            <h1 className="text-3xl font-bold">照護紀錄</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左側輸入區 */}
                <div className="space-y-4">
                    <QuickAddCard icon={<Milk className="h-6 w-6 text-blue-500"/>} title="餵奶紀錄">
                        <div className="flex items-center gap-2">
                            <input type="number" placeholder="奶量(ml)" value={feedingAmount} onChange={e => setFeedingAmount(e.target.value)} className="w-full border-gray-200 rounded-md shadow-sm"/>
                            <button className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm">新增</button>
                        </div>
                    </QuickAddCard>
                    <QuickAddCard icon={<Replace className="h-6 w-6 text-indigo-500"/>} title="擠乳紀錄">
                         <div className="flex items-center gap-2">
                            <input type="number" placeholder="奶量(ml)" value={pumpAmount} onChange={e => setPumpAmount(e.target.value)} className="w-full border-gray-200 rounded-md shadow-sm"/>
                            <button className="px-4 py-2 bg-indigo-500 text-white rounded-md text-sm">新增</button>
                        </div>
                    </QuickAddCard>
                    <QuickAddCard icon={<Baby className="h-6 w-6 text-green-500"/>} title="尿布紀錄">
                         <div className="flex justify-around">
                            <button className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm">濕</button>
                            <button className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm">便</button>
                            <button className="px-4 py-2 bg-orange-100 text-orange-800 rounded-md text-sm">濕+便</button>
                         </div>
                    </QuickAddCard>
                    <QuickAddCard icon={<Soup className="h-6 w-6 text-orange-500"/>} title="副食品紀錄">
                         <div className="flex items-center gap-2">
                            <input type="text" placeholder="食物名稱" value={solidFoodName} onChange={e => setSolidFoodName(e.target.value)} className="w-full border-gray-200 rounded-md shadow-sm"/>
                             <input type="number" placeholder="份量(g)" value={solidFoodAmount} onChange={e => setSolidFoodAmount(e.target.value)} className="w-1/2 border-gray-200 rounded-md shadow-sm"/>
                            <button className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm">新增</button>
                        </div>
                    </QuickAddCard>
                </div>
                {/* 右側儀表板與統計 */}
                <div className="space-y-4">
                    <TodayDashboard stats={dashboardStats} />
                    <TodayStatsChart data={chartData} />
                </div>
            </div>
        </div>
    );
}
