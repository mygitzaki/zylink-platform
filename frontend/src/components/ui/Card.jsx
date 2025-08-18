import React from 'react';

/**
 * Zylike-inspired Card Component with Glassmorphism
 * Safe to use alongside existing cards
 */
const Card = ({ 
  children, 
  variant = 'glass', 
  padding = 'lg',
  className = '', 
  hover = false,
  ...props 
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-300';
  
  const variants = {
    // Glassmorphism (Zylike style)
    glass: 'bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg',
    'glass-strong': 'bg-white/20 backdrop-blur-xl border border-white/20 shadow-xl',
    
    // Gradient backgrounds
    gradient: 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-blue-500/30 shadow-lg',
    'gradient-strong': 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 backdrop-blur-xl border border-blue-500/50',
    
    // Solid backgrounds
    solid: 'bg-gray-800/95 border border-gray-700/50 shadow-lg',
    dark: 'bg-gray-900/95 border border-gray-800/50',
    
    // Transparent
    transparent: 'bg-transparent border border-white/10'
  };
  
  const paddings = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6', 
    lg: 'p-4 sm:p-6 lg:p-8',
    xl: 'p-6 sm:p-8 lg:p-10'
  };
  
  const hoverEffects = hover ? 'hover:scale-[1.02] hover:shadow-xl hover:border-white/30' : '';
  
  const classes = [
    baseClasses,
    variants[variant] || variants.glass,
    paddings[padding] || paddings.lg,
    hoverEffects,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
