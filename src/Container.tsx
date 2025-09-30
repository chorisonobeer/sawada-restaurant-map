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
