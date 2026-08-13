import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jesse-hub-smoky.vercel.app"),
  title: "Jesse-hub",
  description:
    "Jesse 的个人空间，展示开源项目、技术文章与创作。",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Jesse-hub",
    description:
      "Jesse 的个人空间，展示开源项目、技术文章与创作。",
    type: "website",
    locale: "zh_CN",
    images: [
      {
        url: "/photos/selfie-1.jpg",
        width: 800,
        height: 800,
        alt: "Jesse",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else if (theme === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-[var(--font-inter)]">{children}</body>
    </html>
  );
}
