import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, bsc } from "@reown/appkit/networks";

export const projectId = '33664dc47a3b4e5988c3fb303f4e318f';

if (!projectId) {
    throw new Error('Project ID is not defined! ❌');
}

export const networks = [mainnet, bsc];

export const wagmiadapter = new WagmiAdapter({
    storage: createStorage({
        storage: cookieStorage
    }),
    ssr: true,
    networks,
    projectId
});

export const config = wagmiadapter.wagmiConfig;