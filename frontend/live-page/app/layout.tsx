import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import AlertCenter from "@/components/AlertCenter";

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "HackEPS2025 Live Page",
  description: "Live page for HackEPS2025 event showing schedule, challenges, map, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body className={`${mono.variable} antialiased bg-ola`}>
        {children}
        <AlertCenter />
      </body>
    </html>
  );
}
