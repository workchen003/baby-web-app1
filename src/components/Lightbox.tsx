'use client';

import Image from 'next/image';

interface LightboxProps {
  imageUrl: string;
  onClose: () => void;
}

export default function Lightbox({ imageUrl, onClose }: LightboxProps) {
  // 點擊背景時關閉燈箱
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* 點擊圖片本身時，事件不會冒泡到背景層，避免關閉 */}
      <div className="relative w-full h-full max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={imageUrl}
          alt="放大的照片"
          fill
          style={{ objectFit: 'contain' }}
          sizes="100vw"
          priority // 優先載入燈箱中的大圖
        />
      </div>
      <button 
        className="absolute top-4 right-4 text-white text-4xl font-bold hover:opacity-80 transition-opacity"
        onClick={onClose}
        aria-label="關閉燈箱"
      >
        &times;
      </button>
    </div>
  );
}