// context/index.tsx
'use client'

import { wagmiAdapter, projectId } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react' 
import { bsc, bscTestnet } from '@reown/appkit/networks'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Set up metadata
const metadata = {
  name: 'TOPAY Node | Dashboard',
  description: '',
  url: 'https://node.topayfoundation.com', // origin must match your domain & subdomain
  icons: ['https://node.topayfoundation.com/logo.png']
}

// Create the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [bsc,bscTestnet],
  defaultNetwork: bsc,
  metadata: metadata,
  termsConditionsUrl: "",
  privacyPolicyUrl: "",
  features: {
    analytics: true,
    email: false,
    socials: [],
    swaps: false,
    send: false,
    emailShowWallets: false,
    legalCheckbox: true
},
themeVariables: {
  "--w3m-color-mix": "#15CFF1",
  "--w3m-accent": "#0D7CE9",
  "--w3m-color-mix-strength": 40,  
  }
})

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
    