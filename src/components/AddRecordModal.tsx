// [修正] src/components/AddRecordModal.tsx

'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
// [修改] 在 import 中加入 RecordData
import { addRecord, updateRecord, deleteRecord, RecordData, CreatableRecordType } from '@/lib/records';
import { uploadImage } from '@/lib/storage';
import { DocumentData, Timestamp } from 'firebase/firestore';

// 將 Date 物件轉換為 yyyy-MM-dd 字串
const dateToString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

type MeasurementType = 'height' | 'weight' | 'headCircumference';

interface AddRecordModalProps {
  recordType: CreatableRecordType;
  onClose: () => void;
  existingRecord?: DocumentData | null;
}

export default function AddRecordModal({ recordType, onClose, existingRecord }: AddRecordModalProps) {
  const { user, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 表單欄位 state
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [foodItems, setFoodItems] = useState('');
  const [reaction, setReaction] = useState<'good' | 'neutral' | 'bad'>('good');
  const [measurementType, setMeasurementType] = useState<MeasurementType>('weight');
  const [value, setValue] = useState('');
  const [recordDate, setRecordDate] = useState(dateToString(new Date()));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (existingRecord) {
      setNotes(existingRecord.notes || '');
      setAmount(existingRecord.amount || '');
      setFoodItems(existingRecord.foodItems || '');
      setReaction(existingRecord.reaction || 'good');
      setMeasurementType(existingRecord.measurementType || 'weight');
      setValue(existingRecord.value || '');
      if (existingRecord.timestamp) {
        setRecordDate(dateToString(existingRecord.timestamp.toDate()));
      }
    }
  }, [existingRecord]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('圖片大小不能超過 5MB');
        return;
      }
      setError('');
      setImageFile(file);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(URL.createObjectURL(file));
    }
  };

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
    if (!user || !userProfile || !userProfile.familyIDs || userProfile.familyIDs.length === 0) {
      setError('無法驗證使用者身份');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      if (recordType === 'snapshot') {
        if (!imageFile) {
          setError('請選擇一張要上傳的圖片。');
          setIsSubmitting(false);
          return;
        }
        const imageUrl = await uploadImage(imageFile, user.uid);
        const tagsArray = tags.split(/[,，\s]+/).filter(tag => tag.length > 0);
        await addRecord({
          type: 'snapshot',
          familyId: userProfile.familyIDs[0],
          creatorId: user.uid,
          notes,
          imageUrl,
          tags: tagsArray,
        }, userProfile);
      } else {
        let recordData: Partial<RecordData> = { notes };
        switch (recordType) {
          case 'feeding':
            recordData = { ...recordData, amount: Number(amount) };
            break;
          case 'solid-food':
            recordData = { ...recordData, foodItems, reaction };
            break;
          case 'measurement':
            const measurementTimestamp = Timestamp.fromDate(new Date(recordDate));
            recordData = { ...recordData, measurementType, value: Number(value), timestamp: measurementTimestamp };
            break;
        }
        
        if (existingRecord) {
          await updateRecord(existingRecord.id, recordData);
        } else {
          recordData.type = recordType;
          recordData.familyId = userProfile.familyIDs[0];
          recordData.creatorId = user.uid;
          await addRecord(recordData, userProfile);
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗，請稍後再試。');
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
      case 'solid-food': return `${action}副食品記錄`;
      case 'measurement': return `${action}生長記錄`;
      case 'snapshot': return `${action}照片手札`;
      default: return `${action}記錄`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">{renderTitle()}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {recordType === 'snapshot' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">上傳照片</label>
                <input 
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imagePreview && (
                    <div className="mt-4 relative w-full h-48 rounded-lg overflow-hidden border">
                        <Image src={imagePreview} alt="圖片預覽" fill style={{ objectFit: 'cover' }} />
                    </div>
                )}
              </div>
              <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700">標籤 (用逗號分隔)</label>
                  <input
                      type="text"
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      placeholder="例如：第一次, 公園, 好天氣"
                  />
              </div>
            </>
          )}

          {recordType === 'feeding' && (
            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">奶量 (ml)</label>
              <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">備註 (可選)</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="flex justify-between items-center pt-2">
            <div>
              {existingRecord && (<button type="button" onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200">刪除</button>)}
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}