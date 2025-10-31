/** 
 * /src/Container.tsx
 * 2025-10-31T10:00+09:00
 * 変更概要: Umami自動追跡へ移行し、手動ページビュー送信を削除
 */
import React from "react";

import App from './App'
import About from './About'
import PWAInstallBanner from './App/PWAInstallBanner'
import './Container.scss'

function Content() {

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
