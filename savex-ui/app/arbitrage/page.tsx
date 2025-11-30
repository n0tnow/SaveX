import ArbitrageDetector from '@/components/ArbitrageDetector';
import { WalletConnect } from '@/components/WalletConnect';
import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function ArbitragePage() {
    return (
        <div className="min-h-screen bg-black text-white relative">
            <AnimatedBackground />

            {/* Header */}
            <Header />

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-4 pt-24 pb-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Arbitrage Opportunities</h1>
                    <p className="text-gray-400">Discover and execute profitable triangular arbitrage opportunities across liquidity pools with automated detection and one-click execution</p>
                </div>

                {/* Wallet Connection */}
                <div className="mb-8">
                    <WalletConnect />
                </div>

                {/* Arbitrage Detector */}
                <ArbitrageDetector />
            </div>
        </div>
    );
}
