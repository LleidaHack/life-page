import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";


const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "HackEPS Live Page",
  description: "Live page for HackEPS event showing schedule, challenges, map, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body className={`${mono.variable} antialiased `}>
        {children}

      </body>
    </html>
  );
}
