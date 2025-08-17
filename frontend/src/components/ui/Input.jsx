import React from 'react';

/**
 * Zylike-inspired Input Component
 * Beautiful glassmorphism input with focus states
 */
const Input = ({ 
  label,
  error,
  className = '',
  containerClassName = '',
  type = 'text',
  ...props 
}) => {
  const baseClasses = 'w-full px-4 py-3 bg-glass-white border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent';
  
  const errorClasses = error ? 'border-red-500/50 focus:ring-red-500' : '';
  
  const inputClasses = [
    baseClasses,
    errorClasses,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-white/80 mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
