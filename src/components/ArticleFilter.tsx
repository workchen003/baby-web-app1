// [新增] src/components/ArticleFilter.tsx

import Link from 'next/link';

interface ArticleFilterProps {
  categories: string[];
  tags: string[];
  activeCategory?: string;
  activeTag?: string;
}

const FilterLink = ({ href, text, isActive }: { href: string; text: string; isActive: boolean }) => (
    <Link href={href}>
      <span className={`block px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-blue-600 text-white font-semibold'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}>
        {text}
      </span>
    </Link>
  );

export default function ArticleFilter({ categories, tags, activeCategory, activeTag }: ArticleFilterProps) {
  return (
    <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
      <div className="sticky top-20 p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">分類</h3>
        <div className="flex flex-wrap gap-2">
          <FilterLink href="/articles" text="全部文章" isActive={!activeCategory && !activeTag} />
          {categories.map(category => (
            <FilterLink
              key={category}
              href={`/articles/category/${encodeURIComponent(category)}`}
              text={category}
              isActive={category === activeCategory}
            />
          ))}
        </div>
        
        <h3 className="text-lg font-semibold mt-8 mb-4 text-gray-800 border-b pb-2">熱門標籤</h3>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <FilterLink
              key={tag}
              href={`/articles/tag/${encodeURIComponent(tag)}`}
              text={tag}
              isActive={tag === activeTag}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}