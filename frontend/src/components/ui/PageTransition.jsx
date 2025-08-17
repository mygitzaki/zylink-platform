import React from 'react';

/**
 * Page Transition Component for smooth page changes
 * Provides consistent animations across the application
 */
const PageTransition = ({ 
  children, 
  className = '',
  delay = 0,
  type = 'fadeIn'
}) => {
  const animationClasses = {
    fadeIn: 'animate-fadeIn',
    slideIn: 'animate-slideIn', 
    scaleIn: 'animate-scaleIn'
  };

  const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};

  return (
    <div 
      className={`${animationClasses[type]} ${className}`}
      style={delayStyle}
    >
      {children}
    </div>
  );
};

export default PageTransition;
