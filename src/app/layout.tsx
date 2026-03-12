import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ClaudeNote - Claude Code / AI開発の最新情報",
    template: "%s | ClaudeNote",
  },
  description:
    "Claude Code・Anthropic・AI開発ツールの最新情報を日本語で届けるキュレーションメディア。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "ClaudeNote",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1071130974712342"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} antialiased`}
      >
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
          <div className="mx-auto max-w-6xl px-6">
            <p>
              ClaudeNote — 引用元を明示した上で日本語解説を提供しています。
              各記事の著作権は原著者に帰属します。
            </p>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
