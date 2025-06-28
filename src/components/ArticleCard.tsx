// [新增] src/components/ArticleCard.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/lib/articles';

// 移除 HTML 標籤並截斷文字的輔助函式
const createExcerpt = (htmlContent: string, length = 100) => {
  const text = htmlContent.replace(/<[^>]+>/g, '');
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

export default function ArticleCard({ article }: { article: Article }) {
  const excerpt = createExcerpt(article.content);

  return (
    <Link href={`/articles/view/${article.id}`} className="block group">
      <div className="flex flex-col h-full bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        {/* 封面圖 Placeholder */}
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
          </svg>
        </div>
        <div className="p-6 flex flex-col flex-grow">
          <p className="text-sm font-semibold text-blue-600 mb-2">{article.category}</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-700">{article.title}</h2>
          <p className="text-gray-600 flex-grow">{excerpt}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}