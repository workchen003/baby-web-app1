'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
// --- 核心修正：引入 Next.js 的 Image 元件 ---
import Image from 'next/image';

const getFilterForAge = (ageInMonths: number) => {
  const blur = Math.max(0, 8 - (ageInMonths / 12) * 8);
  const grayscale = Math.max(0, 90 - (ageInMonths / 12) * 90);
  const contrast = Math.min(100, 50 + (ageInMonths / 12) * 50);
  return {
    filter: `blur(${blur.toFixed(2)}px) grayscale(${grayscale.toFixed(0)}%) contrast(${contrast.toFixed(0)}%)`,
  };
};

export default function VisionSimulatorPage() {
  const [ageInMonths, setAgeInMonths] = useState(0);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [filterStyle, setFilterStyle] = useState({});

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImageUrl = URL.createObjectURL(file);
      if (originalImage) {
        URL.revokeObjectURL(originalImage);
      }
      setOriginalImage(newImageUrl);
    }
  };

  const handleAgeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAgeInMonths(Number(e.target.value));
  };

  useEffect(() => {
    const newFilterStyle = getFilterForAge(ageInMonths);
    setFilterStyle(newFilterStyle);
  }, [ageInMonths]);

  useEffect(() => {
    return () => {
      if (originalImage) {
        URL.revokeObjectURL(originalImage);
      }
    };
  }, [originalImage]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">寶寶視力模擬器</h1>
        <Link href="/dashboard" className="text-blue-600 hover:underline">&larr; 返回儀表板</Link>
      </header>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="mb-8 p-4 border rounded-lg bg-gray-50 flex flex-col md:flex-row gap-8 items-center">
          <div>
            <label htmlFor="image-upload" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 cursor-pointer">
              上傳圖片
            </label>
            <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          <div className="w-full md:w-1/2">
            <label htmlFor="age-slider" className="block text-sm font-medium text-gray-700">模擬月齡：<span className="font-bold text-blue-600">{ageInMonths}</span> 個月</label>
            <input id="age-slider" type="range" min="0" max="12" step="1" value={ageInMonths} onChange={handleAgeChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">原始圖片</h2>
            <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center relative">
              {originalImage ? (
                // --- 核心修正：使用 Next/Image ---
                <Image src={originalImage} alt="Original" layout="fill" objectFit="contain" />
              ) : (
                <span className="text-gray-500">請上傳一張圖片</span>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">寶寶視覺模擬</h2>
            <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative">
              {originalImage ? (
                // --- 核心修正：使用 Next/Image ---
                <Image
                  src={originalImage}
                  alt="Simulated"
                  layout="fill"
                  objectFit="contain"
                  className="transition-all duration-300"
                  style={filterStyle}
                />
              ) : (
                <span className="text-gray-500">此處將顯示模擬影像</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}