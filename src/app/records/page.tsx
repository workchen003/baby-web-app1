// src/app/records/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { addRecord, CreatableRecordType } from '@/lib/records';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { Milk, Syringe, Baby, Soup, Ruler, Sun, Moon, Droplets, Utensils, Replace } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const QuickAddCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => ( <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"><div className="flex items-center gap-3 mb-3">{icon}<h4 className="font-semibold text-gray-700">{title}</h4></div>{children}</div> );
const TodayDashboard = ({ stats }: { stats: any }) => ( <div className="bg-white p-6 rounded-lg shadow-sm"><h3 className="text-lg font-semibold mb-4">今日儀表板</h3><div className="space-y-4"><div><div className="flex justify-between text-sm mb-1"><span>熱量總覽 (估算)</span><span>{stats.calories.current} / {stats.calories.target} kcal</span></div><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${stats.calories.percentage}%` }}></div></div></div><div className="grid grid-cols-3 gap-4 text-center"><div><p className="text-sm text-gray-500">總擠乳量</p><p className="text-xl font-bold">{stats.pumped || 0} ml</p></div><div><p className="text-sm text-gray-500">總餵奶量</p><p className="text-xl font-bold">{stats.fed || 0} ml</p></div><div><p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.balance >= 0 ? '+' : ''}{stats.balance} ml</p></div></div></div></div> );
const TodayStatsChart = ({ data }: { data: any[] }) => ( <div className="bg-white p-6 rounded-lg shadow-sm h-full"><h3 className="text-lg font-semibold mb-4">今日統計</h3><ResponsiveContainer width="100%" height={200}><BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} /><Tooltip cursor={{ fill: 'transparent' }} /><Bar dataKey="value" barSize={20} radius={[0, 10, 10, 0]}>{data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar></BarChart></ResponsiveContainer></div>);

export default function CareRecordsPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    
    const [records, setRecords] = useState<DocumentData[]>([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedingAmount, setFeedingAmount] = useState('');
    const [pumpAmount, setPumpAmount] = useState('');
    const [solidFoodName, setSolidFoodName] = useState('');
    const [solidFoodAmount, setSolidFoodAmount] = useState('');
    const [weightValue, setWeightValue] = useState('');
    
    const familyId = userProfile?.familyIDs?.[0];
    if (authLoading || !familyId) {
        return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">正在驗證使用者與家庭資料...</div>;
    }
    
    const getTodayStartEnd = useCallback(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
    }, []);

    useEffect(() => {
        const { start, end } = getTodayStartEnd();
        const q = query(
            collection(db, "records"),
            where("familyId", "==", familyId),
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
    }, [familyId, getTodayStartEnd]);

    const dailyStats = useMemo(() => {
        const stats = { fed: 0, pumped: 0, diapers: 0, solidFoods: 0 };
        records.forEach(r => {
            if (r.type === 'feeding') stats.fed += r.amount || 0;
            if (r.type === 'pumping') stats.pumped += r.amount || 0;
            if (r.type === 'diaper') stats.diapers += 1;
            if (r.type === 'solid-food') stats.solidFoods +=1;
        });
        return stats;
    }, [records]);

    const dashboardStats = useMemo(() => {
        const calories = Math.round(dailyStats.fed * 0.67);
        return {
            calories: { current: calories, target: 750, percentage: (calories / 750) * 100 },
            fed: dailyStats.fed,
            pumped: dailyStats.pumped,
            balance: dailyStats.pumped - dailyStats.fed,
        };
    }, [dailyStats]);

    const chartData = useMemo(() => [
        { name: '餵奶', value: dailyStats.fed, color: '#3b82f6' },
        { name: '擠奶', value: dailyStats.pumped, color: '#8b5cf6' },
        { name: '尿布', value: dailyStats.diapers, color: '#10b981' },
        { name: '副食品', value: dailyStats.solidFoods, color: '#f97316' },
    ], [dailyStats]);

    const handleQuickAdd = async (type: CreatableRecordType, data: any) => {
        if (!userProfile || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await addRecord({
                type,
                familyId: familyId,
                babyId: 'baby_01',
                creatorId: userProfile.uid,
                timestamp: Timestamp.now(),
                ...data,
            }, userProfile);
            
            if (type === 'feeding') setFeedingAmount('');
            if (type === 'pumping') setPumpAmount('');
            if (type === 'solid-food') { setSolidFoodName(''); setSolidFoodAmount(''); }
            if (type === 'measurement') setWeightValue('');

        } catch (error) {
            console.error(`Error adding ${type} record:`, error);
            alert('新增失敗，請稍後再試。');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="p-4 md:p-8 space-y-8">
            <h1 className="text-3xl font-bold">照護紀錄</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <QuickAddCard icon={<Milk className="h-6 w-6 text-blue-500"/>} title="餵奶紀錄">
                        <div className="flex items-center gap-2">
                            <input type="number" placeholder="奶量(ml)" value={feedingAmount} onChange={e => setFeedingAmount(e.target.value)} className="w-full border-gray-200 rounded-md shadow-sm"/>
                            <button onClick={() => handleQuickAdd('feeding', { amount: Number(feedingAmount) })} disabled={!feedingAmount || isSubmitting} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm disabled:bg-gray-400">新增</button>
                        </div>
                    </QuickAddCard>
                    <QuickAddCard icon={<Replace className="h-6 w-6 text-indigo-500"/>} title="擠乳紀錄">
                         <div className="flex items-center gap-2">
                            <input type="number" placeholder="奶量(ml)" value={pumpAmount} onChange={e => setPumpAmount(e.target.value)} className="w-full border-gray-200 rounded-md shadow-sm"/>
                            <button onClick={() => handleQuickAdd('pumping', { amount: Number(pumpAmount) })} disabled={!pumpAmount || isSubmitting} className="px-4 py-2 bg-indigo-500 text-white rounded-md text-sm disabled:bg-gray-400">新增</button>
                        </div>
                    </QuickAddCard>
                    <QuickAddCard icon={<Baby className="h-6 w-6 text-green-500"/>} title="尿布紀錄">
                         <div className="flex justify-around">
                            <button onClick={() => handleQuickAdd('diaper', { diaperType: ['wet'] })} disabled={isSubmitting} className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm">濕</button>
                            <button onClick={() => handleQuickAdd('diaper', { diaperType: ['dirty'] })} disabled={isSubmitting} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm">便</button>
                            <button onClick={() => handleQuickAdd('diaper', { diaperType: ['wet', 'dirty'] })} disabled={isSubmitting} className="px-4 py-2 bg-orange-100 text-orange-800 rounded-md text-sm">濕+便</button>
                         </div>
                    </QuickAddCard>
                    <QuickAddCard icon={<Soup className="h-6 w-6 text-orange-500"/>} title="副食品紀錄">
                         <div className="flex items-center gap-2">
                            <input type="text" placeholder="食物名稱" value={solidFoodName} onChange={e => setSolidFoodName(e.target.value)} className="w-full border-gray-200 rounded-md shadow-sm"/>
                             <input type="number" placeholder="份量(g)" value={solidFoodAmount} onChange={e => setSolidFoodAmount(e.target.value)} className="w-1/2 border-gray-200 rounded-md shadow-sm"/>
                            <button onClick={() => handleQuickAdd('solid-food', { foodItems: solidFoodName, amount: Number(solidFoodAmount) })} disabled={!solidFoodName || isSubmitting} className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm disabled:bg-gray-400">新增</button>
                        </div>
                    </QuickAddCard>
                     <QuickAddCard icon={<Ruler className="h-6 w-6 text-purple-500"/>} title="體重紀錄">
                        <div className="flex items-center gap-2">
                            <input type="number" step="0.1" placeholder="體重 (kg)" value={weightValue} onChange={e => setWeightValue(e.target.value)} className="w-full border-gray-200 rounded-md shadow-sm"/>
                            <button onClick={() => handleQuickAdd('measurement', { measurementType: 'weight', value: Number(weightValue) })} disabled={!weightValue || isSubmitting} className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm disabled:bg-gray-400">新增</button>
                        </div>
                    </QuickAddCard>
                </div>
                <div className="space-y-4">
                    <TodayDashboard stats={dashboardStats} />
                    <TodayStatsChart data={chartData} />
                </div>
            </div>
        </div>
    );
}