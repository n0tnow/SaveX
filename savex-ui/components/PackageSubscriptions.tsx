'use client';

import { useState } from 'react';
import { useWalletStore, useTransactionStore } from '@/lib/store';
import { stellarService } from '@/lib/stellar';
import { PACKAGE_TYPES } from '@/lib/config';

type PackageType = 'Family' | 'Business' | 'Premium';

export function PackageSubscriptions() {
  const { publicKey, isConnected } = useWalletStore();
  const { isLoading, setLoading, setLastTx } = useTransactionStore();

  const [selectedPackage, setSelectedPackage] = useState<PackageType>('Family');
  const [duration, setDuration] = useState(30); // 30 days default
  const [currentPackage, setCurrentPackage] = useState<any>(null);

  const handleSubscribe = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const packageTypeScVal = stellarService.createScVal.string(selectedPackage);

      const result = await stellarService.invokeSaveXContract(
        'subscribe_package',
        [
          stellarService.createScVal.address(publicKey),
          packageTypeScVal,
          stellarService.createScVal.u32(duration),
        ],
        publicKey
      );

      if (result.success) {
        setLastTx({
          type: 'Package Subscription',
          timestamp: Date.now(),
        });
        alert(
          `✅ Successfully subscribed to ${selectedPackage} package!\n\nDiscount: ${PACKAGE_TYPES[selectedPackage].discount}%\nDuration: ${duration} days`
        );
        await handleGetPackage(); // Refresh package info
      } else {
        setLastTx({
          type: 'Package Subscription',
          error: result.error,
          timestamp: Date.now(),
        });
        alert('❌ Subscription failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to subscribe to package');
    } finally {
      setLoading(false);
    }
  };

  const handleGetPackage = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const result = await stellarService.invokeSaveXContract(
        'get_package',
        [stellarService.createScVal.address(publicKey)],
        publicKey
      );

      if (result.success && result.result) {
        setCurrentPackage(result.result);
        const pkg = result.result;
        const info = `
Package Type: ${pkg.package_type}
Discount: ${pkg.discount_rate / 100}%
Transfer Count: ${pkg.transfer_count}
Total Volume: ${pkg.total_volume}
Start Date: ${new Date(Number(pkg.start_date) * 1000).toLocaleString()}
End Date: ${new Date(Number(pkg.end_date) * 1000).toLocaleString()}
Active: ${pkg.is_active ? 'Yes' : 'No'}
        `.trim();
        alert('📦 Your Package Details:\n\n' + info);
      } else {
        setCurrentPackage(null);
        alert('ℹ️ No active package found');
      }
    } catch (error) {
      console.error('Get package error:', error);
      setCurrentPackage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPackage = async () => {
    if (!publicKey) return;

    const confirmed = confirm('Are you sure you want to cancel your package subscription?');
    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await stellarService.invokeSaveXContract(
        'cancel_package',
        [stellarService.createScVal.address(publicKey)],
        publicKey
      );

      if (result.success) {
        setLastTx({
          type: 'Cancel Package',
          timestamp: Date.now(),
        });
        alert('✅ Package subscription cancelled successfully!');
        setCurrentPackage(null);
      } else {
        setLastTx({
          type: 'Cancel Package',
          error: result.error,
          timestamp: Date.now(),
        });
        alert('❌ Cancellation failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Cancel package error:', error);
      alert('Failed to cancel package');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="border border-gray-700 rounded-lg p-6 text-center bg-gray-900/50">
        <p className="text-gray-300">Please connect your wallet to manage packages</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-lg p-6 bg-gray-900 shadow-sm">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
        📦 Package Subscriptions
      </h2>

      <div className="space-y-6">
        {/* Package Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Choose Package
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(PACKAGE_TYPES) as PackageType[]).map((pkgType) => {
              const pkg = PACKAGE_TYPES[pkgType];
              return (
                <button
                  key={pkgType}
                  onClick={() => setSelectedPackage(pkgType)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPackage === pkgType
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <p className="font-bold text-lg mb-1 text-white">{pkg.label}</p>
                    <p className="text-2xl font-bold text-blue-400 mb-2">
                      {pkg.discount}%
                    </p>
                    <p className="text-xs text-gray-400">{pkg.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Subscription Duration: {duration} days
          </label>
          <div className="flex gap-2">
            {[
              { label: '1 Month', value: 30 },
              { label: '3 Months', value: 90 },
              { label: '6 Months', value: 180 },
              { label: '1 Year', value: 365 },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDuration(value)}
                className={`px-4 py-2 rounded-md ${
                  duration === value
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Benefits Summary */}
        <div className="bg-gray-800 border border-blue-500/30 rounded-lg p-4">
          <p className="font-semibold text-blue-400 mb-2">
            {PACKAGE_TYPES[selectedPackage].label} Package Benefits
          </p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>✅ {PACKAGE_TYPES[selectedPackage].discount}% discount on all transfers</li>
            <li>✅ Automatic discount application</li>
            <li>✅ Valid for {duration} days</li>
            <li>✅ Can be cancelled anytime</li>
          </ul>
        </div>

        {/* Subscribe Button */}
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-md hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isLoading ? 'Subscribing...' : `📦 Subscribe to ${selectedPackage} Package`}
        </button>

        {/* Divider */}
        <div className="border-t border-gray-700 my-6"></div>

        {/* Manage Current Package */}
        <div>
          <h3 className="font-semibold text-gray-300 mb-3">Manage Current Package</h3>
          <div className="flex gap-2">
            <button
              onClick={handleGetPackage}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              📊 View My Package
            </button>
            <button
              onClick={handleCancelPackage}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              ❌ Cancel Package
            </button>
          </div>
        </div>

        {/* Current Package Display */}
        {currentPackage && (
          <div className="bg-gray-800 border border-green-500/30 rounded-md p-4">
            <p className="font-semibold text-green-400 mb-2">✅ Active Package</p>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Type: <span className="font-bold text-white">{currentPackage.package_type}</span></p>
              <p>Discount: <span className="font-bold text-white">{currentPackage.discount_rate / 100}%</span></p>
              <p>Transfers: <span className="font-bold text-white">{currentPackage.transfer_count}</span></p>
              <p>
                Expires:{' '}
                <span className="font-bold text-white">
                  {new Date(Number(currentPackage.end_date) * 1000).toLocaleDateString()}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-800 border border-yellow-500/30 rounded-md p-3">
          <p className="text-xs text-yellow-400">
            ℹ️ Package discounts apply automatically to all your transfers. The more you
            transfer, the more you save!
          </p>
        </div>
      </div>
    </div>
  );
}