'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { getArticleById, updateArticle, Article, ArticleStatus } from '@/lib/articles';

// 動態載入 Tiptap 編輯器以避免 SSR 問題
const TiptapEditor = dynamic(() => import('@/components/TiptapEditor'), {
  ssr: false,
  loading: () => <p>正在載入編輯器...</p>
});

// 在新版 Next.js 中，我們不再需要從 props 接收 params
export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams(); // 使用 useParams hook 來獲取路由參數
  const articleId = params.articleId as string; // 從 params 物件中取得 articleId
  const { user } = useAuth();

  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (articleId) {
      getArticleById(articleId)
        .then(fetchedArticle => {
          if (fetchedArticle) {
            setCurrentArticle(fetchedArticle);
            setTitle(fetchedArticle.title);
            setContent(fetchedArticle.content);
            setCategory(fetchedArticle.category);
            setTags(fetchedArticle.tags.join(', '));
          } else {
            setError('找不到該文章。');
          }
        })
        .catch(err => {
          console.error(err);
          setError('讀取文章資料時發生錯誤。');
        })
        .finally(() => setIsLoading(false));
    }
  }, [articleId]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleSubmit = async (publishStatus: ArticleStatus) => {
    if (!user) {
      setError('權限不足，請重新登入。');
      return;
    }
    if (!title || !content) {
        setError('標題和內容為必填欄位。');
        return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updatedData = {
        title,
        content,
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        status: publishStatus,
      };
      await updateArticle(articleId, updatedData);
      alert('文章更新成功！');
      router.push('/admin/articles');
    } catch (err) {
      setError('更新文章時發生錯誤。');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">正在載入文章資料...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!currentArticle) return <div className="p-8 text-center">找不到文章。</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">編輯文章</h1>
      <div className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">文章標題</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">文章內容</label>
          <div className="mt-1 bg-white rounded-md shadow-sm">
            <TiptapEditor initialContent={content} onContentChange={handleContentChange} />
          </div>
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">分類</label>
          <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">標籤 (請用逗號 , 分隔)</label>
          <input type="text" id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
        </div>
      </div>
      <div className="mt-8 flex justify-between items-center border-t pt-6">
        <Link href="/admin/articles" className="text-sm text-gray-600 hover:underline">&larr; 放棄變更並返回</Link>
        <div className="flex items-center gap-4">
          <button onClick={() => handleSubmit('draft')} disabled={isSubmitting} className="px-6 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50">儲存草稿</button>
          <button onClick={() => handleSubmit('published')} disabled={isSubmitting} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">更新文章</button>
        </div>
      </div>
    </div>
  );
}