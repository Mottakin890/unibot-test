import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UniBot - Intelligent AI Support",
  description: "A 24/7 intelligent customer support chatbot that learns from your custom knowledge base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  // Fix: Added React import to resolve missing namespace error
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Polyfill for pdfjs worker if needed in specialized envs
            `,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}