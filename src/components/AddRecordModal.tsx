// src/components/AddRecordModal.tsx
'use client';

import { useState, FormEvent, useEffect, FC } from 'react';
import { RecordData, CreatableRecordType, addRecord } from '@/lib/records';
import { BabyProfile } from '@/lib/babies';
import { useAuth } from '@/contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';

// --- 各類紀錄的表單元件 ---

interface FormComponentProps {
    onChange: (data: Partial<RecordData>) => void;
    formData: Partial<RecordData>; 
    initialData?: Partial<RecordData>;
}

const FeedingForm: FC<FormComponentProps> = ({ onChange, initialData }) => (
    <div className="space-y-4">
        <div>
            <label htmlFor="feedMethod" className="block text-sm font-medium text-gray-700">餵食方式</label>
            <select name="feedMethod" id="feedMethod" defaultValue={initialData?.feedMethod || 'formula'} onChange={(e) => onChange({ feedMethod: e.target.value as any })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="formula">配方奶</option>
                <option value="breast">母乳</option>
            </select>
        </div>
        <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">份量 (ml)</label>
            <input type="number" name="amount" id="amount" defaultValue={initialData?.amount} onChange={(e) => onChange({ amount: parseInt(e.target.value, 10) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </div>
    </div>
);

const DiaperForm: FC<FormComponentProps> = ({ onChange, formData, initialData }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">尿布類型</label>
        <div className="mt-2 space-x-4">
            {(['wet', 'dirty'] as const).map(type => (
                <label key={type} className="inline-flex items-center">
                    <input
                        type="checkbox"
                        value={type}
                        checked={formData.diaperType?.includes(type) || false}
                        onChange={(e) => {
                            const { checked, value } = e.target;
                            const currentTypes = formData.diaperType || [];
                            let newTypes: ('wet' | 'dirty')[];

                            if (checked) {
                                newTypes = [...currentTypes, value as 'wet' | 'dirty'];
                            } else {
                                newTypes = currentTypes.filter(t => t !== value);
                            }
                            onChange({ diaperType: newTypes });
                        }}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-gray-700">{type === 'wet' ? '濕' : '髒'}</span>
                </label>
            ))}
        </div>
    </div>
);

const SleepForm: FC<FormComponentProps> = ({ onChange, initialData }) => (
     <div className="space-y-4">
        <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">開始時間</label>
            <input type="datetime-local" name="startTime" id="startTime" defaultValue={initialData?.startTime ? (initialData.startTime.toDate().toISOString().slice(0, 16)) : ''} onChange={(e) => onChange({ startTime: Timestamp.fromDate(new Date(e.target.value)) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </div>
        <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">結束時間</label>
            <input type="datetime-local" name="endTime" id="endTime" defaultValue={initialData?.endTime ? (initialData.endTime.toDate().toISOString().slice(0, 16)): ''} onChange={(e) => onChange({ endTime: Timestamp.fromDate(new Date(e.target.value)) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </div>
    </div>
);

const SolidFoodForm: FC<FormComponentProps> = ({ onChange, initialData }) => (
    <div className="space-y-4">
        <div>
            <label htmlFor="foodItems" className="block text-sm font-medium text-gray-700">食物項目 (用逗號分隔)</label>
            <input type="text" name="foodItems" id="foodItems" defaultValue={initialData?.foodItems} onChange={(e) => onChange({ foodItems: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="例如：米粥, 蘋果泥"/>
        </div>
        <div>
            <label htmlFor="reaction" className="block text-sm font-medium text-gray-700">反應</label>
            <select name="reaction" id="reaction" defaultValue={initialData?.reaction || 'good'} onChange={(e) => onChange({ reaction: e.target.value as any })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="good">良好</option>
                <option value="neutral">普通</option>
                <option value="bad">不佳</option>
            </select>
        </div>
    </div>
);

const MeasurementForm: FC<FormComponentProps> = ({ onChange, initialData }) => (
    <div className="space-y-4">
         <div>
            <label htmlFor="measurementType" className="block text-sm font-medium text-gray-700">測量類型</label>
            <select name="measurementType" id="measurementType" defaultValue={initialData?.measurementType || 'height'} onChange={(e) => onChange({ measurementType: e.target.value as any })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="height">身高 (cm)</option>
                <option value="weight">體重 (kg)</option>
                <option value="headCircumference">頭圍 (cm)</option>
            </select>
        </div>
        <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700">數值</label>
            <input type="number" name="value" id="value" step="0.1" defaultValue={initialData?.value} onChange={(e) => onChange({ value: parseFloat(e.target.value) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        </div>
    </div>
);

const SnapshotForm: FC<FormComponentProps> = ({ onChange, initialData }) => (
     <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">標籤 (用逗號分隔)</label>
        <input type="text" name="tags" id="tags" defaultValue={initialData?.tags?.join(', ')} onChange={(e) => onChange({ tags: e.target.value.split(',').map(tag => tag.trim()) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="例如：開心, 第一次"/>
    </div>
);

const PumpingForm: FC<FormComponentProps> = ({ onChange, initialData }) => (
    <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">集乳量 (ml)</label>
        <input type="number" name="amount" id="amount" defaultValue={initialData?.amount} onChange={(e) => onChange({ amount: parseInt(e.target.value, 10) })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
    </div>
);

// --- 主 Modal 元件 ---

interface AddRecordModalProps {
    recordType: CreatableRecordType;
    babyProfile: BabyProfile | null;
    onClose: () => void;
    initialData?: Partial<RecordData>;
}

export default function AddRecordModal(props: AddRecordModalProps) {
    const { babyProfile, recordType, onClose, initialData } = props;
    const { userProfile } = useAuth();
    
    const [formData, setFormData] = useState<Partial<RecordData>>(initialData || {});
    const [dateString, setDateString] = useState<string>(new Date().toISOString().slice(0, 16));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialData?.timestamp) {
            const date = initialData.timestamp.toDate();
            setDateString(date.toISOString().slice(0, 16));
        }
    }, [initialData]);
    
    const handleFormChange = (data: Partial<RecordData>) => {
        setFormData(prev => ({ ...prev, ...data }));
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!babyProfile || !userProfile) {
            setError('找不到寶寶或使用者資料，無法儲存。');
            return;
        }
        
        setIsSaving(true);
        setError('');

        try {
            const dataToSave: Partial<RecordData> = {
                ...formData,
                type: recordType,
                timestamp: Timestamp.fromDate(new Date(dateString)),
                familyId: babyProfile.familyId,
                babyId: babyProfile.id,
                creatorId: userProfile.uid,
            };

            await addRecord(dataToSave, userProfile);
            onClose();
        } catch (err) {
            console.error('Failed to save record:', err);
            setError('儲存失敗，請稍後再試。');
        } finally {
            setIsSaving(false);
        }
    };
    
    const recordTitles: Record<CreatableRecordType, string> = {
        feeding: '新增餵食紀錄',
        diaper: '新增尿布紀錄',
        sleep: '新增睡眠紀錄',
        'solid-food': '新增副食品紀錄',
        measurement: '新增生長紀錄',
        snapshot: '新增照片紀錄',
        pumping: '新增集乳紀錄',
    };

    const RecordForm = () => {
        switch (recordType) {
            case 'feeding': return <FeedingForm onChange={handleFormChange} formData={formData} initialData={initialData} />;
            case 'diaper': return <DiaperForm onChange={handleFormChange} formData={formData} initialData={initialData} />;
            case 'sleep': return <SleepForm onChange={handleFormChange} formData={formData} initialData={initialData} />;
            case 'solid-food': return <SolidFoodForm onChange={handleFormChange} formData={formData} initialData={initialData} />;
            case 'measurement': return <MeasurementForm onChange={handleFormChange} formData={formData} initialData={initialData} />;
            case 'snapshot': return <SnapshotForm onChange={handleFormChange} formData={formData} initialData={initialData} />;
            case 'pumping': return <PumpingForm onChange={handleFormChange} formData={formData} initialData={initialData} />;
            default: return <p>未知的紀錄類型</p>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                <form onSubmit={handleSave}>
                    <h2 className="text-xl font-bold mb-4">{recordTitles[recordType]}</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700">紀錄時間</label>
                            <input
                                type="datetime-local"
                                id="date"
                                value={dateString}
                                onChange={(e) => setDateString(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            />
                        </div>
                        
                        <RecordForm />

                        <div>
                             <label htmlFor="notes" className="block text-sm font-medium text-gray-700">備註</label>
                             <textarea name="notes" id="notes" rows={3} defaultValue={initialData?.notes} onChange={(e) => handleFormChange({ notes: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
                        </div>
                    </div>
                    
                    {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                            取消
                        </button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:bg-blue-300">
                            {isSaving ? '儲存中...' : '儲存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}