// [修正] src/app/photowall/page.tsx

import Link from 'next/link';
import Image from 'next/image';
import { getSnapshots } from '@/lib/records';
import { useAuth } from '@/contexts/AuthContext';
'use client'; 

import { useEffect, useState } from 'react';
import { DocumentData, Timestamp } from 'firebase/firestore';

function PhotoCard({ record }: { record: DocumentData }) {
  const getThumbnailUrl = (url: string) => {
    if (!url) return ''; // 如果沒有 URL，返回空字串
    const parts = url.split('.');
    if (parts.length < 2) return url;
    const extension = parts.pop();
    const name = parts.join('.');
    return `${name}_400x400.${extension}`;
  };

  const thumbnailUrl = getThumbnailUrl(record.imageUrl);

  // 如果沒有有效的縮圖 URL，可以選擇不渲染此卡片或顯示預留位置
  if (!thumbnailUrl) return null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden break-inside-avoid mb-4">
      <div className="relative w-full aspect-square bg-gray-100">
        <Image
          src={thumbnailUrl}
          alt={record.notes || '寶寶的照片'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600">{record.notes}</p>
        <p className="text-xs text-gray-400 mt-2">
          {new Date((record.timestamp as Timestamp).toDate()).toLocaleDateString('zh-TW')}
        </p>
      </div>
    </div>
  );
}


export default function PhotoWallPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [snapshots, setSnapshots] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // [修正] 增加更嚴謹的檢查，確保 userProfile 和 familyIDs 都存在且有內容
    if (!authLoading && userProfile && userProfile.familyIDs && userProfile.familyIDs.length > 0) {
      const familyId = userProfile.familyIDs[0];
      getSnapshots(familyId)
        .then((data: DocumentData[]) => { // [修正] 為 data 參數加上明確的 DocumentData[] 型別
          setSnapshots(data);
          setIsLoading(false);
        })
        .catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    } else if (!authLoading) {
      // 如果 auth 已載入完畢，但仍沒有 profile 或 familyID，也應停止載入狀態
      setIsLoading(false);
    }
  }, [userProfile, authLoading]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">照片牆</h1>
          <p className="mt-2 text-lg text-gray-600">紀錄寶寶的每一個珍貴瞬間</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">&larr; 返回儀表板</Link>
        </header>
        
        {isLoading ? (
          <p className="text-center text-gray-500">正在載入照片...</p>
        ) : snapshots.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {snapshots.map(record => (
              <PhotoCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500">目前還沒有任何照片紀錄。</p>
            <p className="text-sm text-gray-400 mt-2">（上傳功能將在下一階段實作）</p>
          </div>
        )}
      </div>
    </div>
  );
}