import Header from '@/components/Header';
import AnimatedBackground from '@/components/AnimatedBackground';
import { PackageSubscriptions } from '@/components/PackageSubscriptions';
import { WalletConnect } from '@/components/WalletConnect';

export default function SubscriptionPage() {
    return (
        <div className="min-h-screen bg-black text-white relative">
            <AnimatedBackground />

            {/* Header */}
            <Header />

            {/* Main Content - Added pt-24 to avoid header overlap */}
            <div className="relative z-10 container mx-auto px-4 pt-24 pb-12">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">📦 Subscription Management</h1>
                    <p className="text-gray-400">Subscribe to SaveX packages for automatic discounts on all your transfers</p>
                </div>

                {/* Wallet Connection */}
                <div className="mb-8">
                    <WalletConnect />
                </div>

                {/* Package Subscriptions */}
                <PackageSubscriptions />
            </div>
        </div>
    );
}
