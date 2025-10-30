// Umami analytics wrapper for robust usage in PWA
// 注意: 学習禁止の秘匿情報。イベント送信は本番のみ、PIIは送信しない。

type UmamiGlobal = {
  track: (eventName: string, data?: Record<string, unknown>) => void;
  trackView?: (url?: string) => void;
  identify?: (data: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    umami?: UmamiGlobal;
  }
}

const isProd = process.env.NODE_ENV === 'production';

type QueueItem =
  | { type: 'track'; name: string; data?: Record<string, unknown>; ts: number }
  | { type: 'view'; url?: string; ts: number };

const queue: QueueItem[] = [];
let flushTimer: number | undefined;
let readinessTimer: number | undefined;
let lastViewKey: string | undefined;
let lastViewAt = 0;

function now() {
  return Date.now();
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

function isReady() {
  return isProd && typeof window !== 'undefined' && !!window.umami;
}

function currentUrl() {
  if (typeof window === 'undefined') return undefined;
  // Umami はデフォルトでハッシュを含めないため、HashRouterの実ルートを反映させる
  // 常に pathname + search + hash を返す（例: "/#/list?category=sushi"）
  return window.location.pathname + window.location.search + window.location.hash;
}

function sendTrack(name: string, data?: Record<string, unknown>) {
  try {
    window.umami?.track(name, data);
  } catch (e) {
    // swallow
  }
}

function sendView(url?: string) {
  try {
    const u = url ?? currentUrl();
    if (window.umami?.trackView) {
      window.umami.trackView(u);
    } else {
      // Fallback: 明示的に URL を渡す（v2では 'url' キーが正）
      window.umami?.track('pageview', u ? { url: u } : undefined);
    }
  } catch (e) {
    // swallow
  }
}

function flushQueue() {
  if (!isReady() || !isOnline()) return;
  while (queue.length) {
    const item = queue.shift()!;
    if (item.type === 'track') {
      sendTrack(item.name, item.data);
    } else {
      sendView(item.url);
    }
  }
}

function scheduleFlush(delay = 100) {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = window.setTimeout(() => {
    flushQueue();
  }, delay);
}

function ensureReadinessWatcher() {
  if (readinessTimer) return;
  readinessTimer = window.setInterval(() => {
    if (isReady()) {
      clearInterval(readinessTimer as any);
      readinessTimer = undefined;
      scheduleFlush(0);
    }
  }, 250);
}

function track(name: string, data?: Record<string, unknown>) {
  if (!isProd) return;
  if (!isReady() || !isOnline()) {
    queue.push({ type: 'track', name, data, ts: now() });
    ensureReadinessWatcher();
    return;
  }
  sendTrack(name, data);
}

function trackView(url?: string) {
  if (!isProd) return;
  const u = url ?? currentUrl();
  // simple dedupe within 750ms for same url
  const key = u || 'unknown';
  const t = now();
  if (lastViewKey === key && t - lastViewAt < 750) {
    return;
  }
  lastViewKey = key;
  lastViewAt = t;

  if (!isReady() || !isOnline()) {
    queue.push({ type: 'view', url: u, ts: t });
    ensureReadinessWatcher();
    return;
  }
  sendView(u);
}

// Auto-flush on connectivity and visibility changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => scheduleFlush(0));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleFlush(0);
  });
}

export const Analytics = {
  track,
  trackView,
  // Backward-compatible alias
  pageview: (path?: string) => trackView(path),
};

export default Analytics;