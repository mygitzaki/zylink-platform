import React from 'react';

/**
 * Zylike-inspired Button Component
 * Safe to use alongside existing buttons
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  ...props 
}) => {
  const baseClasses = 'font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';
  
  const variants = {
    primary: 'bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 text-white shadow-zylike hover:scale-105 focus:ring-brand-500',
    secondary: 'bg-glass-white hover:bg-glass-white-20 text-white border border-white/20 hover:border-white/30 backdrop-blur-sm',
    ghost: 'bg-transparent hover:bg-glass-white text-white',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-zylike hover:scale-105',
    outline: 'border-2 border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-3 text-base min-h-[44px]', // Touch-friendly
    lg: 'px-6 py-4 text-lg min-h-[48px]',
    xl: 'px-8 py-5 text-xl min-h-[52px]'
  };
  
  const classes = [
    baseClasses,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    disabled || loading ? 'pointer-events-none' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button 
      className={classes}
      disabled={disabled || loading}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
