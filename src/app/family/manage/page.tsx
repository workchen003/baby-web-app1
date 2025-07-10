'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
// ✅【關鍵修正】: 從正確的 @/lib/functions 匯入前端包裝函式
import { createFamilyInvitation } from '@/lib/functions';

// 定義家庭資料的介面
interface FamilyDetails {
    id: string;
    name: string;
    members: string[]; // 確保這個屬性存在且是 string[] 類型
    creatorId: string;
}

export default function FamilyManagePage() {
    const { userProfile } = useAuth();
    const [family, setFamily] = useState<FamilyDetails | null>(null);
    const [invitationCode, setInvitationCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchFamilyDetails = async () => {
            if (userProfile && userProfile.familyIDs && userProfile.familyIDs[0]) {
                const familyId = userProfile.familyIDs[0];
                try {
                    const familyDocRef = doc(db, 'families', familyId);
                    const familyDocSnap = await getDoc(familyDocRef);
                    if (familyDocSnap.exists()) {
                        setFamily({ id: familyDocSnap.id, ...familyDocSnap.data() } as FamilyDetails);
                    } else {
                        setError('找不到家庭資料。');
                    }
                } catch (err) {
                    console.error("Error fetching family details:", err);
                    setError('讀取家庭資料時發生錯誤。');
                } finally {
                    setIsLoading(false);
                }
            } else if (userProfile) {
                // 如果用戶登入但沒有家庭ID，也表示載入完成
                setIsLoading(false);
            }
        };

        fetchFamilyDetails();
    }, [userProfile]);

    const handleCreateInvitation = async () => {
        if (!family) return;
        try {
            // ✅【關鍵修正】: 正確呼叫 httpsCallable 回傳的函式
            const result = await createFamilyInvitation({ familyId: family.id });
            // result.data 才是您在後端回傳的物件
            if (result && result.data && result.data.code) { // 增加 result.data 的檢查
                setInvitationCode(result.data.code);
            } else {
                setError('建立邀請碼失敗，未收到有效的邀請碼。');
            }
        } catch (err) {
            console.error("Error creating invitation:", err);
            setError('建立邀請碼時發生錯誤。');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(invitationCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            setError('複製邀請碼失敗。');
        });
    };
    
    if (isLoading) {
        return <div className="p-8 text-center">正在載入家庭資料...</div>;
    }

    if (!userProfile || !userProfile.familyIDs || userProfile.familyIDs.length === 0) {
        return <div className="p-8 text-center">您目前沒有加入任何家庭，請創建或加入一個家庭。</div>;
    }

    if (!family) {
        // 這會在 isLoading 為 false 但 family 仍為 null 時顯示，例如找不到家庭資料的情況
        return <div className="p-8 text-center">{error || '找不到家庭資料。'}</div>;
    }


    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">家庭管理</h1>
            
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800">家庭名稱：{family.name}</h2>
                
                <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-700">家庭成員</h3>
                    {/* ✅【關鍵修正】: 添加防禦性檢查以避免 TypeError */}
                    {family.members && family.members.length > 0 ? (
                        <ul className="mt-2 list-disc list-inside bg-gray-50 p-4 rounded-md">
                            {family.members.map((member, index) => (
                                <li key={index} className="text-gray-600">{member}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 text-gray-600">目前沒有家庭成員資料。</p>
                    )}
                </div>

                <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-700">邀請新成員</h3>
                    {invitationCode ? (
                        <div className="mt-2 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                            <div>
                               <p className="text-sm text-blue-700">將此邀請碼分享給您的家人：</p>
                               <p className="text-2xl font-mono font-bold text-blue-900 tracking-widest">{invitationCode}</p>
                            </div>
                            <button 
                                onClick={copyToClipboard}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {copied ? '已複製！' : '複製'}
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleCreateInvitation}
                            className="mt-2 w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            產生一組新的邀請碼
                        </button>
                    )}
                     {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>
            </div>
        </div>
    );
}