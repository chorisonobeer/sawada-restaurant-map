import React, { useEffect } from "react";
import { useLocation } from 'react-router-dom';
import Analytics from './utils/analytics';

import App from './App'
import About from './About'
import PWAInstallBanner from './App/PWAInstallBanner'
import './Container.scss'

function Content() {
  const location = useLocation();

  useEffect(() => {
    // 手動ページビュー送信（HashRouter対応、trackView 正統APIに統一）
    Analytics.trackView();
  }, [location.pathname, location.hash]);

  return (
    <div className="outer-container">
      <div className="inner-container">
        <About />
        <App />
      </div>
      <PWAInstallBanner />
    </div>
  );
}

export default Content;
