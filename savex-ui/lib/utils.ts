import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatAmount(amount: string | bigint, decimals = 7): string {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

export function parseAmount(amount: string, decimals = 7): bigint {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0');
  const fraction = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);

  return whole * BigInt(10 ** decimals) + BigInt(fraction);
}