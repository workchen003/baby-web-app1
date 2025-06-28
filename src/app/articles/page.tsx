// [新增] src/app/articles/page.tsx

import Link from 'next/link';
import { getPublishedArticles, getFilterOptions } from '@/lib/articles';
import ArticleCard from '@/components/ArticleCard';
import ArticleFilter from '@/components/ArticleFilter';

export const revalidate = 3600; // 每小時重新生成一次頁面

export default async function ArticlesPage() {
  // 平行獲取文章和篩選選項
  const [articles, { categories, tags }] = await Promise.all([
    getPublishedArticles(),
    getFilterOptions()
  ]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">育兒知識庫</h1>
          <p className="mt-2 text-lg text-gray-600">專家與社群分享的育兒大小事</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">&larr; 返回儀表板</Link>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <ArticleFilter categories={categories} tags={tags} />
          
          <main className="flex-1">
            {articles.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {articles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">目前還沒有已發布的文章。</p>
              </div>
            )}
            {/* 未來可在此處加入分頁或載入更多按鈕 */}
          </main>
        </div>
      </div>
    </div>
  );
}