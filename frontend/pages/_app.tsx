// frontend/pages/_app.tsx (Alternative approach)
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import '@rainbow-me/rainbowkit/styles.css'

// Dynamically import Web3Provider with no SSR
const Web3Provider = dynamic(() => import('../components/Web3Provider'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Web3Provider>
      <Component {...pageProps} />
    </Web3Provider>
  )
}

export default MyApp