// [最終修正] src/app/articles/category/[slug]/page.tsx

import Link from 'next/link';
import { getPublishedArticles, getFilterOptions } from '@/lib/articles';
import ArticleCard from '@/components/ArticleCard';
import ArticleFilter from '@/components/ArticleFilter';
import type { Metadata } from 'next'; // [新增] 引入 Metadata 型別

export const revalidate = 3600;

// 定義頁面 Props 的型別
type Props = {
  params: { slug: string };
};

// [新增] 動態生成頁面元數據 (Metadata) 的函式
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = decodeURIComponent(params.slug);
  return {
    title: `分類：${category} | 育兒知識庫`,
    description: `探索所有關於「${category}」的育兒文章、技巧與指南。`,
  };
}

// 在 Page 元件中使用 Props 型別
export default async function CategoryArticlePage({ params }: Props) {
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