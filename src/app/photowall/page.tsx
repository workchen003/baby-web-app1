'use client'; 

import Link from 'next/link';
import Image from 'next/image';
import { getSnapshots } from '@/lib/records';
import { useAuth } from '@/contexts/AuthContext';
// [修改] 從 react 引入 useRef
import { useEffect, useState, useCallback, useRef } from 'react'; 
import { DocumentData, Timestamp, QueryDocumentSnapshot } from 'firebase/firestore';
import { useInView } from 'react-intersection-observer';
import Lightbox from '@/components/Lightbox';
import { deleteSnapshotRecord } from '@/lib/functions';

// PhotoCard 元件
function PhotoCard({ record, onClick, onDelete, isOwner, priority = false }: { 
  record: DocumentData, 
  onClick: (imageUrl: string) => void,
  onDelete: (recordId: string, imageUrl: string) => void,
  isOwner: boolean,
  priority?: boolean 
}) {
  const imageUrl = record.imageUrl || '/placeholder.png';

  // [修改] 使用更安全、無副作用的字串處理方式來產生縮圖 URL
  const getThumbnailUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return '/placeholder.png'; 
    }
    
    const lastDotIndex = url.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return url; 
    }
    
    const name = url.substring(0, lastDotIndex);
    const extension = url.substring(lastDotIndex);
    return `${name}_400x400${extension}`;
  };
  const thumbnailUrl = getThumbnailUrl(record.imageUrl);

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden break-inside-avoid mb-4 group relative cursor-pointer"
      onClick={() => onClick(imageUrl)}
    >
      <div className="relative w-full aspect-[4/5] bg-gray-100">
        <Image
          src={thumbnailUrl}
          alt={record.notes || '寶寶的照片'}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover"
          loading="lazy"
          priority={priority}
          onError={(e) => { e.currentTarget.src = '/placeholder.png'; }} // 新增：圖片載入失敗時顯示預設圖
        />
      </div>
      
      {isOwner && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(record.id, imageUrl);
          }}
          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="刪除照片"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        </button>
      )}

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
  const { user, userProfile, loading: authLoading } = useAuth();
  const [snapshots, setSnapshots] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<{ year?: number; month?: number; tag?: string }>({});
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.5 });
  const isInitialLoad = useRef(true);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const handlePhotoClick = (imageUrl: string) => {
    if(imageUrl) setLightboxImage(imageUrl);
  };

  const handleDelete = async (recordId: string, imageUrl: string) => {
    if (window.confirm("您確定要永久刪除這張照片嗎？")) {
      try {
        await deleteSnapshotRecord(recordId, imageUrl);
        setSnapshots(prev => prev.filter(snap => snap.id !== recordId));
        alert('刪除成功！');
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : '刪除失敗，請稍後再試。');
      }
    }
  };

  const fetchSnapshots = useCallback(async (reset = false) => {
    if (!userProfile?.familyIDs?.[0]) return;
    
    if(reset) {
        setIsLoading(true);
    } else {
        if (!hasMore || isLoadingMore) return;
        setIsLoadingMore(true);
    }
    
    const familyId = userProfile.familyIDs[0];
    const lastDoc = reset ? undefined : lastVisible;

    try {
        const result = await getSnapshots(familyId, { lastDoc, filter: filters });

        if (reset) {
            setSnapshots(result.snapshots);
        } else {
            setSnapshots(prev => [...prev, ...result.snapshots]);
        }
        
        setLastVisible(result.lastVisible);
        setHasMore(!!result.lastVisible);
    } catch(error) {
        console.error("無法載入照片:", error);
    } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
    }

  }, [userProfile, filters, lastVisible, hasMore, isLoadingMore]);
  
  // 初始載入和篩選條件變更時的載入
  useEffect(() => {
    if (!authLoading && userProfile) {
        // 確保初始載入只執行一次，或在篩選條件變更時執行
        fetchSnapshots(true);
    }
  }, [userProfile, authLoading, filters]);

  // 偵測滾動到底部以載入更多
  useEffect(() => {
    if (inView && !isLoading && !isLoadingMore) {
      fetchSnapshots(false);
    }
  }, [inView, isLoading, isLoadingMore, fetchSnapshots]);

  return (
    <>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto p-4 md:p-8">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900">照片牆</h1>
            <p className="mt-2 text-lg text-gray-600">紀錄寶寶的每一個珍貴瞬間</p>
            <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">&larr; 返回儀表板</Link>
          </header>
          
          <div className="mb-8 p-4 bg-white rounded-lg shadow-sm flex flex-wrap gap-4 items-center">
             <input
                type="month"
                className="p-2 border rounded-md"
                onChange={(e) => {
                    if (e.target.value) {
                        const [year, month] = e.target.value.split('-').map(Number);
                        setFilters({ year, month });
                    } else {
                        setFilters({});
                    }
                }}
             />
             <input
                type="search"
                className="p-2 border rounded-md"
                placeholder="依標籤篩選..."
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        setFilters({ tag: e.currentTarget.value });
                    }
                }}
             />
             <button onClick={() => {
                setFilters({});
                // 清空 input 欄位
                const monthInput = document.querySelector('input[type="month"]') as HTMLInputElement;
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                if(monthInput) monthInput.value = '';
                if(searchInput) searchInput.value = '';
             }} className="px-4 py-2 bg-gray-200 rounded-md">清除篩選</button>
          </div>

          {isLoading ? (
            <p className="text-center text-gray-500 py-16">正在載入照片...</p>
          ) : snapshots.length > 0 ? (
            <>
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                {snapshots.map((record, index) => (
                  <PhotoCard 
                    key={record.id} 
                    record={record} 
                    onClick={handlePhotoClick}
                    onDelete={handleDelete}
                    isOwner={user?.uid === record.creatorId}
                    priority={index < 4}
                  />
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
              <p className="text-gray-500">找不到符合條件的照片，或尚未上傳任何照片。</p>
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