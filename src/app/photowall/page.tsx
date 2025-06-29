// src/app/photowall/page.tsx

'use client'; 

import Link from 'next/link';
import Image from 'next/image';
import { getSnapshots } from '@/lib/records';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { DocumentData, Timestamp } from 'firebase/firestore';

// 建立一個卡片元件來顯示單張照片
function PhotoCard({ record }: { record: DocumentData }) {
  // 根據 Firebase Resize Image 擴充功能的命名規則來產生縮圖 URL
  const getThumbnailUrl = (url: string | undefined): string => {
    if (!url) return '/placeholder.png'; // 提供一個預設圖片路徑
    
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const fileName = pathParts.pop() || '';
        const fileNameParts = fileName.split('.');
        
        if (fileNameParts.length < 2) return url;
        
        const extension = fileNameParts.pop();
        const name = fileNameParts.join('.');
        
        // 組合新的檔名，例如：image.jpeg -> image_400x400.jpeg
        const newFileName = `${name}_400x400.${extension}`;
        pathParts.push(newFileName);
        urlObj.pathname = pathParts.join('/');
        return urlObj.toString();
    } catch (e) {
        console.error("無效的圖片 URL:", url);
        return '/placeholder.png'; // URL 格式錯誤時也返回預設圖片
    }
  };

  const thumbnailUrl = getThumbnailUrl(record.imageUrl);

  return (
    // 'break-inside-avoid' class 可以防止元素在多欄佈局中被切斷
    <div className="bg-white rounded-lg shadow-md overflow-hidden break-inside-avoid mb-4">
      <div className="relative w-full aspect-[4/5] bg-gray-100"> {/* 調整圖片比例 */}
        <Image
          src={thumbnailUrl}
          alt={record.notes || '寶寶的照片'}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover"
          loading="lazy"
        />
      </div>
      {record.notes && (
        <div className="p-4">
          <p className="text-sm text-gray-700">{record.notes}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date((record.timestamp as Timestamp).toDate()).toLocaleDateString('zh-TW')}
          </p>
        </div>
      )}
    </div>
  );
}


export default function PhotoWallPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [snapshots, setSnapshots] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && userProfile && userProfile.familyIDs && userProfile.familyIDs.length > 0) {
      const familyId = userProfile.familyIDs[0];
      getSnapshots(familyId)
        .then((data: DocumentData[]) => {
          setSnapshots(data);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else if (!authLoading) {
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
          <p className="text-center text-gray-500 py-16">正在載入照片...</p>
        ) : snapshots.length > 0 ? (
          // 使用 CSS Columns 實現簡單的瀑布流佈局
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
            {snapshots.map(record => (
              <PhotoCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500">目前還沒有任何照片紀錄。</p>
            <p className="text-sm text-gray-400 mt-2">點擊右下角的「+」按鈕，新增第一張照片吧！</p>
          </div>
        )}
      </div>
    </div>
  );
}