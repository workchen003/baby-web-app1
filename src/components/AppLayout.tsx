// src/components/AppLayout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getBabyProfile, BabyProfile } from '@/lib/babies';
import Link from 'next/link';
import Image from 'next/image';
import { signOutUser } from '@/lib/auth';
import BabixLogo from '@/components/icons/BabixLogo';
// ▼▼▼【修正】▼▼▼
// 1. 從 next/navigation 引入 useRouter
import { usePathname, useRouter } from 'next/navigation';
// ▲▲▲【修正】▲▲▲
import { useEffect, useState, useMemo, useRef } from 'react';
import FloatingActionButton from './FloatingActionButton';
import AddRecordModal from './AddRecordModal';
import { CreatableRecordType, RecordData } from '@/lib/records';
import { Users, LogOut, Settings, Plus, Info, Baby, BookOpen, BarChart3, Bot, Syringe, Sun } from 'lucide-react';

const calculateAge = (birthDate: Date): string => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age_y = today.getFullYear() - birth.getFullYear();
    let age_m = today.getMonth() - birth.getMonth();
    if (today.getDate() < birth.getDate()) age_m--;
    if (age_m < 0) {
        age_y--;
        age_m += 12;
    }
    return age_y > 0 ? `${age_y} 歲 ${age_m} 個月` : `${age_m} 個月`;
};

const AppHeader = () => {
    const { user, userProfile } = useAuth();
    const pathname = usePathname();
    const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
    const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    
    const navLinks = [
        { href: '/dashboard', label: '儀表板' },
        { href: '/records', label: '照護紀錄' },
        { href: '/growth', label: '生長曲線' },
        { href: '/milestones', label: '發展里程碑' },
        { href: '/photowall', label: '照片牆' },
        { href: '/meal-plan', label: '餐食規劃' },
        { href: '/articles', label: '育兒知識庫' },
    ];
    
    const toolLinks = [
      { href: '/tools/milk-estimator', label: '奶量估算器', icon: <Syringe size={16}/> },
      { href: '/tools/vision-simulator', label: '視覺模擬器', icon: <Baby size={16}/> },
    ]

    useEffect(() => {
        if (userProfile?.familyIDs?.[0]) {
            getBabyProfile('baby_01').then(setBabyProfile);
        }
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [userProfile]);

    const babyAge = useMemo(() => babyProfile ? calculateAge(babyProfile.birthDate) : null, [babyProfile]);

    return (
        <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-sm shadow-sm flex-shrink-0">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" aria-label="返回首頁"><BabixLogo className="w-auto h-9 text-blue-600" /></Link>
            
            <nav className="hidden lg:flex items-center gap-1">
                {navLinks.map(link => (
                    <Link key={link.href} href={link.href} className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${pathname.startsWith(link.href) ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-900'}`}>
                        {link.label}
                    </Link>
                ))}
                <div className="relative group">
                    <button className="px-3 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-900 flex items-center gap-1">
                        育兒工具
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div className="p-2">
                           {toolLinks.map(link => (
                               <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">{link.icon}{link.label}</Link>
                           ))}
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex items-center gap-4">
                {babyProfile && (
                     <Link href="/baby/edit" className="text-sm text-right hidden lg:block">
                        <p className="font-bold text-gray-800">{babyProfile.name}</p>
                        <p className="text-xs text-gray-500">{babyAge}</p>
                    </Link>
                )}
                
                <div className="relative" ref={profileMenuRef}>
                    <button onClick={() => setProfileMenuOpen(!isProfileMenuOpen)} className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden ring-2 ring-offset-2 ring-transparent hover:ring-blue-500 transition-all">
                        {user?.photoURL ? <Image src={user.photoURL} alt={user.displayName || 'User'} width={36} height={36} className="rounded-full" /> : 
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-6 w-6 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                        }
                    </button>
                    {isProfileMenuOpen && (
                         <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                            <div className="p-2">
                                <div className="px-3 py-2 mb-2 border-b">
                                    <p className="text-sm font-semibold text-gray-800">{userProfile?.displayName}</p>
                                    <p className="text-xs text-gray-500">{userProfile?.email}</p>
                                </div>
                                <Link href="/profile" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"><Settings size={16}/>個人資料設定</Link>
                                <Link href="/family/manage" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"><Users size={16}/>家庭管理與邀請</Link>
                                <div className="border-t my-2"></div>
                                <button onClick={signOutUser} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut size={16}/>登出</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </header>
    );
}

const AppFooter = () => (
    <footer className="w-full bg-gray-100 py-6 flex-shrink-0 mt-12">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-x-6 gap-y-2 px-4 text-sm text-gray-500">
            <span>© {new Date().getFullYear()} Babix. All Rights Reserved.</span>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <Link href="/about" className="hover:text-blue-600">關於我們</Link>
                <a href="#" className="hover:text-blue-600">隱私權政策</a>
                <a href="#" className="hover:text-blue-600">服務條款</a>
            </div>
        </div>
    </footer>
);

// 主佈局元件
export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    // ▼▼▼【修正】▼▼▼
    // 2. 在元件頂層宣告 useRouter
    const router = useRouter();
    // ▲▲▲【修正】▲▲▲
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ type: CreatableRecordType, initialData?: Partial<RecordData> } | null>(null);
    const [babyProfileForModal, setBabyProfileForModal] = useState<BabyProfile | null>(null);

    useEffect(() => {
        if (user) {
            getBabyProfile('baby_01').then(setBabyProfileForModal);
        }
    }, [user]);

    const handleAddRecord = (type: CreatableRecordType) => {
        setModalConfig({ type });
        setIsModalOpen(true);
    };
    
    const noLayoutRoutes = ['/'];
    if (noLayoutRoutes.includes(pathname)) {
        return <>{children}</>;
    }
    
    if (loading) {
        return <div className="flex h-screen w-screen items-center justify-center">載入中...</div>
    }

    if (!user && typeof window !== 'undefined') {
        router.push('/');
        return null;
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <AppHeader />
            <main className="container mx-auto flex-grow">
                {children}
            </main>
            <AppFooter />
            <FloatingActionButton onAddRecord={handleAddRecord} />
            {isModalOpen && modalConfig && (
                <AddRecordModal
                    recordType={modalConfig.type}
                    initialData={modalConfig.initialData}
                    onClose={() => setIsModalOpen(false)}
                    babyProfile={babyProfileForModal}
                />
            )}
        </div>
    );
}