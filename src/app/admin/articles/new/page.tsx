'use client';

import { useState } from 'react'; // 確保 useState 已引入
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // 確保 useRouter 已引入
import dynamic from 'next/dynamic'; // 1. 引入 dynamic
import { useAuth } from '@/contexts/AuthContext'; // 確保 useAuth 已引入
import { addArticle, ArticleStatus } from '@/lib/articles'; // 確保相關文章的引入正確

// 2. 使用 dynamic import 來載入 TiptapEditor，並關閉伺服器端渲染 (SSR)
const TiptapEditor = dynamic(() => import('@/components/TiptapEditor'), {
  ssr: false,
  loading: () => <p>正在載入編輯器...</p> // (可選) 增加一個載入中的提示
});

export default function NewArticlePage() {
  const router = useRouter();
  const { user } = useAuth();

  // State Management for the form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // This will be updated by the TiptapEditor
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState(''); // Using a comma-separated string for input
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // Callback function for Tiptap editor to update the content state
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  // Handles the form submission for both "draft" and "published" states
  const handleSubmit = async (publishStatus: ArticleStatus) => {
    // Basic validation
    if (!user) {
      setError('您必須登入才能發布文章。');
      return;
    }
    if (!title || content === '<p></p>' || !content) {
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
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), // Converts string to string array
        coverImageUrl: '', // Cover image functionality is deferred
        status: publishStatus,
        authorId: user.uid,
      });

      alert(`文章已成功儲存為「${publishStatus === 'published' ? '已發布' : '草稿'}」！`);
      router.push('/admin/articles'); // Redirect to the list page on success
    } catch (err) {
      setError('儲存文章時發生錯誤，請檢查控制台以獲取詳細資訊。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">新增文章</h1>

      <div className="space-y-6">
        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            文章標題
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="請輸入文章標題"
          />
        </div>
        
        {/* Content Field (Tiptap Editor) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            文章內容
          </label>
          <div className="mt-1 bg-white rounded-md shadow-sm">
            <TiptapEditor onContentChange={handleContentChange} />
          </div>
        </div>

        {/* Category Field */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            分類
          </label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            placeholder="例如：副食品、睡眠引導"
          />
        </div>

        {/* Tags Field */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            標籤 (請用逗號 , 分隔)
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            placeholder="例如：四個月, 厭奶, 技巧"
          />
        </div>

        {/* Cover Image Placeholder */}
        <div>
          <label className="block text-sm font-medium text-gray-700">封面圖</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="text-center">
              <p className="text-sm text-gray-600">上傳功能將在後續版本實現</p>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 mt-4 text-center font-semibold">{error}</p>}

      <div className="mt-8 flex justify-between items-center border-t pt-6">
        <Link href="/admin/articles" className="text-sm text-gray-600 hover:underline">
          &larr; 取消並返回列表
        </Link>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            className="px-6 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? '儲存中...' : '儲存為草稿'}
          </button>
          <button
            onClick={() => console.log('「發布文章」按鈕被點擊了！')}
            disabled={isSubmitting}
            className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? '發布中...' : '發布文章'}
          </button>
        </div>
      </div>
    </div>
  );
}