import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Mono, Rajdhani, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "HalalStocks AI — Shariah-Compliant Stock Screener",
  description: "AI-powered Shariah compliance screening built on real financial data and the AAOIFI two-gate methodology.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceMono.variable} ${rajdhani.variable} ${plusJakartaSans.variable} ${poppins.variable} h-full antialiased`}
      style={{ scrollbarGutter: 'stable' }}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
