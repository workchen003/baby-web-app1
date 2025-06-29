// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
// 引入新的 AppLayout
import AppLayout from "@/components/AppLayout";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Babix 寶寶智慧助理",
  description: "與你一同，紀錄寶寶的每個成長瞬間",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
            {/* 使用 AppLayout 包裹 children */}
            <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}