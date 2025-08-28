// pages/mint.tsx
import { useEffect, useState } from 'react';
import MintForm from '../components/MintForm';

export default function MintPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading mint page...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <h1 className="text-3xl font-bold text-white mb-6">Mint Page</h1>
      <MintForm />
    </div>
  );
}