// src/components/AddRecordModal.tsx
'use client';

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { addRecord, updateRecord, deleteRecord, RecordData, CreatableRecordType } from '@/lib/records';
import { uploadImage } from '@/lib/storage';
import { doc, DocumentData, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import imageCompression from 'browser-image-compression';
import { BabyProfile } from '@/lib/babies';

const dateToString = (date: Date): string => date.toISOString().split('T')[0];
type MeasurementType = 'height' | 'weight' | 'headCircumference';

interface AddRecordModalProps {
  recordType: CreatableRecordType;
  onClose: () => void;
  existingRecord?: DocumentData | null;
  initialData?: Partial<RecordData>;
  babyProfile: BabyProfile | null;
}

export default function AddRecordModal({ recordType, onClose, existingRecord, initialData, babyProfile }: AddRecordModalProps) {
  const { user, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // 表單 State
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [amount, setAmount] = useState('');
  const [foodItems, setFoodItems] = useState('');
  const [reaction, setReaction] = useState<'good' | 'neutral' | 'bad'>('good');
  const [measurementType, setMeasurementType] = useState<MeasurementType>('weight');
  const [value, setValue] = useState('');
  const [recordDate, setRecordDate] = useState(dateToString(new Date()));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const data = existingRecord || initialData || {};
    setNotes(data.notes || '');
    setTags(Array.isArray(data.tags) ? data.tags.join(', ') : '');
    setAmount(data.amount?.toString() || '');
    setFoodItems(data.foodItems || '');
    setReaction(data.reaction || 'good');
    setMeasurementType(data.measurementType || 'weight');
    setValue(data.value?.toString() || '');

    if (data.timestamp) {
      if (data.timestamp.toDate) setRecordDate(dateToString(data.timestamp.toDate()));
      else setRecordDate(dateToString(new Date(data.timestamp)));
    } else {
      setRecordDate(dateToString(new Date()));
    }
  }, [existingRecord, initialData]);

  // handleImageChange, handleDelete (維持不變)
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setError('檔案格式不符，僅接受 JPG 或 PNG 格式。');
        e.target.value = '';
        return;
      }
      setIsProcessing(true);
      setError('');
      try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg' };
        const compressedFile = await imageCompression(file, options);
        setImageFile(compressedFile);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(URL.createObjectURL(compressedFile));
      } catch (compressionError) {
        console.error('圖片壓縮失敗:', compressionError);
        setError('無法處理此圖片，請更換一張試試。');
      } finally {
        setIsProcessing(false);
      }
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
    if (!user || !userProfile?.familyIDs?.length) {
      setError('無法驗證使用者身份');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      // --- vvv 修正：只在 snapshot 類型時處理圖片上傳 vvv ---
      if (recordType === 'snapshot') {
        if (!imageFile && !existingRecord?.imageUrl) {
          setError('請選擇一張要上傳的圖片。');
          setIsSubmitting(false);
          return;
        }
        const imageUrl = imageFile ? await uploadImage(imageFile, user.uid) : existingRecord?.imageUrl;
        const tagsArray = tags.split(/[,，\s]+/).filter(tag => tag.length > 0);
        const recordData = { notes, imageUrl, tags: tagsArray, timestamp: Timestamp.fromDate(new Date(recordDate)) };

        if (existingRecord) {
            await updateRecord(existingRecord.id, recordData);
        } else {
            await addRecord({ ...recordData, type: 'snapshot', familyId: userProfile.familyIDs[0], creatorId: user.uid }, userProfile);
        }

      } else {
        let recordData: Partial<RecordData> = { notes, timestamp: Timestamp.fromDate(new Date(recordDate)) };
        
        switch (recordType) {
          case 'feeding':
            recordData.amount = Number(amount);
            if (initialData && babyProfile) {
              recordData.feedMethod = babyProfile.milkType === 'breast' ? 'breast' : 'formula';
              if (recordData.feedMethod === 'formula' && babyProfile.formulaBrand) recordData.formulaBrand = babyProfile.formulaBrand;
              if (recordData.feedMethod === 'formula' && babyProfile.formulaCalories) recordData.caloriesPerMl = babyProfile.formulaCalories / 100;
            }
            break;
          case 'solid-food':
            recordData.foodItems = foodItems;
            recordData.reaction = reaction;
            recordData.amount = Number(amount);
            break;
          case 'measurement': // 新增 measurement 的處理邏輯
            recordData.measurementType = measurementType;
            recordData.value = Number(value);
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
      case 'solid-food': return `${action}副食品記錄`;
      case 'measurement': return `${action}生長記錄`;
      case 'snapshot': return `${action}照片手札`;
      default: return `${action}記錄`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{renderTitle()}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <input type="date" id="recordDate" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>

          {recordType === 'feeding' && <div><label htmlFor="amount" className="block text-sm font-medium text-gray-700">奶量 (ml)</label><input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/></div>}
          {recordType === 'solid-food' && <>{/* ... */}</>}
          
          {/* --- vvv 新增：生長紀錄的表單區塊 vvv --- */}
          {recordType === 'measurement' && (
            <>
                <div>
                    <label htmlFor="measurementType" className="block text-sm font-medium text-gray-700">測量項目</label>
                    <select id="measurementType" value={measurementType} onChange={(e) => setMeasurementType(e.target.value as MeasurementType)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="weight">體重 (kg)</option>
                        <option value="height">身高 (cm)</option>
                        <option value="headCircumference">頭圍 (cm)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="value" className="block text-sm font-medium text-gray-700">測量數值</label>
                    <input type="number" step="0.1" id="value" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
                </div>
            </>
          )}
          {/* --- ^^^ 新增：生長紀錄的表單區塊 ^^^ --- */}

          {recordType === 'snapshot' && <>{/* ... */}</>}
          
          <div><label htmlFor="notes" className="block text-sm font-medium text-gray-700">備註 (可選)</label><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="flex justify-between items-center pt-2">{existingRecord && (<button type="button" onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200">刪除</button>)}<div className="flex gap-4 ml-auto"><button type="button" onClick={onClose} disabled={isSubmitting || isProcessing} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">取消</button><button type="submit" disabled={isSubmitting || isProcessing} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 disabled:bg-gray-400">{isSubmitting ? '儲存中...' : '儲存'}</button></div></div>
        </form>
      </div>
    </div>
  );
}