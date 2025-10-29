/**
 * UpdateNotifier
 * sw-update-available / app-version-updated を集約し、
 * デバウンスと重複ガードにより「最新のみ」を1回だけ通知する。
 */

class UpdateNotifier {
  private static instance: UpdateNotifier;
  private debounceTimer: number | undefined;
  private latestTimestampSeen: number | undefined;
  private readonly debounceMs = 300;
  private readonly storageKey = 'last_notified_timestamp';

  static getInstance(): UpdateNotifier {
    if (!UpdateNotifier.instance) {
      UpdateNotifier.instance = new UpdateNotifier();
    }
    return UpdateNotifier.instance;
  }

  init(): void {
    window.addEventListener('sw-update-available', this.onUpdateEvent);
    window.addEventListener('app-version-updated', this.onUpdateEvent);
  }

  private onUpdateEvent = (_e: Event) => {
    // デバウンスしてまとめる
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer as any);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.evaluateAndNotify().catch((err) => console.warn('UpdateNotifier evaluate error:', err));
    }, this.debounceMs);
  };

  private async evaluateAndNotify(): Promise<void> {
    // リロード中は通知抑止
    if ((window as any).__pendingReload) return;

    const serverTs = await this.getLatestServerTimestamp();
    if (!serverTs) return;

    const lastNotified = this.getLastNotifiedTimestamp();

    // 新しいタイムスタンプのみ通知
    if (lastNotified && serverTs <= lastNotified) {
      return; // 既に新しいもので通知済み
    }

    // 既にトーストが表示中なら、文言だけ更新し、lastNotifiedTimestamp を更新
    const existing = document.getElementById('update-toast');
    if (existing) {
      const title = existing.querySelector('.toast-title');
      const desc = existing.querySelector('.toast-desc');
      if (title) title.textContent = 'より新しい更新が到着しました';
      if (desc) desc.textContent = '最新バージョンの適用をおすすめします';
      this.setLastNotifiedTimestamp(serverTs);
      return;
    }

    // 可視フラグにより同セッション重複表示を防止
    if ((window as any).__updateToastVisible) {
      // 表示中の場合も最後に通知済み記録だけ更新
      this.setLastNotifiedTimestamp(serverTs);
      return;
    }

    // トースト表示を実行
    if (typeof (window as any).__showUpdateToast === 'function') {
      (window as any).__showUpdateToast();
      this.setLastNotifiedTimestamp(serverTs);
    }
  }

  private getLastNotifiedTimestamp(): number | undefined {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? parseInt(raw, 10) : undefined;
    } catch {
      return undefined;
    }
  }

  private setLastNotifiedTimestamp(ts: number): void {
    try {
      localStorage.setItem(this.storageKey, String(ts));
    } catch {}
  }

  private async getLatestServerTimestamp(): Promise<number | undefined> {
    // VersionManager が保存した app_version_info を優先
    try {
      const raw = localStorage.getItem('app_version_info');
      if (raw) {
        const info = JSON.parse(raw) as { timestamp?: number };
        if (info && typeof info.timestamp === 'number') {
          return info.timestamp;
        }
      }
    } catch {}

    // フォールバック: 直接 version.json を取得
    try {
      const resp = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!resp.ok) return undefined;
      const json = await resp.json();
      return typeof json.timestamp === 'number' ? json.timestamp : undefined;
    } catch {
      return undefined;
    }
  }
}

export default UpdateNotifier;