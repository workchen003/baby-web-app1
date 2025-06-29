// src/components/AppLayout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import Link from 'next/link';
import Image from 'next/image';
import { signOutUser } from '@/lib/auth';
import BabixLogo from '@/components/icons/BabixLogo';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

// 計算寶寶年齡的輔助函式
const calculateAge = (birthDate: Date): string => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age_y = today.getFullYear() - birth.getFullYear();
    let age_m = today.getMonth() - birth.getMonth();
    
    if (today.getDate() < birth.getDate()) {
        age_m--;
    }
    if (age_m < 0) {
        age_y--;
        age_m += 12;
    }
    if (age_y > 0) return `${age_y} 歲 ${age_m} 個月`;
    return `${age_m} 個月`;
};


// 頂部導覽列元件
const AppHeader = () => {
    const { user, userProfile } = useAuth();
    const pathname = usePathname();
    const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);

    const navLinks = [
        { href: '/dashboard', label: '儀表板' },
        { href: '/records', label: '照護紀錄' },
        { href: '/growth', label: '生長曲線' },
        { href: '/milestones', label: '發展里程碑' },
        { href: '/photowall', label: '照片牆' },
        { href: '/meal-plan', label: '餐食規劃' },
        { href: '/solid-food-info', label: '副食品資訊' },
        { href: '/articles', label: '育兒知識庫' },
    ];

    useEffect(() => {
        if (userProfile?.familyIDs?.[0]) {
            getBabyProfile('baby_01').then(setBabyProfile);
        }
    }, [userProfile]);

    const babyAge = useMemo(() => {
        return babyProfile ? calculateAge(babyProfile.birthDate) : null;
    }, [babyProfile]);

    return (
        <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-sm shadow-sm flex-shrink-0">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" aria-label="返回首頁">
                <BabixLogo className="w-auto h-9 text-blue-600" />
            </Link>
            
            <nav className="hidden lg:flex items-center gap-6">
                {navLinks.map(link => (
                    <Link key={link.href} href={link.href} className={`text-sm font-medium transition-colors ${pathname.startsWith(link.href) ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
                        {link.label}
                    </Link>
                ))}
            </nav>

            <div className="flex items-center gap-4">
                {babyProfile && (
                     <Link href="/baby/edit" className="text-sm text-right hidden lg:block">
                        <p className="font-bold text-gray-800">{babyProfile.name}</p>
                        <p className="text-xs text-gray-500">{babyAge}</p>
                    </Link>
                )}
                
                {user && (
                     <Link href="/profile" aria-label="帳戶設定">
                        <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {user.photoURL ? <Image src={user.photoURL} alt={user.displayName || 'User'} width={36} height={36} className="rounded-full" /> : 
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                            }
                        </div>
                    </Link>
                )}
                <button onClick={signOutUser} title="登出" className="text-gray-500 hover:text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                </button>
            </div>
          </div>
        </header>
    );
}

// 主佈局元件
export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();

    const noLayoutRoutes = ['/'];
    if (noLayoutRoutes.includes(pathname)) {
        return <>{children}</>;
    }
    
    if (loading) {
        return <div className="flex h-screen w-screen items-center justify-center">載入中...</div>
    }

    if (!user) {
        // 在客戶端進行跳轉
        if(typeof window !== 'undefined') {
           window.location.href = '/';
        }
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <AppHeader />
            <main className="container mx-auto">
                {children}
            </main>
        </div>
    );
}
