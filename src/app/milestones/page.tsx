// src/app/milestones/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import { getAchievedMilestones, AchievedMilestone } from '@/lib/milestones';
import MilestoneChart from '@/components/MilestoneChart';
import RadarChart from '@/components/RadarChart';
import milestonesData from '@/data/milestones_processed.json'; 

const daysToMonths = (days: number) => days / 30.4375;

interface Milestone { skill: string; start_days: number; end_days: number; }
interface Category { name: string; milestones: Milestone[]; }
interface MilestoneData { categories: Category[]; }
const typedMilestonesData: MilestoneData = milestonesData;

export default function MilestonesPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [achievedMilestones, setAchievedMilestones] = useState<Map<string, AchievedMilestone>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [displayMonth, setDisplayMonth] = useState(0);
  
  const babyId = 'baby_01'; 

  const familyId = userProfile?.familyIDs?.[0];
  if (authLoading || !familyId) {
    return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
  }
  
  useEffect(() => {
    Promise.all([
      getBabyProfile(babyId),
      getAchievedMilestones(familyId, babyId),
    ]).then(([profile, achievements]) => {
      if (profile) {
        setBabyProfile(profile);
        setAchievedMilestones(achievements);
        const ageInDays = (new Date().getTime() - new Date(profile.birthDate).getTime()) / (1000 * 60 * 60 * 24);
        setDisplayMonth(Math.round(daysToMonths(ageInDays)));
      } else {
        router.push('/baby/edit');
      }
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [familyId, router]);
  
  const filteredMilestoneData = useMemo(() => {
    const windowStart = displayMonth - 1;
    const windowEnd = displayMonth + 2; 
    
    const filteredCategories = new Map<string, any[]>();

    typedMilestonesData.categories.forEach(category => {
      const filteredMilestones = category.milestones.filter(milestone => {
        const start = daysToMonths(milestone.start_days);
        const end = daysToMonths(milestone.end_days === -1 ? milestone.start_days + 730 : milestone.end_days);
        return Math.max(start, windowStart) < Math.min(end, windowEnd);
      });

      if (filteredMilestones.length > 0) {
        filteredCategories.set(category.name, filteredMilestones);
      }
    });
    return filteredCategories;
  }, [displayMonth]);

  const handlePrevMonth = () => {
    setDisplayMonth(prev => Math.max(0, prev - 1));
  };
  
  const handleNextMonth = () => {
    setDisplayMonth(prev => prev + 1);
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
  }
  
  if (!babyProfile) {
     return <div className="flex min-h-screen items-center justify-center">找不到寶寶資料，請先建立。</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">兒童發展里程碑</h1>
        <div>
          <Link href="/dashboard" className="text-blue-600 hover:underline mr-4">&larr; 返回儀表板</Link>
          <Link href="/milestones/record" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
            記錄/更新里程碑
          </Link>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 p-4 bg-white rounded-lg shadow-md">
        <div className="md:col-span-1 flex items-center justify-center">
            <RadarChart achievedMilestones={achievedMilestones} />
        </div>
        <div className="md:col-span-2 flex flex-col justify-center">
            <h2 className="text-lg font-semibold mb-2">能力短陣 (雷達圖)</h2>
            <p className="text-sm text-gray-600 mb-4">
                呈現寶寶在四大發展面向的完成度。外圈灰色代表該面向的總項目數，內圈彩色代表已完成的項目數，幫助您快速了解寶寶的均衡發展狀況。
            </p>
            <ul className="space-y-1 text-xs text-gray-500 list-disc list-inside">
                <li><strong>粗大動作:</strong> 身體大肌肉的運動能力，如抬頭、翻身、坐、爬、走。</li>
                <li><strong>精細動作:</strong> 手眼協調與小肌肉控制，如抓握、捏取物品。</li>
                <li><strong>語言及溝通:</strong> 理解與表達，從發出聲音到說出詞彙。</li>
                <li><strong>社會與認知:</strong> 與人互動、認知學習及解決問題的能力。</li>
            </ul>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                &larr; 上一月
            </button>
            <div className="text-center">
                <h2 className="text-xl font-bold">發展時程細節</h2>
                <p className="text-sm text-gray-500">目前顯示：{displayMonth} 個月齡左右</p>
            </div>
            <button onClick={handleNextMonth} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                下一月 &rarr;
            </button>
        </div>
        <p className="text-sm text-center text-gray-600 mb-4">圖表中<span className="font-bold text-blue-500">藍色塊</span>代表建議完成時間，<span className="font-bold text-red-500">紅色虛線</span>是寶寶目前月齡，<span className="font-bold text-green-500">綠色標記</span>是您記錄的完成日期。</p>
        <MilestoneChart
          displayData={filteredMilestoneData}
          achievedMilestones={achievedMilestones}
          birthDate={babyProfile.birthDate}
          viewWindow={{start: displayMonth - 1, end: displayMonth + 2}}
        />
      </div>
    </div>
  );
}