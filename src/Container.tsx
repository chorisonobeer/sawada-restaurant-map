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
    // HashRouter遷移時のページビュー送信（重複防止のため少し遅延）
    const timer = setTimeout(() => {
      Analytics.trackView();
    }, 50);
    
    return () => clearTimeout(timer);
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
