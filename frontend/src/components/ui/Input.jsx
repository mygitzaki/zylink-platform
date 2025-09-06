import React from 'react';

/**
 * Simple Input Component
 * Clean input with visible borders and placeholder text
 */
const Input = ({ 
  label,
  error,
  className = '',
  containerClassName = '',
  type = 'text',
  ...props 
}) => {
  const baseClasses = 'w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  
  const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
  
  const inputClasses = [
    baseClasses,
    errorClasses,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
