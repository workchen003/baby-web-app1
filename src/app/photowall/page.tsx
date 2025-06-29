// [新增] src/app/photowall/page.tsx

import Link from 'next/link';
import Image from 'next/image';
import { getSnapshots } from '@/lib/records';
import { useAuth } from '@/contexts/AuthContext'; // 我們需要在客戶端元件中使用
'use client'; // 因為 useAuth 是 Hook，所以此頁面需要是客戶端元件

import { useEffect, useState } from 'react';
import { DocumentData, Timestamp } from 'firebase/firestore';

// 建立一個卡片元件來顯示單張照片
function PhotoCard({ record }: { record: DocumentData }) {
  // 假設縮圖 URL 是在原始 URL 檔名後加上後綴
  // 例如：image.png -> image_400x400.png
  const getThumbnailUrl = (url: string) => {
    const parts = url.split('.');
    if (parts.length < 2) return url; // 如果 URL 沒有副檔名，直接返回原圖
    const extension = parts.pop();
    const name = parts.join('.');
    return `${name}_400x400.${extension}`;
  };

  const thumbnailUrl = getThumbnailUrl(record.imageUrl);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden break-inside-avoid mb-4">
      <div className="relative w-full aspect-square">
        <Image
          src={thumbnailUrl}
          alt={record.notes || '寶寶的照片'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          loading="lazy" // Next.js Image 內建懶載入
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
    if (!authLoading && userProfile && userProfile.familyIDs?.length > 0) {
      const familyId = userProfile.familyIDs[0];
      getSnapshots(familyId)
        .then(data => {
          setSnapshots(data);
          setIsLoading(false);
        })
        .catch(console.error);
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
        
        {/* 未來篩選器會放在這裡 */}

        {isLoading ? (
          <p className="text-center text-gray-500">正在載入照片...</p>
        ) : snapshots.length > 0 ? (
          // 簡單的 CSS Grid 佈局，為未來的瀑布流做準備
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
        
        {/* 未來無限滾動會監測這個元素 */}
      </div>
    </div>
  );
}