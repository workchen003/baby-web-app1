// src/app/family/manage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getFamilyDetails, FamilyMember } from '@/lib/family';
import { generateInviteCode } from '@/lib/functions';
import Link from 'next/link';
import Image from 'next/image';

export default function ManageFamilyPage() {
    const { userProfile, loading } = useAuth();
    const router = useRouter();

    const [familyDetails, setFamilyDetails] = useState<{ members: FamilyMember[], familyName: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);

    const familyId = userProfile?.familyIDs?.[0];

    useEffect(() => {
        if (loading) return;
        if (!userProfile) {
            router.push('/'); // 未登入則導回首頁
            return;
        }
        if (familyId) {
            getFamilyDetails(familyId)
                .then(details => {
                    if (details) {
                        setFamilyDetails({
                            members: details.members,
                            familyName: details.familyName
                        });
                    }
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [userProfile, familyId, loading, router]);
    
    const handleGenerateCode = async () => {
        if (!familyId) return;
        setIsGeneratingCode(true);
        setInviteCode(null);
        try {
            const code = await generateInviteCode(familyId);
            setInviteCode(code);
        } catch (error) {
            console.error("Failed to generate invite code:", error);
            alert("產生邀請碼失敗，請稍後再試。");
        } finally {
            setIsGeneratingCode(false);
        }
    };

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center">正在載入家庭資料...</div>;
    }
    
    if (!familyId || !familyDetails) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <h1 className="text-2xl font-bold mb-4">您尚未加入任何家庭</h1>
                <p className="text-gray-600 mb-8">您可以建立一個新的家庭，或請家人分享邀請碼給您。</p>
                <div className="flex gap-4">
                    <Link href="/onboarding/create-family" className="px-5 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        建立我的家庭
                    </Link>
                    <Link href="/join" className="px-5 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                        使用邀請碼加入
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-2">{familyDetails.familyName}</h1>
            <p className="text-gray-500 mb-8">家庭管理中心</p>

            <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
                <h2 className="text-xl font-semibold mb-4">家庭成員 ({familyDetails.members.length})</h2>
                <div className="space-y-4">
                    {familyDetails.members.map(member => (
                        <div key={member.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-3">
                                <Image 
                                    src={member.photoURL || '/default-avatar.png'} // 應準備一張預設頭像
                                    alt={member.displayName || '成員'} 
                                    width={40} 
                                    height={40} 
                                    className="rounded-full"
                                />
                                <div>
                                    <p className="font-semibold text-gray-800">{member.displayName}</p>
                                    <p className="text-sm text-gray-500">{member.role}</p>
                                </div>
                            </div>
                            {/* 未來可在此處新增「移除成員」或「變更角色」的按鈕 */}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-4">邀請新成員</h2>
                <p className="text-sm text-gray-600 mb-4">點擊按鈕以產生一組24小時內有效的邀請碼，將此碼分享給您想邀請的家人或保母即可。</p>
                <button 
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode}
                    className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400"
                >
                    {isGeneratingCode ? '正在產生...' : '產生新的邀請碼'}
                </button>
                {inviteCode && (
                    <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg">
                        <p className="font-bold">您的邀請碼是：</p>
                        <p className="text-2xl tracking-widest my-2">{inviteCode}</p>
                        <p className="text-xs">請複製此碼並分享給您的家人，此碼將於 24 小時後失效。</p>
                    </div>
                )}
            </div>

             <div className="mt-8 text-center">
                <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
                    &larr; 返回儀表板
                </Link>
            </div>
        </div>
    );
}