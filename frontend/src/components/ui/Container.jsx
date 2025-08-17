import React from 'react';

/**
 * Zylike-inspired Container Component
 * Responsive container with consistent max-widths and padding
 */
const Container = ({ 
  children, 
  size = '7xl',
  padding = true,
  className = '',
  ...props 
}) => {
  const maxWidths = {
    sm: 'max-w-sm',      // 384px
    md: 'max-w-md',      // 448px  
    lg: 'max-w-lg',      // 512px
    xl: 'max-w-xl',      // 576px
    '2xl': 'max-w-2xl',  // 672px
    '3xl': 'max-w-3xl',  // 768px
    '4xl': 'max-w-4xl',  // 896px
    '5xl': 'max-w-5xl',  // 1024px
    '6xl': 'max-w-6xl',  // 1152px
    '7xl': 'max-w-7xl',  // 1280px (Zylike default)
    full: 'max-w-full'
  };
  
  const paddingClasses = padding ? 'px-4 sm:px-6 lg:px-8' : '';
  
  const classes = [
    'mx-auto',
    maxWidths[size] || maxWidths['7xl'],
    paddingClasses,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Container;
