'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addRecord, updateRecord, deleteRecord, RecordData } from '@/lib/records';
import { DocumentData } from 'firebase/firestore';

// --- 修改：在 RecordType 裡加上 'solid-food' ---
type RecordType = 'feeding' | 'diaper' | 'sleep' | 'solid-food';

interface AddRecordModalProps {
  recordType: RecordType;
  onClose: () => void;
  existingRecord?: DocumentData | null;
}

export default function AddRecordModal({ recordType, onClose, existingRecord }: AddRecordModalProps) {
  const { user, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 表單欄位的 state
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  // --- 新增：副食品的 state ---
  const [foodItems, setFoodItems] = useState('');
  const [reaction, setReaction] = useState<'good' | 'neutral' | 'bad'>('good');


  // Effect hook: 如果有傳入 existingRecord，就用它的資料預填表單
  useEffect(() => {
    if (existingRecord) {
      setNotes(existingRecord.notes || '');
      setAmount(existingRecord.amount || '');
      // --- 新增：預填副食品資料 ---
      setFoodItems(existingRecord.foodItems || '');
      setReaction(existingRecord.reaction || 'good');
    }
  }, [existingRecord]);

  const handleDelete = async () => {
    if (existingRecord && window.confirm('您確定要刪除這筆記錄嗎？此操作無法復原。')) {
      try {
        await deleteRecord(existingRecord.id);
        onClose();
      } catch (err) {
        setError('刪除失敗，請稍後再試。');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !userProfile.familyIDs) {
      setError('無法驗證使用者身份');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      if (existingRecord) {
        // --- 編輯模式 ---
        let updatedData: Partial<RecordData> = { notes };
        if (recordType === 'feeding') {
          updatedData = { ...updatedData, amount: Number(amount) };
        }
        // --- 新增：處理副食品編輯 ---
        if (recordType === 'solid-food') {
          updatedData = { ...updatedData, foodItems, reaction };
        }
        await updateRecord(existingRecord.id, updatedData);
      } else {
        // --- 新增模式 ---
        const baseData: Omit<RecordData, 'timestamp' | 'creatorName' | 'babyId'> = {
          familyId: userProfile.familyIDs[0],
          creatorId: user.uid,
          type: recordType,
          notes,
        };

        let recordData: Partial<RecordData> = { ...baseData };

        if (recordType === 'feeding') {
          recordData = { ...recordData, amount: Number(amount) };
        }
        // --- 新增：處理副食品新增 ---
        if (recordType === 'solid-food') {
          recordData = { ...recordData, foodItems, reaction };
        }
        await addRecord(recordData, userProfile);
      }
      onClose(); // 成功後關閉 Modal
    } catch (err) {
      setError('儲存失敗，請稍後再試。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderTitle = () => {
    const action = existingRecord ? '編輯' : '新增';
    switch (recordType) {
      case 'feeding': return `${action}餵奶記錄`;
      case 'diaper': return `${action}換尿布記錄`;
      case 'sleep': return `${action}睡眠記錄`;
      case 'solid-food': return `${action}副食品記錄`; // --- 新增 ---
      default: return `${action}記錄`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{renderTitle()}</h2>
        <form onSubmit={handleSubmit}>
          {recordType === 'feeding' && (
            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">奶量 (ml)</label>
              <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
            </div>
          )}

          {/* --- 新增：副食品輸入欄位 --- */}
          {recordType === 'solid-food' && (
            <>
              <div className="mb-4">
                <label htmlFor="foodItems" className="block text-sm font-medium text-gray-700">食物內容</label>
                <input type="text" id="foodItems" value={foodItems} onChange={(e) => setFoodItems(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="例如：蘋果泥、十倍粥" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">寶寶反應</label>
                <div className="mt-2 flex gap-4">
                    <label className="inline-flex items-center">
                        <input type="radio" className="form-radio" name="reaction" value="good" checked={reaction === 'good'} onChange={() => setReaction('good')} />
                        <span className="ml-2">良好</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input type="radio" className="form-radio" name="reaction" value="neutral" checked={reaction === 'neutral'} onChange={() => setReaction('neutral')} />
                        <span className="ml-2">普通</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input type="radio" className="form-radio" name="reaction" value="bad" checked={reaction === 'bad'} onChange={() => setReaction('bad')} />
                        <span className="ml-2">不佳/過敏</span>
                    </label>
                </div>
              </div>
            </>
          )}

          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">備註 (可選)</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-between items-center">
            <div>
              {existingRecord && (
                <button type="button" onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200">
                  刪除
                </button>
              )}
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">{isSubmitting ? '儲存中...' : '儲存'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}