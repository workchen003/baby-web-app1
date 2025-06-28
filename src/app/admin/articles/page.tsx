'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getArticles, deleteArticle, Article } from '@/lib/articles';

export default function ArticleListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 將獲取文章的邏輯封裝成一個函式，方便重複呼叫
  const fetchArticles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedArticles = await getArticles();
        setArticles(fetchedArticles);
      } catch (err) {
        console.error("Error fetching articles:", err);
        setError("無法載入文章列表，請稍後再試。");
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchArticles();
  }, []);
  
  // 刪除文章的處理函式
  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`您確定要刪除文章「${title}」嗎？此操作無法復原。`)) {
      try {
        await deleteArticle(id);
        // 直接從 state 中移除，UI 反應更快
        setArticles(prevArticles => prevArticles.filter(article => article.id !== id));
        alert('文章刪除成功！');
      } catch (err) {
        alert('刪除文章時發生錯誤。');
        console.error(err);
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">正在載入文章...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">文章管理</h1>
        <Link href="/admin/articles/new" className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          + 新增文章
        </Link>
      </header>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider">標題</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider">狀態</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider">最後更新</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {articles.length > 0 ? (
              articles.map(article => (
                <tr key={article.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{article.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {article.status === 'published' ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        已發布
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        草稿
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {article.updatedAt?.toDate().toLocaleDateString('zh-TW')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href={`/admin/articles/edit/${article.id}`} className="text-indigo-600 hover:text-indigo-900">
                      編輯
                    </Link>
                    <button onClick={() => handleDelete(article.id, article.title)} className="ml-4 text-red-600 hover:text-red-900">
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-500">
                  目前沒有任何文章，點擊右上角新增第一篇吧！
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        <Link href="/admin" className="text-sm text-gray-500 hover:underline">
          &larr; 返回儀表板
        </Link>
      </div>
    </div>
  );
}