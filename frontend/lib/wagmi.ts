// frontend/lib/wagmi.ts
import { configureChains, createClient } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { getDefaultWallets } from "@rainbow-me/rainbowkit";

// Configure Fuji chain only
const { chains, provider, webSocketProvider } = configureChains(
  [avalancheFuji],
  [publicProvider()]
);

// RainbowKit connectors (no projectId in v0.12.6)
const { connectors } = getDefaultWallets({
  appName: "Cryptixia",
  chains,
});

// Wagmi client
export const wagmiClient = createClient({
  autoConnect: false, // Disable autoConnect to prevent SSR issues
  connectors,
  provider,
  webSocketProvider, // Add webSocketProvider if available
});

export { chains };