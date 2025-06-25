
// app/layout.tsx
import type { Metadata } from "next";
import "./layout.css"
import { headers } from "next/headers"; // added
import ContextProvider from '@/context'
import MaintenancePage from './maintenance/page'
import { MAINTENANCE_CONFIG } from '@/config/maintenance'

export const metadata: Metadata = {
  title: "TOPAY NODE | Dashboard",
  description: "Powered by TOPAY Foundation | A Decentralized secure life",
  icons: './favicon.ico'
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookies = (await headers()).get('cookie')

  // If maintenance mode is enabled, show maintenance page
  if (MAINTENANCE_CONFIG.enabled) {
    return (
      <html lang="en">
        <body>
          <MaintenancePage />
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body>
        <ContextProvider cookies={cookies}>
          <main>{children}</main>
        </ContextProvider>
      </body>
    </html>
  )
}