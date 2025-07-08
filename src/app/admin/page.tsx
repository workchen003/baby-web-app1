// src/app/admin/page.tsx
'use client';

import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-3xl font-bold">後台儀表板</h1>
        <p className="mb-8 text-gray-600">歡迎回來，管理者！</p>
        <nav>
          <ul className="space-y-4">
            <li>
              <Link href="/admin/articles" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                - 文章管理
              </Link>
            </li>
            {/* 【核心修改】新增管理頁面連結 */}
            <li>
              <Link href="/admin/management" className="block p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                - 
                <span className="font-bold text-red-700">【高風險】使用者與家庭管理</span>
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mt-8 border-t pt-4">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
                &larr; 返回前台
            </Link>
        </div>
      </div>
    </div>
  );
}