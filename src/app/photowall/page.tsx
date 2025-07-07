// src/app/photowall/page.tsx
'use client'; 

import Link from 'next/link';
import Image from 'next/image';
import { getSnapshots } from '@/lib/records';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback, useRef } from 'react'; 
import { DocumentData, Timestamp, QueryDocumentSnapshot } from 'firebase/firestore';
import { useInView } from 'react-intersection-observer';
import Lightbox from '@/components/Lightbox';
import { deleteSnapshotRecord } from '@/lib/functions';
import { generatePhotoWallPdf } from '@/lib/pdfGenerator';
import { getBabyProfile } from '@/lib/babies';

function PhotoCard({ record, onClick, onDelete, isOwner, priority = false }: { 
  record: DocumentData, 
  onClick: (imageUrl: string) => void,
  onDelete: (recordId: string, imageUrl: string) => void,
  isOwner: boolean,
  priority?: boolean
}) {
  const originalImageUrl = record.imageUrl || '/placeholder.png';
  const [imageSrc, setImageSrc] = useState(originalImageUrl);

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden break-inside-avoid mb-4 group relative cursor-pointer"
      onClick={() => onClick(originalImageUrl)}
    >
      <div className="relative w-full aspect-[4/5] bg-gray-100">
        <Image
          src={imageSrc}
          alt={record.notes || '寶寶的照片'}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover"
          priority={priority}
          onError={() => setImageSrc('/placeholder.png')}
        />
      </div>
      
      {isOwner && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(record.id, originalImageUrl);
          }}
          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="刪除照片"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
        </button>
      )}

      {record.notes && (
        <div className="p-4">
          <p className="text-sm text-gray-700">{record.notes}</p>
          <p className="text-xs text-gray-400 mt-2">{new Date((record.timestamp as Timestamp).toDate()).toLocaleDateString('zh-TW')}</p>
        </div>
      )}
    </div>
  );
}

export default function PhotoWallPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [snapshots, setSnapshots] = useState<DocumentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [filters, setFilters] = useState<{ year?: number; month?: number; tag?: string }>({});
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const { ref, inView } = useInView({ threshold: 0.5 });
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const monthInputRef = useRef<HTMLInputElement>(null);
    const tagInputRef = useRef<HTMLInputElement>(null);

    const familyId = userProfile?.familyIDs?.[0];
    if (authLoading || !familyId) {
        return <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">正在驗證使用者與家庭資料...</div>;
    }
    
    const handleExportPDF = async () => {
        if (!startDate || !endDate) {
            alert('請選擇要匯出的開始與結束日期。');
            return;
        }
        setIsExporting(true);
        try {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            const photosToExport = snapshots.filter(snap => {
                const photoDate = (snap.timestamp as Timestamp).toDate();
                return photoDate >= start && photoDate <= end;
            });
            if (photosToExport.length === 0) {
                alert('您選擇的日期區間內沒有照片可供匯出。');
                return;
            }
            const babyProfile = await getBabyProfile('baby_01');
            await generatePhotoWallPdf(photosToExport, {
                familyName: userProfile?.familyName || '我們的家庭',
                babyName: babyProfile?.name || '親愛的寶寶',
                startDate,
                endDate,
            });
        } catch (error) {
            console.error('PDF 匯出失敗:', error);
            alert('PDF 匯出失敗，請檢查主控台錯誤訊息。');
        } finally {
            setIsExporting(false);
        }
    };

    const handlePhotoClick = (imageUrl: string) => { if(imageUrl) setLightboxImage(imageUrl); };
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
        if (reset) setIsLoading(true);
        else if (!hasMore || isLoadingMore) return;
        
        setIsLoadingMore(true);
        
        const lastDoc = reset ? undefined : lastVisible;
        try {
            const result = await getSnapshots(familyId, { lastDoc, filter: filters });
            const newSnapshots = result.snapshots;
            if (reset) {
                setSnapshots(newSnapshots);
            } else {
                setSnapshots(prev => [...prev, ...newSnapshots]);
            }
            setLastVisible(result.lastVisible);
            setHasMore(!!result.lastVisible);
        } catch(error) {
            console.error("無法載入照片:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [familyId, filters, lastVisible, hasMore, isLoadingMore]);

    const handleClearFilters = () => {
        setFilters({});
        if (monthInputRef.current) monthInputRef.current.value = '';
        if (tagInputRef.current) tagInputRef.current.value = '';
    };

    useEffect(() => {
        fetchSnapshots(true);
    }, [filters, fetchSnapshots]);

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
                    
                    <div className="mb-8 p-4 bg-white rounded-lg shadow-sm flex flex-col md:flex-row flex-wrap gap-4 items-center">
                        <div className="flex flex-wrap gap-4 items-center">
                            <label htmlFor="month-filter" className="sr-only">依月份篩選</label>
                            <input id="month-filter" name="month-filter" ref={monthInputRef} type="month" className="p-2 border rounded-md" onChange={(e) => { const [year, month] = e.target.value.split('-').map(Number); setFilters({ ...filters, year, month }); }} />
                            <label htmlFor="tag-filter" className="sr-only">依標籤篩選</label>
                            <input id="tag-filter" name="tag-filter" ref={tagInputRef} type="search" className="p-2 border rounded-md" placeholder="依標籤篩選..." onKeyDown={(e) => { if (e.key === 'Enter') setFilters({ ...filters, tag: e.currentTarget.value }); }} />
                            <button onClick={handleClearFilters} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">清除篩選</button>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 items-center md:ml-auto">
                            <label htmlFor="start-date" className="sr-only">開始日期</label>
                            <input id="start-date" name="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md" />
                            <span className="text-gray-500">-</span>
                            <label htmlFor="end-date" className="sr-only">結束日期</label>
                            <input id="end-date" name="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md" />
                            <button onClick={handleExportPDF} disabled={isExporting} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {isExporting ? '匯出中...' : '匯出 PDF'}
                            </button>
                        </div>
                    </div>
          
                    {isLoading ? ( <p className="text-center text-gray-500 py-16">正在載入照片...</p> ) 
                    : snapshots.length > 0 ? (
                        <>
                            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                                {snapshots.map((record, index) => (<PhotoCard key={record.id} record={record} onClick={handlePhotoClick} onDelete={handleDelete} isOwner={user?.uid === record.creatorId} priority={index < 4}/>))}
                            </div>
                            {hasMore && (<div ref={ref} className="text-center p-8"><p className="text-gray-500">正在載入更多...</p></div>)}
                        </>
                    ) : ( <div className="text-center py-16"><p className="text-gray-500">找不到符合條件的照片，或尚未上傳任何照片。</p></div> )}
                </div>
            </div>
            
            {lightboxImage && (<Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />)}
        </>
    );
}