'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Rocket,
  Compass,
  BarChart3,
  Repeat,
  Droplets,
  Wallet,
  Copy,
  LogOut,
} from 'lucide-react';
import StarBorderButton from './StarBorderButton';
import { useWalletStore } from '@/lib/store';
import { stellarService } from '@/lib/stellar';

// Enhanced Wallet Connection Component
const WalletConnection = () => {
  const { publicKey, isConnected, balances, setPublicKey, disconnect } = useWalletStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);

  const handleConnectWallet = async () => {
    setLoading(true);
    try {
      const key = await stellarService.connectWallet();
      if (key) {
        setPublicKey(key);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setAnchorEl(null);
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
    }
    setAnchorEl(null);
  };

  const formatAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatBalance = () => {
    const xlmBalance = balances.find(b => b.token === 'XLM');
    if (!xlmBalance) return '0 XLM';
    const amount = parseFloat(xlmBalance.amount);
    return `${amount.toFixed(2)} XLM`;
  };

  return (
    <>
      {isConnected && publicKey ? (
        <div className="relative">
          <StarBorderButton
            startIcon={
              <div className="w-7 h-7 bg-[#667eea] rounded-full flex items-center justify-center text-xs">
                W
              </div>
            }
            onClick={(e) => setAnchorEl(e.currentTarget)}
            color="#667eea"
            speed="3s"
            variant="outlined"
          >
            {formatAddress(publicKey)}
          </StarBorderButton>

          {/* Dropdown Menu */}
          {anchorEl && (
            <div
              className="absolute right-0 mt-2 w-52 bg-black/95 backdrop-blur-xl border border-[#667eea]/30 rounded-2xl overflow-hidden z-50"
              onMouseLeave={() => setAnchorEl(null)}
            >
              <div className="px-4 py-3 border-b border-[#667eea]/20">
                <div className="flex items-center gap-2 text-white">
                  <Wallet className="w-5 h-5 text-[#667eea]" />
                  <div>
                    <div className="font-semibold">Freighter</div>
                    <div className="text-sm text-white/60">
                      {formatBalance()}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCopyAddress}
                className="w-full px-4 py-3 flex items-center gap-2 text-white hover:bg-white/5 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Address</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-3 flex items-center gap-2 text-red-500 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <StarBorderButton
          startIcon={<Wallet className="w-5 h-5" />}
          onClick={handleConnectWallet}
          disabled={loading}
          color="#667eea"
          speed="4s"
          variant="contained"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </StarBorderButton>
      )}
    </>
  );
};

export default function Header({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();

  const navItems = [
    {
      icon: <Compass className="w-5 h-5" />,
      label: 'Explore',
      color: '#8b9dc3',
      href: '/landing',
    },
    {
      icon: <Repeat className="w-5 h-5" />,
      label: 'Swap',
      color: '#a8c2ca',
      href: '/swap',
    },
    {
      icon: <Droplets className="w-5 h-5" />,
      label: 'Liquidity',
      color: '#9bb5c7',
      href: '/liquidity',
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: 'Analytics',
      color: '#c4a8e8',
      href: '/analytics',
    },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
      style={{
        backgroundColor: transparent ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.05)',
        backdropFilter: transparent ? 'blur(4px)' : 'blur(8px)',
      }}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 relative">
          {/* Left Side - Logo */}
          <Link href="/" className="no-underline">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                animate={{ y: [0, -1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Rocket
                  className="text-[#667eea] w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 transition-all duration-300"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(102, 126, 234, 0.4))',
                  }}
                />
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <h1
                  className="text-xl sm:text-2xl md:text-3xl font-black bg-clip-text text-transparent"
                  style={{
                    background:
                      'linear-gradient(135deg, #667eea 0%, #f093fb 50%, #667eea 100%)',
                    backgroundSize: '200% 200%',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    fontWeight: '900',
                    animation: 'gradient-shift 3s ease infinite',
                  }}
                >
                  SaveX
                </h1>
              </motion.div>
            </div>
          </Link>

          {/* Center - Transparent Navigation Icons */}
          <div className="hidden sm:flex items-center gap-1 md:gap-2 lg:gap-3 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                <Link
                  href={item.href}
                  className="flex items-center justify-center gap-1 xl:gap-2 cursor-pointer no-underline w-8 h-8 md:w-10 md:h-10 lg:w-auto lg:h-10 xl:h-11 rounded-full lg:rounded-xl transition-all duration-300 border-none relative overflow-hidden lg:px-3 xl:px-4 lg:py-2 xl:py-2.5 group"
                  style={{
                    backgroundColor: pathname === item.href ? `${item.color}15` : 'transparent',
                  }}
                >
                  {/* Shimmer effect */}
                  <div
                    className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-600 group-hover:left-full z-10"
                  />

                  <div
                    className="relative z-20 flex items-center justify-center transition-all duration-300"
                    style={{
                      color: item.color,
                      filter: `drop-shadow(0 0 4px ${item.color}60)`,
                    }}
                  >
                    {item.icon}
                  </div>

                  {/* Show text on larger screens */}
                  <span
                    className="hidden lg:block text-sm xl:text-base font-semibold whitespace-nowrap relative z-20 transition-all duration-300"
                    style={{
                      color: item.color,
                      textShadow: `0 0 6px ${item.color}40`,
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Right Side - Wallet Connection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <WalletConnection />
          </motion.div>
        </div>
      </div>
    </header>
  );
}
