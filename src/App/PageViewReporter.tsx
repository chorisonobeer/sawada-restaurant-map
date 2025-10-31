/** 
 * /src/App/PageViewReporter.tsx
 * 2025-10-31T12:40+09:00
 * 変更概要: 新規追加 - HashRouter遷移の手動ページビュー送信
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import Analytics from '../utils/analytics';

const PageViewReporter: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    const url = `${location.pathname}${location.search}`;
    Analytics.track('pageview', { url });
  }, [location.pathname, location.search]);

  return null;
};

export default PageViewReporter;