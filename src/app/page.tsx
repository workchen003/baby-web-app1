// src/app/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/auth';
import BabixLogo from '@/components/icons/BabixLogo';
import { useRouter } from 'next/navigation';

// 將首頁專用的 CSS 樣式隔離在此，避免影響其他頁面
const HomePageStyles = () => (
  <style jsx global>{`
    .floating-button-group {
        position: fixed;
        bottom: 2.5rem;
        right: 1.5rem;
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.75rem;
    }
    .floating-button-group .sub-button {
        display: none;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease-out;
    }
    .floating-button-group.open .sub-button {
        display: flex;
        opacity: 1;
        transform: translateY(0);
    }
    .floating-button-group.open .sub-button:nth-child(1) { transition-delay: 0.05s; }
    .floating-button-group.open .sub-button:nth-child(2) { transition-delay: 0.1s; }
    .icon-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.25rem;
    }
  `}</style>
);

// 懸浮按鈕元件 (包含所有子按鈕)
const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`floating-button-group ${isOpen ? 'open' : ''}`}>
      <a href="#" className="sub-button flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600" title="聯絡客服">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.106l-1.412-.369a1.125 1.125 0 0 1-.924-.735l-.718-2.153a1.125 1.125 0 0 0-1.077-.757H9.58c-.483 0-.952.174-1.316.483l-2.91 2.55c-1.564 1.401-2.98 1.15-3.44-.063V6.75Z" /></svg>
      </a>
      <a href="#" className="sub-button flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600" title="寶寶資訊快捷">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25H21M7.5 12h-.75m0 0-2.25 2.25M3 12h.75L6 14.25m-2.25 2.25 2.25-2.25m0 0h3.819l-2.404 5.332M7.5 12l-.75 1.5m7.5-3-.935 2.336c-.247.621-.58 1.242-.997 1.838-.418.597-.93 1.124-1.503 1.588" /></svg>
      </a>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all duration-300 ease-in-out">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`w-8 h-8 transition-transform duration-300 ${isOpen ? 'hidden' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={`w-8 h-8 transition-transform duration-300 ${!isOpen ? 'hidden' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

// Header 元件
const AppHeader = () => {
    const { user } = useAuth();
    const [role, setRole] = useState('媽媽');
    const [isRoleDropdownOpen, setRoleDropdownOpen] = useState(false);
    const [isDashboardMenuOpen, setDashboardMenuOpen] = useState(false);
    const dashboardMenuRef = useRef<HTMLDivElement>(null);
    const roleMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dashboardMenuRef.current && !dashboardMenuRef.current.contains(event.target as Node)) {
                setDashboardMenuOpen(false);
            }
            if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
                setRoleDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dashboardMenuRef, roleMenuRef]);

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm shadow-sm flex-shrink-0">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center">
                    <BabixLogo className="w-auto h-10 text-blue-600" />
                </Link>
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="relative" ref={dashboardMenuRef}>
                        <button onClick={() => setDashboardMenuOpen(!isDashboardMenuOpen)} className="icon-link text-gray-600 hover:text-blue-600" title="功能選單">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                            <span className="hidden md:inline">儀表板</span>
                        </button>
                        {isDashboardMenuOpen && (
                             <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="p-2">
                                    <Link href="/growth" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                                        生長曲線
                                    </Link>
                                    <Link href="/milestones" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                       <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        發展里程碑
                                    </Link>
                                    <Link href="/photowall" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        <svg className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                        照片牆
                                    </Link>
                                     <Link href="/articles" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        育兒知識庫
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative" ref={roleMenuRef}>
                        <button onClick={() => setRoleDropdownOpen(!isRoleDropdownOpen)} className="flex items-center gap-1 text-gray-600 hover:text-blue-600 focus:outline-none">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.962a3.75 3.75 0 0 1 5.25 0m4.5 0a3.75 3.75 0 0 1 5.25 0M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H4.5A2.25 2.25 0 0 0 2.25 8.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                            <span className="text-sm md:text-base">{role}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        </button>
                        {isRoleDropdownOpen && (
                           <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                    {['媽媽', '爸爸', '爺爺', '奶奶', '保姆'].map((r) => (<a href="#" key={r} onClick={(e) => { e.preventDefault(); setRole(r); setRoleDropdownOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{r}</a>))}
                                </div>
                            </div>
                        )}
                    </div>
                    {user ? (
                        <Link href="/dashboard" aria-label="前往儀表板">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {user.photoURL ? <Image src={user.photoURL} alt={user.displayName || 'User'} width={32} height={32} className="rounded-full" /> : 
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                }
                            </div>
                        </Link>
                    ) : (
                        <button onClick={signInWithGoogle} title="登入">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

// 主要內容元件
const MainContent = () => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const handleCreateAccountClick = () => {
        if (user) {
          router.push('/dashboard');
        } else {
          signInWithGoogle();
        }
    };
    return (
        <main className="container mx-auto flex flex-grow flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-12 md:mb-16"><h1 className="text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">智慧育兒，輕鬆上手</h1><p className="mt-4 text-lg text-gray-600 md:text-xl">與你一同，紀錄寶寶的每個成長瞬間。</p></div>
            <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
                <div className="flex flex-col items-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-8 w-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg></div><h3 className="mt-4 text-xl font-semibold">全方位輕鬆紀錄</h3><p className="mt-2 text-gray-500">從餵奶、換尿布到副食品，所有日常瑣事，一鍵搞定。</p></div>
                <div className="flex flex-col items-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-8 w-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg></div><h3 className="mt-4 text-xl font-semibold">視覺化智慧分析</h3><p className="mt-2 text-gray-500">自動生成生長曲線與發展里程碑，輕鬆掌握寶寶成長軌跡。</p></div>
                <div className="flex flex-col items-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-8 w-8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.962a3.75 3.75 0 0 1 5.25 0m4.5 0a3.75 3.75 0 0 1 5.25 0M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H4.5A2.25 2.25 0 0 0 2.25 8.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg></div><h3 className="mt-4 text-xl font-semibold">無縫協同照護</h3><p className="mt-2 text-gray-500">邀請家人、保母共用，即時同步照護資訊，溝通零時差。</p></div>
            </div>
            <div className="mt-16 flex flex-col items-center gap-4 sm:flex-row">
                <button className="w-full rounded-full bg-gray-200 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-300 sm:w-auto">體驗範例模式</button>
                <button onClick={handleCreateAccountClick} disabled={loading} className="w-full rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto disabled:bg-gray-400">{loading ? '載入中...' : user ? '前往儀表板' : '建立我的家庭帳號'}</button>
            </div>
        </main>
    );
};

// Footer 元件
const AppFooter = () => (
    <footer className="w-full bg-gray-100 py-6 flex-shrink-0">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-sm text-gray-500">
            <span>© 2025 Babix. All Rights Reserved.</span>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <a href="#" className="hover:text-blue-600">關於我們</a>
                <a href="#" className="hover:text-blue-600">隱私權政策</a>
                <a href="#" className="hover:text-blue-600">服務條款</a>
                <a href="#" className="hover:text-blue-600">聯絡我們</a>
            </div>
        </div>
    </footer>
);

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            <HomePageStyles />
            <AppHeader />
            <MainContent />
            <AppFooter />
            <FloatingActionButton />
        </div>
    );
}
