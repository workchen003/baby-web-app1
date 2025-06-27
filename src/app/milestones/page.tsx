'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import { getAchievedMilestones, AchievedMilestone } from '@/lib/milestones';
import MilestoneChart from '@/components/MilestoneChart';

export default function MilestonesPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [achievedMilestones, setAchievedMilestones] = useState<Map<string, AchievedMilestone>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const babyId = 'baby_01'; 

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (userProfile && userProfile.familyIDs) {
      const familyId = userProfile.familyIDs[0];
      
      Promise.all([
        getBabyProfile(babyId),
        getAchievedMilestones(familyId, babyId),
      ]).then(([profile, achievements]) => {
        if (profile) {
          setBabyProfile(profile);
          setAchievedMilestones(achievements);
        } else {
          router.push('/baby/edit');
        }
      }).catch(console.error).finally(() => setIsLoading(false));
    }
  }, [user, userProfile, authLoading, router]);

  if (authLoading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center">載入中...</div>;
  }
  
  if (!babyProfile) {
     return <div className="flex min-h-screen items-center justify-center">找不到寶寶資料，請先建立。</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{babyProfile.name}的發展里程碑</h1>
        <div>
          <Link href="/dashboard" className="text-blue-600 hover:underline mr-4">&larr; 返回儀表板</Link>
          <Link href="/milestones/record" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
            記錄/更新里程碑
          </Link>
        </div>
      </header>
      
      <div className="p-4 bg-white rounded-lg shadow-md">
        {/* --- 核心修正：取消註解 MilestoneChart 並傳入 props --- */}
        <MilestoneChart
          achievedMilestones={achievedMilestones}
          birthDate={babyProfile.birthDate}
        />
      </div>
    </div>
  );
}