// src/components/FloatingActionButton.tsx
'use client';

import { useState } from 'react';
import { CreatableRecordType } from '@/lib/records';
import { Milk, Baby, Soup, Ruler, Camera, Plus, X } from 'lucide-react'; // 引入圖示

interface FloatingActionButtonProps {
  onAddRecord: (type: CreatableRecordType) => void;
}

const subButtons = [
    { type: 'snapshot', title: '新增照片手札', icon: <Camera size={20} />, color: 'bg-pink-500 hover:bg-pink-600' },
    { type: 'measurement', title: '新增生長紀錄', icon: <Ruler size={20} />, color: 'bg-purple-500 hover:bg-purple-600' },
    { type: 'diaper', title: '新增換尿布紀錄', icon: <Baby size={20} />, color: 'bg-green-500 hover:bg-green-600' },
    { type: 'feeding', title: '新增餵奶紀錄', icon: <Milk size={20} />, color: 'bg-blue-500 hover:bg-blue-600' },
]

export default function FloatingActionButton({ onAddRecord }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubButtonClick = (type: CreatableRecordType) => {
    onAddRecord(type);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
        {/* 子按鈕 */}
        <div 
            className={`flex flex-col items-center gap-3 transition-all duration-300 ease-in-out ${
                isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
        >
            {subButtons.map((btn, index) => (
                <button 
                    key={btn.type}
                    onClick={() => handleSubButtonClick(btn.type as CreatableRecordType)} 
                    className={`flex items-center justify-center w-12 h-12 rounded-full text-white shadow-lg transition-all duration-300 ${btn.color}`}
                    style={{ transitionDelay: `${isOpen ? index * 30 : 0}ms` }}
                    title={btn.title}
                >
                    {btn.icon}
                </button>
            ))}
        </div>
      
        {/* 主按鈕 */}
        <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-transform duration-300 ease-in-out hover:scale-110"
            aria-label={isOpen ? "關閉選單" : "新增紀錄"}
        >
            <Plus size={32} className={`absolute transition-all duration-300 ${isOpen ? 'rotate-45 opacity-0' : 'rotate-0 opacity-100'}`} />
            <X size={32} className={`absolute transition-all duration-300 ${isOpen ? 'rotate-0 opacity-100' : '-rotate-45 opacity-0'}`} />
        </button>
    </div>
  );
}