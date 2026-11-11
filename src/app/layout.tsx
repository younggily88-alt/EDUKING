import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "교육전문직을 준비",
  description: "교육전문직 준비 교사용 개인 학습 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider signInUrl="/sign-in">
      <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col leading-relaxed">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
