/** 
 * /src/App/PWAInstallBanner.tsx
 * 2025-01-26T10:00+09:00
 * 変更概要: 新規追加 - PWAインストール促進バナーコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, modalTransition } from '../lib/animations/presets';
import PWAInstallManager from '../utils/PWAInstallManager';
import './PWAInstallBanner.scss';

interface PWAInstallBannerProps {
  onClose?: () => void;
}

const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [installManager] = useState(() => PWAInstallManager.getInstance());

  useEffect(() => {
    // バナーを表示すべきかチェック
    const checkShouldShow = () => {
      if (installManager.shouldShowBanner()) {
        setIsVisible(true);
        // 少し遅延してアニメーションを開始
        setTimeout(() => setIsAnimating(true), 100);
      }
    };

    // 初回チェック
    checkShouldShow();

    // beforeinstallpromptイベントを待機してから再チェック
    const handleBeforeInstallPrompt = () => {
      setTimeout(checkShouldShow, 500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [installManager]);

  const handleInstall = async () => {
    const success = await installManager.showInstallPrompt();
    
    if (success) {
      // インストール成功時はバナーを非表示
      handleClose();
    } else {
      // インストール失敗時もバナーを非表示（24時間後に再表示）
      handleClose();
    }
  };

  const handleDismiss = () => {
    installManager.dismissBanner();
    handleClose();
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300); // アニメーション時間と合わせる
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    // バナー自体をクリックした場合は閉じない
    if (event.target === event.currentTarget) {
      handleDismiss();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`pwa-install-banner-backdrop ${isAnimating ? 'visible' : ''}`}
          onClick={handleBackdropClick}
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            className={`pwa-install-banner ${isAnimating ? 'slide-in' : ''}`}
            variants={modalTransition}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">
            <img 
              src="/manifest-icon-192.maskable.png" 
              alt="アプリアイコン" 
              className="app-icon"
            />
          </div>
          
          <div className="pwa-banner-text">
            <h3 className="pwa-banner-title">アプリをインストール</h3>
            <p className="pwa-banner-description">
              ホーム画面に追加して、より快適にご利用いただけます
            </p>
          </div>
          
          <div className="pwa-banner-actions">
            <button 
              className="pwa-btn pwa-btn-primary"
              onClick={handleInstall}
              aria-label="アプリをインストール"
            >
              インストール
            </button>
            <button 
              className="pwa-btn pwa-btn-secondary"
              onClick={handleDismiss}
              aria-label="後で"
            >
              後で
            </button>
          </div>
          
          <button 
            className="pwa-banner-close"
            onClick={handleDismiss}
            aria-label="閉じる"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;