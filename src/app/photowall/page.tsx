// src/app/photowall/page.tsx

'use client'; 

import Link from 'next/link';
import Image from 'next/image';
import { getSnapshots } from '@/lib/records';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { DocumentData, Timestamp, QueryDocumentSnapshot } from 'firebase/firestore';
import { useInView } from 'react-intersection-observer';
import Lightbox from '@/components/Lightbox';

// PhotoCard 元件
function PhotoCard({ record, onClick }: { record: DocumentData, onClick: (imageUrl: string) => void }) {
  const getThumbnailUrl = (url: string | undefined): string => {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const fileName = pathParts.pop() || '';
        const fileNameParts = fileName.split('.');
        if (fileNameParts.length < 2) return url;
        const extension = fileNameParts.pop();
        const name = fileNameParts.join('.');
        const newFileName = `${name}_400x400.${extension}`;
        pathParts.push(newFileName);
        urlObj.pathname = pathParts.join('/');
        return urlObj.toString();
    } catch (e) {
        console.error("無效的圖片 URL:", url);
        return '';
    }
  };

  const thumbnailUrl = getThumbnailUrl(record.imageUrl);
  if (!thumbnailUrl) return null;

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden break-inside-avoid mb-4 cursor-pointer"
      onClick={() => onClick(record.imageUrl)}
    >
      <div className="relative w-full aspect-[4/5] bg-gray-100">
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
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.5 });
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const handlePhotoClick = (imageUrl: string) => {
    setLightboxImage(imageUrl);
  };

  const loadMoreSnapshots = async () => {
    if (!hasMore || isLoadingMore || !userProfile || !userProfile.familyIDs || userProfile.familyIDs.length === 0) return;
    
    setIsLoadingMore(true);
    
    const familyId = userProfile.familyIDs[0];
    const result = await getSnapshots(familyId, { lastDoc: lastVisible });
    
    setSnapshots(prev => [...prev, ...result.snapshots]);
    setLastVisible(result.lastVisible);
    if (!result.lastVisible) {
      setHasMore(false);
    }
    setIsLoadingMore(false);
  };
  
  // 初始載入
  useEffect(() => {
    if (!authLoading && userProfile && userProfile.familyIDs && userProfile.familyIDs.length > 0) {
      const familyId = userProfile.familyIDs[0];
      getSnapshots(familyId)
        // [修改] 正確處理回傳的物件，而不是陣列
        .then((result) => {
          setSnapshots(result.snapshots);
          setLastVisible(result.lastVisible);
          if (!result.lastVisible) {
            setHasMore(false);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [userProfile, authLoading]);

  // 偵測滾動到底部並載入更多
  useEffect(() => {
    if (inView && !isLoading) {
      loadMoreSnapshots();
    }
  }, [inView, isLoading]); // [修改] 加入 isLoading 作為依賴，避免初始載入時觸發

  return (
    <>
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
            <>
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                {snapshots.map(record => (
                  <PhotoCard key={record.id} record={record} onClick={handlePhotoClick} />
                ))}
              </div>
              
              {hasMore && (
                <div ref={ref} className="text-center p-8">
                  <p className="text-gray-500">正在載入更多...</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">目前還沒有任何照片紀錄。</p>
              <p className="text-sm text-gray-400 mt-2">點擊右下角的「+」按鈕，新增第一張照片吧！</p>
            </div>
          )}
        </div>
      </div>
      
      {lightboxImage && (
        <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </>
  );
}