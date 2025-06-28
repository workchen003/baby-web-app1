// [新增] src/app/articles/view/[articleId]/page.tsx

import { getArticleById } from '@/lib/articles';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 3600;

interface PageProps {
  params: { articleId: string };
}

export default async function ViewArticlePage({ params }: PageProps) {
  const article = await getArticleById(params.articleId);

  if (!article || article.status !== 'published') {
    notFound();
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto max-w-4xl p-4 md:p-8">
        <header className="mb-8">
          <Link href="/articles" className="text-blue-600 hover:underline mb-4 block">&larr; 返回文章列表</Link>
          <p className="text-blue-600 font-semibold">{article.category}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mt-2">{article.title}</h1>
          <p className="text-gray-500 mt-4">
            發布於 {new Date(article.createdAt).toLocaleDateString('zh-TW')}
          </p>
        </header>

        {/* 使用 dangerouslySetInnerHTML 來渲染從 Tiptap 儲存的 HTML */}
        <article
          className="prose lg:prose-xl max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <footer className="mt-12 pt-8 border-t">
            <h4 className="font-semibold mb-2">標籤：</h4>
            <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                    <Link key={tag} href={`/articles/tag/${encodeURIComponent(tag)}`}>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200">
                           #{tag}
                        </span>
                    </Link>
                ))}
            </div>
        </footer>
      </div>
    </div>
  );
}