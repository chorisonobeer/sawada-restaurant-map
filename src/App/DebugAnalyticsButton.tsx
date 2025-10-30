import React, { useCallback, useMemo, useState } from 'react';
import Analytics from '../utils/analytics';
import './DebugAnalyticsButton.scss';

const getMode = (): 'pwa' | 'browser' => {
  try {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
      if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'pwa';
      // iOS Safari PWA
      if ((window.navigator as any).standalone === true) return 'pwa';
    }
  } catch {}
  return 'browser';
};

const currentRoute = (): string => {
  if (typeof window === 'undefined') return '/';
  
  // HashRouter: extract actual route from hash
  const hash = window.location.hash;
  if (hash && hash.startsWith('#/')) {
    // Extract route from hash: "#/list" -> "/list"
    const route = hash.substring(1);
    return route + window.location.search;
  }
  
  // Fallback for non-hash routes or root
  return window.location.pathname + window.location.search || '/';
};

const DebugAnalyticsButton: React.FC = () => {
  const [sending, setSending] = useState(false);
  const mode = useMemo(getMode, []);

  const handleClick = useCallback(async () => {
    if (sending) return;
    setSending(true);
    const route = currentRoute();
    try {
      console.log('[Umami Debug] Fire manual event & pageview', { mode, route });
      Analytics.track('debug_fire', { mode, route, ts: Date.now() });
      Analytics.trackView(route);
    } finally {
      // 軽いクールダウンで誤連打抑制
      setTimeout(() => setSending(false), 600);
    }
  }, [sending, mode]);

  return (
    <button 
      className={`debug-analytics-button${sending ? ' sending' : ''}`}
      onClick={handleClick}
      aria-label="計測を送信（デバッグ）"
      title="現在ページをUmamiに手動で送信します"
    >
      {sending ? '送信中…' : '計測を送信（デバッグ）'}
    </button>
  );
};

export default DebugAnalyticsButton;