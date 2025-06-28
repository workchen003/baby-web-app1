// [修正] src/app/articles/category/[slug]/page.tsx

import Link from 'next/link';
import { getPublishedArticles, getFilterOptions } from '@/lib/articles';
import ArticleCard from '@/components/ArticleCard';
import ArticleFilter from '@/components/ArticleFilter';

export const revalidate = 3600;

// [移除] 不再需要自訂 PageProps 介面
// interface PageProps {
//   params: { slug: string };
// }

// [修正] 直接在函式簽名中定義 props 的型別
export default async function CategoryArticlePage({ params }: { params: { slug: string } }) {
  const category = decodeURIComponent(params.slug);
  
  const [articles, { categories, tags }] = await Promise.all([
    getPublishedArticles({ category }),
    getFilterOptions()
  ]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">分類：{category}</h1>
          <p className="mt-2 text-lg text-gray-600">關於「{category}」的所有文章</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">&larr; 返回儀表板</Link>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <ArticleFilter categories={categories} tags={tags} activeCategory={category} />
          
          <main className="flex-1">
            {articles.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {articles.map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">這個分類下沒有文章。</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}