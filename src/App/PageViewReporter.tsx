/** 
 * /src/App/PageViewReporter.tsx
 * 2025-10-31T13:30+09:00
 * 変更概要: GA4向けの手動ページビュー送信（ハッシュ含む絶対URL）
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import Analytics from '../utils/analytics';

const PageViewReporter: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    const href = typeof window !== 'undefined' ? window.location.href : `${location.pathname}${location.search}${location.hash}`;
    Analytics.trackView(href);
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default PageViewReporter;