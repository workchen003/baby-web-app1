// src/app/admin/articles/page.tsx
'use client';

import Link from 'next/link';

// 暫時的文章假資料
const dummyArticles = [
  { id: '1', title: '第一篇知識文章', status: 'published', updatedAt: '2025-06-28' },
  { id: '2', title: '寶寶副食品該怎麼吃？', status: 'published', updatedAt: '2025-06-27' },
  { id: '3', title: '關於睡眠訓練的二三事', status: 'draft', updatedAt: '2025-06-26' },
];

export default function ArticleListPage() {
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
            {dummyArticles.map(article => (
              <tr key={article.id}>
                <td className="px-6 py-4 whitespace-nowrap">{article.title}</td>
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
                <td className="px-6 py-4 whitespace-nowrap">{article.updatedAt}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a href="#" className="text-indigo-600 hover:text-indigo-900">編輯</a>
                  <a href="#" className="ml-4 text-red-600 hover:text-red-900">刪除</a>
                </td>
              </tr>
            ))}
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