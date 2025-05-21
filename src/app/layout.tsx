
// app/layout.tsx
import type { Metadata } from "next";
import "./layout.css"
import { headers } from "next/headers"; // added
import ContextProvider from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: "TOPAY NODE | Dashboard",
  description: "Powered by TOPAY Foundation | A Decentralized Payment Gateway",
  icons: './favicon.ico'
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