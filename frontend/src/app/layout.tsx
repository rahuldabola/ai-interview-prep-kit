import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/components/ThemeProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "AI Interview Prep Kit",
    template: "%s · AI Interview Prep Kit",
  },
  description:
    "Paste a job description and a company website, and get a researched interview prep kit: company brief, role breakdown, a categorised question bank, flashcards, and a day-by-day study schedule.",
  applicationName: "AI Interview Prep Kit",
  keywords: ["interview preparation", "job interview", "study plan", "flashcards", "question bank"],
  openGraph: {
    title: "AI Interview Prep Kit",
    description:
      "Turn a job description into a researched, editable interview prep kit — brief, questions, flashcards and a study schedule.",
    type: "website",
  },
  // The app is entirely private, per-user working material; there is nothing here worth
  // indexing and kit URLs should not show up in search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches the light/dark canvas tokens so mobile browser chrome blends with the page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Sets data-theme before first paint so there is no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>
          {/* First tab stop: lets keyboard users jump the nav straight into the page. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-ink"
          >
            Skip to main content
          </a>
          <div className="flex min-h-screen flex-col">
            <Nav />
            <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
