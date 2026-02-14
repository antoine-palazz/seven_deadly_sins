'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GameButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary:
    'border-blood/50 bg-blood/10 text-foreground hover:bg-blood/20 active:bg-blood/30',
  secondary:
    'border-gold-muted/50 bg-gold-muted/10 text-foreground hover:bg-gold-muted/20 active:bg-gold-muted/30',
  danger:
    'border-red-600/50 bg-red-600/10 text-red-300 hover:bg-red-600/20 active:bg-red-600/30',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-5 py-2.5 text-base min-h-[44px]',
  lg: 'px-8 py-3.5 text-lg min-h-[52px]',
};

export default function GameButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  size = 'md',
}: GameButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      className={`rounded-md border font-serif transition-all ${variants[variant]} ${sizes[size]} ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}
