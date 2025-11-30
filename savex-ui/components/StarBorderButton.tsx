'use client';

import React from 'react';

interface StarBorderButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  color?: string;
  speed?: string;
  variant?: 'contained' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function StarBorderButton({
  children,
  onClick,
  color = '#667eea',
  speed = '6s',
  variant = 'contained',
  size = 'large',
  startIcon,
  endIcon,
  disabled = false,
  className = '',
}: StarBorderButtonProps) {
  const sizeClasses = {
    small: 'py-1.5 px-3 text-sm',
    medium: 'py-2 px-4 text-base',
    large: 'py-3 px-6 text-base',
  };

  return (
    <div className={`relative inline-block rounded-xl ${className}`}>
      {/* Button content */}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          relative rounded-xl border-none text-white font-semibold
          flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden
          ${sizeClasses[size]}
          ${variant === 'contained'
            ? 'bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl'
            : 'bg-transparent'
          }
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:-translate-y-[1px]'
          }
        `}
        style={{
          boxShadow: disabled ? 'none' : `0 4px 20px ${color}30`,
        }}
      >
        {/* Bottom star effect */}
        <div
          className="absolute w-[300%] h-1/2 -bottom-[11px] -right-[250%] rounded-full opacity-40 pointer-events-none animate-star-bottom"
          style={{
            background: `radial-gradient(circle, ${color}, transparent 10%)`,
            animationDuration: speed,
          }}
        />

        {/* Top star effect */}
        <div
          className="absolute w-[300%] h-1/2 -top-[10px] -left-[250%] rounded-full opacity-40 pointer-events-none animate-star-top"
          style={{
            background: `radial-gradient(circle, ${color}, transparent 10%)`,
            animationDuration: speed,
          }}
        />

        <span className="relative z-10 flex items-center justify-center gap-2">
          {startIcon && <span className="flex items-center justify-center">{startIcon}</span>}
          <span>{children}</span>
          {endIcon && <span className="flex items-center justify-center">{endIcon}</span>}
        </span>
      </button>
    </div>
  );
}
