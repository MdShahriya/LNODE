
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

import { headers } from "next/headers"; // added
import ContextProvider from '@/context'
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "TOPAY Dashboard | early adopters",
  description: "Powered by Topay Ecosystem | Build with TOPAY Builders",
  icons: ["/favicon.ico"],
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookies = (await headers()).get('cookie')

  return (
    <html lang="en">
      <body>
        <ContextProvider cookies={cookies}>
          <Header />
          <main>{children}</main>
          <Footer />
        </ContextProvider>
      </body>
    </html>
  )
}