// src/app/admin/articles/new/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TiptapEditor from '@/components/TiptapEditor'; // 確保 TiptapEditor 元件已建立
import { useAuth } from '@/contexts/AuthContext';
import { addArticle, ArticleStatus } from '@/lib/articles'; // 引入我們剛才建立的函式與型別

export default function NewArticlePage() {
  const router = useRouter();
  const { user } = useAuth(); // 獲取當前使用者

  // 使用 State 管理所有表單欄位的值
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // 這個 state 將由 TiptapEditor 更新
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState(''); // 暫時用逗號分隔的字串
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 處理 Tiptap 編輯器內容變化的回呼函式
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleSubmit = async (publishStatus: ArticleStatus) => {
    if (!user) {
      setError('您必須登入才能發布文章。');
      return;
    }
    if (!title || !content) {
      setError('標題和內容為必填欄位。');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addArticle({
        title,
        content,
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), // 將字串轉為陣列
        coverImageUrl: '', // 封面圖功能暫時留空
        status: publishStatus, // 使用傳入的狀態
        authorId: user.uid,
      });

      alert(`文章已成功儲存為「${publishStatus === 'published' ? '已發布' : '草稿'}」！`);
      router.push('/admin/articles'); // 成功後導向列表頁
    } catch (err) {
      setError('儲存文章時發生錯誤，請稍後再試。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">新增文章</h1>

      <div className="space-y-6">
        {/* 標題 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">文章標題</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        {/* 內容 (Tiptap 編輯器) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">文章內容</label>
          <div className="mt-1 bg-white p-2 rounded-md shadow-sm">
            <TiptapEditor onContentChange={handleContentChange} />
          </div>
        </div>

        {/* 分類 */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">分類</label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>

        {/* 標籤 */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">標籤 (請用逗號分隔)</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>

        {/* 封面圖 (暫不實作功能) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">封面圖</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <p className="text-sm text-gray-600">上傳功能將在後續版本實現</p>
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      <div className="mt-8 flex justify-between">
        <Link href="/admin/articles" className="text-sm text-gray-500 hover:underline self-center">
          &larr; 取消並返回列表
        </Link>
        <div>
          <button
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            className="px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            {isSubmitting ? '儲存中...' : '儲存為草稿'}
          </button>
          <button
            onClick={() => handleSubmit('published')}
            disabled={isSubmitting}
            className="ml-4 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? '發布中...' : '發布文章'}
          </button>
        </div>
      </div>
    </div>
  );
}