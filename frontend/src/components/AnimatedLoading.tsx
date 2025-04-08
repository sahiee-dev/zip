import React from 'react';
import { LoadingSpinner, BounceAnimation } from './VectorAnimations';
import './AnimatedLoading.css';

interface AnimatedLoadingProps {
  type?: 'spinner' | 'bounce' | 'dots' | 'linear';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullscreen?: boolean;
  className?: string;
  color?: string;
}

const AnimatedLoading: React.FC<AnimatedLoadingProps> = ({
  type = 'spinner',
  size = 'md',
  text = 'Loading...',
  fullscreen = false,
  className = '',
  color
}) => {
  const containerClass = `animated-loading ${fullscreen ? 'fullscreen' : ''} ${className}`;
  
  const sizeMap = {
    sm: '24px',
    md: '40px',
    lg: '60px'
  };
  
  const colorValue = color || '#6366f1';
  const height = sizeMap[size];
  const width = type === 'linear' ? '100px' : height;
  
  const renderLoadingIndicator = () => {
    switch (type) {
      case 'spinner':
        return <LoadingSpinner width={width} height={height} color={colorValue} />;
      case 'bounce':
        return <BounceAnimation width={width} height={height} color={colorValue} />;
      case 'dots':
        return (
          <div className="loading-dots" style={{ '--dot-color': colorValue } as React.CSSProperties}>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        );
      case 'linear':
        return (
          <div className="loading-linear" style={{ 
            '--bar-color': colorValue,
            width 
          } as React.CSSProperties}>
            <div className="bar"></div>
          </div>
        );
      default:
        return <LoadingSpinner width={width} height={height} color={colorValue} />;
    }
  };

  return (
    <div className={containerClass}>
      <div className="animated-loading-content">
        {renderLoadingIndicator()}
        {text && <p className="loading-text">{text}</p>}
      </div>
    </div>
  );
};

export default AnimatedLoading; 