// frontend/components/ListAgentModal.tsx
import { useState } from 'react';
import { useContractWrite, usePrepareContractWrite } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../lib/contract';

interface ListAgentModalProps {
  tokenId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ListAgentModal({ tokenId, isOpen, onClose, onSuccess }: ListAgentModalProps) {
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30'); // days

  // Convert values using ethers.js for Wagmi v0.12.7
  const tokenIdBN = ethers.BigNumber.from(tokenId);
  const priceBN = price ? ethers.utils.parseEther(price) : ethers.BigNumber.from(0);
  const durationSeconds = ethers.BigNumber.from(parseInt(duration) * 24 * 60 * 60);

  // Prepare list transaction
  const { config: listConfig } = usePrepareContractWrite({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: MARKETPLACE_ABI,
    functionName: 'list',
    args: price && parseFloat(price) > 0 ? [tokenIdBN, priceBN, durationSeconds] : undefined,
    enabled: !!price && parseFloat(price) > 0,
  });

  const { write: listAgent, isLoading: isListing } = useContractWrite({
    ...listConfig,
    onSuccess: () => {
      onSuccess();
      onClose();
      setPrice('');
      setDuration('30');
    },
    onError: (error) => {
      console.error('Listing failed:', error);
      alert('Failed to list agent. Make sure you have approved the marketplace contract.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!price || parseFloat(price) <= 0) {
      alert('Please enter a valid price');
      return;
    }

    if (parseFloat(price) < 0.001) {
      alert('Minimum price is 0.001 AVAX');
      return;
    }

    if (listAgent) {
      listAgent();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4">List Agent for Sale</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Price (AVAX)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.1"
              required
            />
            <p className="text-gray-500 text-xs mt-1">Minimum: 0.001 AVAX</p>
          </div>

          <div className="mb-6">
            <label className="block text-gray-400 text-sm font-medium mb-2">
              Duration (days)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>

          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-white font-medium mb-2">Listing Summary</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Agent: #{tokenId}</p>
              <p>Price: {price || '0'} AVAX</p>
              <p>Duration: {duration} days</p>
              <p className="text-xs text-gray-400 mt-2">
                * Make sure to approve the marketplace contract before listing
              </p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              disabled={isListing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isListing || !price || parseFloat(price) <= 0}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {isListing ? 'Listing...' : 'List for Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}