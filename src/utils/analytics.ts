/** 
 * /src/utils/analytics.ts
 * 2025-10-31T18:10+09:00
 * 変更概要: GA4タグ自動初期化ローダーを追加（env/グローバル両対応）
 */

// 注意: 本番環境のみ送信。PIIは送信しない。HashRouterの論理URLを優先します。

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __GA_MEASUREMENT_ID__?: string;
  }
}

const isProd = import.meta.env.PROD;

const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ||
  (typeof window !== 'undefined' ? (window.__GA_MEASUREMENT_ID__ as string | undefined) : undefined) ||
  undefined;

function initGAIfNeeded(): boolean {
  try {
    if (!isProd) return false;
    if (typeof window === 'undefined') return false;
    if (typeof window.gtag === 'function') return true; // already initialized
    if (!GA_MEASUREMENT_ID) return false;

    // Define dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer!.push(arguments as any);
    } as any;

    // Load GA4 library
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Init config (disable auto page_view for SPA)
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
    return true;
  } catch {
    return false;
  }
}

// Attempt initialization on module load
initGAIfNeeded();

function isReady() {
  return isProd && typeof window !== 'undefined' && typeof window.gtag === 'function';
}

function currentRoutePath(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const { location } = window;
  // HashRouter: "#/list" → "/list" を優先。無ければ pathname+search。
  const hash = location.hash || '';
  if (hash.startsWith('#/')) {
    const path = hash.substring(1); // remove leading '#'
    return path + (location.search || '');
  }
  const path = location.pathname + (location.search || '');
  return path || '/';
}

function track(name: string, data: Record<string, unknown> = {}): void {
  try {
    if (!isReady()) initGAIfNeeded();
    if (!isReady()) return;
    window.gtag!('event', name, data);
  } catch { }
}

function trackView(url?: string): void {
  try {
    if (!isReady()) initGAIfNeeded();
    if (!isReady()) return;
    const page_location = url || (typeof window !== 'undefined' ? window.location.href : undefined);
    const page_path = currentRoutePath();
    // GA4 推奨の page_view 手動送信
    window.gtag!('event', 'page_view', {
      page_location,
      page_path,
    });
  } catch { }
}

export const Analytics = {
  track,
  trackView,
  pageview: (path?: string) => trackView(path),
};

export default Analytics;