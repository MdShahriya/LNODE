'use client'

import { wagmiadapter, projectId } from "../config"
import { createAppKit } from "@reown/appkit"
import { bsc } from "@reown/appkit/networks"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {type ReactNode} from "react"
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi"

const queryClient = new QueryClient()
if (!projectId) {
    throw new Error('Project ID is not defined! ❌');
}

const metadata = {
    name: "TOPAY quiz",
    description: "TOPAY quiz - Wallet Connect",
    url: "https://dashboard.topayfoundation.com",
    icons: ["https://www.topayfoundation.com/images/Logo.webp"]
}

// Create the modal
export const modal = createAppKit({
    adapters: [wagmiadapter],
    projectId,
    networks: [bsc],
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

console.log(metadata, modal);

function walletprovider({ children, cookies }: { children: ReactNode; cookies: string | null}) {
    const initialstate = cookieToInitialState(wagmiadapter.wagmiConfig as Config, cookies)

    return (
        <WagmiProvider config={wagmiadapter.wagmiConfig as Config} initialState={initialstate}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    )
}

export default walletprovider