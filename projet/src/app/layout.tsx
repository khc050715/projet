// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Projet",
  description: "실존적 항해를 위한 기록 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
            {/* 이 안에 우리의 실존적 컴포넌트들이 들어갑니다 */}
            {children}
        </main>
      </body>
    </html>
  );
}