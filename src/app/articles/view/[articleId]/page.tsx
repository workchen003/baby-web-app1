// [修改] src/app/articles/view/[articleId]/page.tsx

import { getArticleById, getRelatedArticles } from '@/lib/articles'; // [修改] 新增 getRelatedArticles
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import SocialShareButtons from '@/components/SocialShareButtons'; // [新增] 引入分享按鈕

export const revalidate = 3600;

interface PageProps {
  params: { articleId: string };
}

export default async function ViewArticlePage({ params }: PageProps) {
  const article = await getArticleById(params.articleId);

  if (!article || article.status !== 'published') {
    notFound();
  }

  // [新增] 獲取相關文章
  const relatedArticles = await getRelatedArticles(article);

  const createdAtDate = (article.createdAt as Timestamp).toDate();

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto max-w-3xl p-4 md:p-8">
        <header className="mb-8">
          <Link href="/articles" className="text-blue-600 hover:underline mb-4 block">&larr; 返回文章列表</Link>
          <p className="text-blue-600 font-semibold">{article.category}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-2">{article.title}</h1>
          <p className="text-gray-500 mt-4">
            發布於 {createdAtDate.toLocaleDateString('zh-TW')}
          </p>
        </header>

        {/* 使用 .prose class 來應用 Tailwind Typography 的文章樣式 */}
        <article
          className="prose lg:prose-xl max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* [新增] 分享按鈕 */}
        <SocialShareButtons title={article.title} />

        {/* [新增] 相關文章區塊 */}
        {relatedArticles.length > 0 && (
          <footer className="mt-12 pt-8 border-t">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">您可能也會喜歡...</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {relatedArticles.map(related => (
                      <Link key={related.id} href={`/articles/view/${related.id}`} className="block group">
                          <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                              <p className="font-semibold text-blue-700 text-sm">{related.category}</p>
                              <h4 className="mt-1 font-bold text-gray-900 group-hover:text-blue-800">{related.title}</h4>
                          </div>
                      </Link>
                  ))}
              </div>
          </footer>
        )}
      </div>
    </div>
  );
}