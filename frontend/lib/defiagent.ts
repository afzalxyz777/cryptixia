import { ethers } from 'ethers';

export interface PortfolioAnalysis {
    totalValue: number;
    allocations: Record<string, number>;
    riskScore: number;
    recommendations: string[];
    opportunities: any[];
}

export interface VoiceCommandResult {
    action: string;
    params: any;
}

export class DeFiAgent {
    private provider: ethers.providers.Provider;
    private signer: ethers.Signer;

    constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
        this.provider = provider;
        this.signer = signer;
    }

    async analyzePortfolio(address: string): Promise<PortfolioAnalysis> {
        // Mock implementation - in a real app, you'd query DeFi protocols
        console.log(`Analyzing portfolio for address: ${address}`);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Return mock data
        return {
            totalValue: 12500.75,
            allocations: {
                'ETH': 40,
                'USDC': 30,
                'AVAX': 20,
                'Other': 10
            },
            riskScore: 65,
            recommendations: [
                'Consider adding more stablecoin exposure',
                'Diversify into yield farming opportunities',
                'Rebalance to target allocation'
            ],
            opportunities: [
                { protocol: 'Aave', apy: '8.5%', risk: 'Low' },
                { protocol: 'Curve', apy: '12.3%', risk: 'Medium' },
                { protocol: 'Trader Joe', apy: '22.1%', risk: 'High' }
            ]
        };
    }

    async executeStrategy(strategyId: string, amount: string): Promise<string[]> {
        console.log(`Executing strategy: ${strategyId} with amount: ${amount} ETH`);

        // Convert amount to wei - CORRECT v5 syntax
        const amountWei = ethers.utils.parseEther(amount);

        // Log the amount for debugging
        console.log(`Amount in Wei: ${amountWei.toString()}`);

        // Mock strategy execution - in a real app, you'd interact with smart contracts
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Simulate transaction hashes
        const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;

        return [mockTxHash];
    }

    async parseVoiceCommand(command: string): Promise<VoiceCommandResult> {
        console.log(`Parsing voice command: "${command}"`);

        const lowerCommand = command.toLowerCase();

        if (lowerCommand.includes('analyze') || lowerCommand.includes('portfolio')) {
            return {
                action: 'analyze',
                params: {}
            };
        }

        if (lowerCommand.includes('conservative') || lowerCommand.includes('safe')) {
            const amountMatch = command.match(/(\d+(\.\d+)?)/);
            const amount = amountMatch ? amountMatch[0] : '1';

            return {
                action: 'execute_strategy',
                params: { strategy: 'conservative', amount }
            };
        }

        if (lowerCommand.includes('aggressive') || lowerCommand.includes('high yield')) {
            const amountMatch = command.match(/(\d+(\.\d+)?)/);
            const amount = amountMatch ? amountMatch[0] : '1';

            return {
                action: 'execute_strategy',
                params: { strategy: 'aggressive', amount }
            };
        }

        if (lowerCommand.includes('rebalance')) {
            return {
                action: 'rebalance',
                params: {}
            };
        }

        // Default action
        return {
            action: 'analyze',
            params: {}
        };
    }

    // Additional DeFi methods would go here
    async getTokenBalances(address: string): Promise<Record<string, number>> {
        // Mock implementation
        console.log(`Getting token balances for: ${address}`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            'ETH': 2.5,
            'USDC': 1500,
            'AVAX': 100,
            'BTC.b': 0.1
        };
    }

    async getGasPrices(): Promise<{
        low: number;
        medium: number;
        high: number;
    }> {
        // Mock implementation
        console.log('Getting current gas prices...');

        try {
            // In a real implementation, you'd fetch from a gas tracker API
            const gasPrice = await this.provider.getGasPrice();
            const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
            const basePrice = parseFloat(gasPriceGwei);

            return {
                low: Math.max(1, Math.floor(basePrice * 0.8)),
                medium: Math.floor(basePrice),
                high: Math.floor(basePrice * 1.2)
            };
        } catch (error) {
            console.error('Failed to fetch gas prices:', error);
            // Return mock data as fallback
            return {
                low: 25,
                medium: 30,
                high: 35
            };
        }
    }

    // New utility methods
    async getBalance(address: string): Promise<string> {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error('Failed to get balance:', error);
            return '0';
        }
    }

    async estimateGas(to: string, data: string, value?: string): Promise<ethers.BigNumber> {
        try {
            const gasEstimate = await this.provider.estimateGas({
                to,
                data,
                value: value ? ethers.utils.parseEther(value) : undefined
            });
            return gasEstimate;
        } catch (error) {
            console.error('Gas estimation failed:', error);
            // Return a reasonable default
            return ethers.BigNumber.from('21000');
        }
    }

    // Risk assessment method
    calculateRiskScore(allocations: Record<string, number>): number {
        // Simple risk calculation based on asset allocation
        let riskScore = 0;

        // Higher risk assets get higher scores
        const riskWeights: Record<string, number> = {
            'BTC': 0.3,
            'ETH': 0.4,
            'AVAX': 0.6,
            'USDC': 0.1,
            'USDT': 0.1,
            'DAI': 0.1,
            'Other': 0.8
        };

        for (const [asset, percentage] of Object.entries(allocations)) {
            const weight = riskWeights[asset] || 0.5;
            riskScore += (percentage / 100) * weight * 100;
        }

        return Math.min(100, Math.max(0, Math.round(riskScore)));
    }

    // Portfolio optimization suggestions
    generateRecommendations(portfolio: PortfolioAnalysis): string[] {
        const recommendations: string[] = [];
        const { allocations, riskScore } = portfolio;

        // Check stablecoin exposure
        const stablecoinAllocation = (allocations.USDC || 0) + (allocations.USDT || 0) + (allocations.DAI || 0);
        if (stablecoinAllocation < 20) {
            recommendations.push('Consider increasing stablecoin allocation to at least 20% for stability');
        }

        // Check diversification
        const numberOfAssets = Object.keys(allocations).length;
        if (numberOfAssets < 4) {
            recommendations.push('Diversify across more assets to reduce concentration risk');
        }

        // Risk-based recommendations
        if (riskScore > 80) {
            recommendations.push('Portfolio has high risk - consider rebalancing to more stable assets');
        } else if (riskScore < 20) {
            recommendations.push('Portfolio is very conservative - consider adding growth assets for better returns');
        }

        // ETH dominance check
        if (allocations.ETH > 60) {
            recommendations.push('High ETH concentration detected - consider taking some profits');
        }

        return recommendations;
    }
}