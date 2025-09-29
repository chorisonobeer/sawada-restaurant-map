/** 
 * /src/App/LoadingSpinner.tsx
 * 2025-01-09T15:30+09:00
 * 変更概要: 新規追加 - グラフィカルなローディングスピナーコンポーネント
 */

import React from 'react';
import './LoadingSpinner.scss';

interface LoadingSpinnerProps {
  variant?: 'circular' | 'dots' | 'wave' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'circular',
  size = 'md',
  text = '読み込み中...',
  className = ''
}) => {
  const renderSpinner = () => {
    switch (variant) {
      case 'circular':
        return (
          <div className={`spinner-circular spinner-${size}`}>
            <div className="spinner-ring"></div>
          </div>
        );
      
      case 'dots':
        return (
          <div className={`spinner-dots spinner-${size}`}>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        );
      
      case 'wave':
        return (
          <div className={`spinner-wave spinner-${size}`}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`spinner-pulse spinner-${size}`}>
            <div className="pulse-ring"></div>
          </div>
        );
      
      default:
        return (
          <div className={`spinner-circular spinner-${size}`}>
            <div className="spinner-ring"></div>
          </div>
        );
    }
  };

  return (
    <div className={`loading-container ${className}`} role="status" aria-label="読み込み中">
      {renderSpinner()}
      {text && <div className="loading-text">{text}</div>}
      <span className="sr-only">{text}</span>
    </div>
  );
};

export default LoadingSpinner;