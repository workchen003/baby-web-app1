// src/components/FloatingActionButton.tsx

'use client';

import { useState } from 'react';
import { CreatableRecordType } from '@/lib/records'; // [修改] 從 records.ts 引入共用型別

interface FloatingActionButtonProps {
  onAddRecord: (type: CreatableRecordType) => void;
}

export default function FloatingActionButton({ onAddRecord }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubButtonClick = (type: CreatableRecordType) => {
    onAddRecord(type);
    setIsOpen(false);
  };

  return (
    <div className={`floating-button-group ${isOpen ? 'open' : ''}`}>
      {/* 子按鈕: 睡眠 */}
      <button onClick={() => handleSubButtonClick('sleep')} className="sub-button flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600" title="新增睡眠記錄">
        😴
      </button>
      {/* 子按鈕: 換尿布 */}
      <button onClick={() => handleSubButtonClick('diaper')} className="sub-button flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600" title="新增換尿布記錄">
        👶
      </button>
      {/* 子按鈕: 餵奶 */}
      <button onClick={() => handleSubButtonClick('feeding')} className="sub-button flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600" title="新增餵奶記錄">
        🍼
      </button>

      {/* 主按鈕 */}
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all duration-300 ease-in-out">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`w-8 h-8 transition-transform duration-300 ${isOpen ? 'hidden' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`w-8 h-8 transition-transform duration-300 ${!isOpen ? 'hidden' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}