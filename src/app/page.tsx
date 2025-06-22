// src/app/page.tsx

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle, signOutUser } from '@/lib/auth';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Babix App</h1>
      
      {user ? (
        // 如果使用者已登入
        <div className="text-center">
          <p className="mb-4">Welcome, {user.displayName || 'User'}!</p>
          <p className="mb-4 text-sm text-gray-500">UID: {user.uid}</p>
          <button
            onClick={signOutUser}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      ) : (
        // 如果使用者未登入
        <button
          onClick={signInWithGoogle}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.089,5.571l6.19,5.238C42.612,34.869,44,30.013,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
          </svg>
          Sign in with Google
        </button>
      )}
    </main>
  );
}