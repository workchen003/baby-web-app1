'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';

// --- 新增：計算濾鏡效果的函式 ---
const getFilterForAge = (ageInMonths: number) => {
  // 根據研究，新生兒視力模糊且對顏色不敏感，隨月齡增長而改善
  // 這是一個簡化的線性插值模型
  // 0個月: 最模糊，幾乎黑白
  // 12個月: 完全清晰，全彩

  // 模糊度 (blur): 從 8px 減少到 0px
  const blur = Math.max(0, 8 - (ageInMonths / 12) * 8);
  // 灰階度 (grayscale): 從 90% 減少到 0%
  const grayscale = Math.max(0, 90 - (ageInMonths / 12) * 90);
  // 對比度 (contrast): 從 50% 增加到 100%
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

  // --- 核心修改：將更新 state 的邏輯獨立出來 ---
  const handleAgeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAgeInMonths(Number(e.target.value));
  };

  // --- 核心修改：使用 useEffect 來根據 ageInMonths 的變化，自動更新濾鏡效果 ---
  useEffect(() => {
    const newFilterStyle = getFilterForAge(ageInMonths);
    setFilterStyle(newFilterStyle);
  }, [ageInMonths]);

  useEffect(() => {
    // 這個 return 函式會在組件被銷毀時執行
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
        {/* 控制面板 */}
        <div className="mb-8 p-4 border rounded-lg bg-gray-50 flex flex-col md:flex-row gap-8 items-center">
          <div>
            <label htmlFor="image-upload" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 cursor-pointer">
              上傳圖片
            </label>
            <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          <div className="w-full md:w-1/2">
            <label htmlFor="age-slider" className="block text-sm font-medium text-gray-700">模擬月齡：<span className="font-bold text-blue-600">{ageInMonths}</span> 個月</label>
            <input
              id="age-slider"
              type="range"
              min="0"
              max="12"
              step="1"
              value={ageInMonths}
              onChange={handleAgeChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* 圖片顯示區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">原始圖片</h2>
            <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center">
              {originalImage ? (
                <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-gray-500">請上傳一張圖片</span>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2 text-center">寶寶視覺模擬</h2>
            <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
              {originalImage ? (
                <img
                  src={originalImage}
                  alt="Simulated"
                  className="max-w-full max-h-full object-contain transition-all duration-300"
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