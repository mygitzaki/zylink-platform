import React from 'react';

/**
 * Enhanced Zylike-inspired Skeleton Loading Component
 * Beautiful animated placeholders with glassmorphism effects
 */
const Skeleton = ({ 
  className = '',
  variant = 'rectangle',
  width,
  height,
  animated = true,
  ...props 
}) => {
  const baseClasses = animated 
    ? 'bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse bg-[length:200%_100%] animate-shimmer'
    : 'bg-white/5';
  
  const variants = {
    rectangle: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
    button: 'rounded-xl h-12',
    card: 'rounded-2xl',
    metric: 'rounded-xl h-24',
    avatar: 'rounded-full w-10 h-10',
    icon: 'rounded-xl w-12 h-12'
  };
  
  const classes = [
    baseClasses,
    variants[variant] || variants.rectangle,
    className
  ].filter(Boolean).join(' ');
  
  const style = {
    width: width || undefined,
    height: height || undefined,
    ...props.style
  };
  
  return (
    <div 
      className={classes}
      style={style}
      {...props}
    />
  );
};

// Skeleton text lines
const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        variant="text" 
        className={i === lines - 1 ? 'w-3/4' : 'w-full'}
      />
    ))}
  </div>
);

// Skeleton metric card (Zylike style)
const SkeletonMetric = ({ className = '' }) => (
  <div className={`p-4 sm:p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 space-y-4 ${className}`}>
    <div className="flex items-center justify-between">
      <Skeleton variant="icon" />
      <Skeleton variant="text" className="w-16 h-6" />
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" className="w-24 h-3" />
      <Skeleton variant="text" className="w-20 h-8" />
      <Skeleton variant="text" className="w-32 h-3" />
    </div>
  </div>
);

// Skeleton navigation item
const SkeletonNavItem = ({ className = '' }) => (
  <div className={`flex items-center space-x-3 p-3 rounded-xl ${className}`}>
    <Skeleton variant="avatar" />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" className="w-20 h-4" />
      <Skeleton variant="text" className="w-16 h-3" />
    </div>
  </div>
);

// Skeleton general card
const SkeletonCard = ({ className = '' }) => (
  <div className={`p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 space-y-4 ${className}`}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="icon" />
      <div className="flex-1">
        <Skeleton variant="text" className="w-1/3 mb-2" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

// Skeleton link generator form
const SkeletonLinkForm = ({ className = '' }) => (
  <div className={`p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 space-y-6 ${className}`}>
    <div className="flex items-center space-x-3">
      <Skeleton variant="icon" />
      <div className="flex-1">
        <Skeleton variant="text" className="w-1/3 mb-2" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <Skeleton variant="text" className="flex-1 h-12" />
        <Skeleton variant="button" className="w-full sm:w-auto sm:min-w-[150px]" />
      </div>
    </div>
  </div>
);

// Skeleton analytics dashboard
const SkeletonDashboard = ({ className = '' }) => (
  <div className={`space-y-8 ${className}`}>
    {/* Header */}
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Skeleton variant="icon" />
        <div className="flex-1">
          <Skeleton variant="text" className="w-1/3 h-8 mb-2" />
          <Skeleton variant="text" className="w-1/2 h-4" />
        </div>
      </div>
    </div>
    
    {/* Metrics grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonMetric key={i} />
      ))}
    </div>
    
    {/* Content cards */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
);

Skeleton.Text = SkeletonText;
Skeleton.Card = SkeletonCard;
Skeleton.Metric = SkeletonMetric;
Skeleton.NavItem = SkeletonNavItem;
Skeleton.LinkForm = SkeletonLinkForm;
Skeleton.Dashboard = SkeletonDashboard;

export default Skeleton;
