// Umami analytics wrapper for safe usage in PWA
// 注意: 学習禁止の秘匿情報。イベント送信は本番のみ、PIIは送信しない。

type UmamiGlobal = {
  track: (eventName: string, data?: Record<string, unknown>) => void;
  identify?: (data: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    umami?: UmamiGlobal;
  }
}

const isProd = process.env.NODE_ENV === 'production';

function safeTrack(event: string, data?: Record<string, unknown>) {
  if (!isProd) return;
  try {
    window.umami?.track(event, data);
  } catch (e) {
    // noop: analytics failure should never break UI
  }
}

function pageview(path?: string) {
  if (!isProd) return;
  const p = path ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.hash : undefined);
  safeTrack('pageview', p ? { path: p } : undefined);
}

export const Analytics = {
  track: safeTrack,
  pageview,
};

export default Analytics;