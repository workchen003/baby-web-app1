// [新增] src/components/SocialShareButtons.tsx

'use client';

import { usePathname } from 'next/navigation';

export default function SocialShareButtons({ title }: { title: string }) {
  // 自動獲取當前頁面的完整 URL
  const pathname = usePathname();
  const url = typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : '';

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const platforms = [
    { name: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'LINE', url: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`, color: 'bg-green-500 hover:bg-green-600' },
    { name: 'Twitter', url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, color: 'bg-gray-800 hover:bg-gray-900' },
  ];

  return (
    <div className="my-8 flex flex-col sm:flex-row items-center gap-4">
      <span className="font-semibold text-gray-700">分享給朋友：</span>
      <div className="flex items-center gap-3">
        {platforms.map(platform => (
          <a
            key={platform.name}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 text-white text-sm font-medium rounded-lg shadow-sm transition-colors ${platform.color}`}
          >
            {platform.name}
          </a>
        ))}
      </div>
    </div>
  );
}