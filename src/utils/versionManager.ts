/**
 * バージョン管理システム
 * アプリケーションの自動更新とキャッシュクリアを管理
 */

interface VersionInfo {
  version: string;
  timestamp: number;
  buildDate: string;
  hash?: string;
  last_updated?: string;
}

interface StoredVersionInfo {
  version: string;
  timestamp: number;
  lastChecked: number;
}

class VersionManager {
  private static instance: VersionManager;
  private currentVersion: VersionInfo | null = null;
  private checkInterval: number = 5 * 60 * 1000; // 5分間隔でチェック
  private forceUpdateCallback?: () => void;
  private intervalId: number | undefined;
  private isInitialized: boolean = false;
  private isChecking: boolean = false;
  private lastCheckTime: number = 0;
  private readonly minCheckInterval: number = 5 * 60 * 1000; // 最小チェック間隔（5分）

  private constructor() { }

  static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }

  /**
   * バージョン管理システムを初期化
   */
  async initialize(forceUpdateCallback?: () => void): Promise<void> {
    // 開発環境では無効化（HMRとの競合を防ぐ）
    if (import.meta.env.DEV) {
      console.log('🔧 Development mode: Version Manager disabled to prevent HMR conflicts');
      return;
    }

    // 重複実行防止
    if (this.isInitialized) {
      console.warn('⚠️ VersionManager already initialized, skipping...');
      return;
    }

    this.forceUpdateCallback = forceUpdateCallback;
    this.isInitialized = true;

    console.log('🔄 Version Manager initializing...');

    // 現在のバージョン情報を取得
    await this.loadCurrentVersion();

    // 即座にバージョンチェックを実行
    await this.checkForUpdates();

    // 定期的なバージョンチェックを開始
    this.startPeriodicCheck();

    console.log('✅ Version Manager initialized');
  }

  /**
   * 現在のバージョン情報を読み込み
   */
  private async loadCurrentVersion(): Promise<void> {
    try {
      // 環境変数から現在のビルド情報を取得
      const buildVersion = import.meta.env.VITE_BUILD_VERSION;
      const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP;
      const buildDate = import.meta.env.VITE_BUILD_DATE;

      if (buildVersion && buildTimestamp && buildDate) {
        this.currentVersion = {
          version: buildVersion,
          timestamp: parseInt(buildTimestamp),
          buildDate: buildDate
        };
        console.log('📦 Current version loaded:', this.currentVersion.version);
      } else {
        console.warn('⚠️ Build version info not found in environment variables');
      }
    } catch (error) {
      console.error('❌ Error loading current version:', error);
    }
  }

  /**
   * サーバーから最新のバージョン情報をチェック
   */
  async checkForUpdates(): Promise<boolean> {
    // 既にチェック中ならスキップ
    if (this.isChecking) {
      console.log('⏭️ Update check already in progress, skipping...');
      return false;
    }

    // 最小間隔をチェック
    const now = Date.now();
    if (now - this.lastCheckTime < this.minCheckInterval) {
      console.log('⏭️ Update check too soon, skipping...');
      return false;
    }

    this.isChecking = true;
    this.lastCheckTime = now;

    try {
      console.log('🔍 Checking for updates...');

      // キャッシュを回避してversion.jsonを取得
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        console.warn('⚠️ Could not fetch version info from server');
        return false;
      }

      const serverVersion: VersionInfo = await response.json();
      console.log('🌐 Server version:', serverVersion.version);
      console.log('💻 Current version:', this.currentVersion?.version || 'unknown');

      // バージョン比較
      if (this.isUpdateAvailable(serverVersion)) {
        console.log('🆕 New version available!');
        await this.handleUpdate(serverVersion);
        return true;
      } else {
        console.log('✅ App is up to date');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * アップデートが利用可能かチェック
   */
  private isUpdateAvailable(serverVersion: VersionInfo): boolean {
    if (!this.currentVersion) {
      // 現在バージョンが不明な場合は更新扱いにしない（安全側）
      return false;
    }

    // タイムスタンプが新しい場合は更新
    if (serverVersion.timestamp > this.currentVersion.timestamp) {
      return true;
    }

    // タイムスタンプが同じ場合、ハッシュ値が異なる場合は更新
    if (serverVersion.timestamp === this.currentVersion.timestamp &&
      serverVersion.hash && this.currentVersion.hash &&
      serverVersion.hash !== this.currentVersion.hash) {
      return true;
    }

    return false;
  }

  /**
   * アップデートを処理
   */
  private async handleUpdate(newVersion: VersionInfo): Promise<void> {
    console.log('🔄 Handling update...');

    // Service Workerを更新（ユーザー承認時まで待機）
    await this.updateServiceWorker();

    // バージョン情報を保存
    this.saveVersionInfo(newVersion);

    // コールバックを呼び出して更新通知イベントを発火（自動リロードは行わない）
    if (this.forceUpdateCallback) {
      console.log('📢 Triggering update notification callback');
      this.forceUpdateCallback();
    } else {
      console.warn('⚠️ No update callback registered, dispatching app-version-updated event directly');
      try {
        window.dispatchEvent(new CustomEvent('app-version-updated'));
      } catch (e) {
        console.error('❌ Error dispatching app-version-updated event:', e);
      }
    }
  }

  /**
   * 全てのキャッシュをクリア
   */
  private async clearAllCaches(): Promise<void> {
    try {
      console.log('🧹 Skipping destructive cache clear (non-destructive policy)');
      // 破壊的なキャッシュ削除は廃止
      // 旧キャッシュの整理はService Worker側のバージョニングで管理
    } catch (error) {
      console.error('❌ Error in cache management:', error);
    }
  }

  /**
   * ローカルデータをクリア
   */
  private clearLocalData(): void {
    try {
      console.log('🧹 Skipping local data clear (non-destructive policy)');
      // データ削除は行わない（常に表示を維持する）
    } catch (error) {
      console.error('❌ Error clearing local data:', error);
    }
  }

  /**
   * Service Workerを更新チェック（ユーザー承認まで待機）
   */
  private async updateServiceWorker(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // 更新をチェック（新しいService Workerがあればwaiting状態になる）
          await registration.update();
          if (registration.waiting) {
            console.log('⏳ New Service Worker is waiting for user approval');
            // SKIP_WAITINGは送信しない（ユーザーが更新ボタンを押した時のみ送信）
          } else {
            console.log('🔄 Service Worker update check completed');
          }
        } else {
          console.log('ℹ️ No Service Worker registration found');
        }
      }
    } catch (error) {
      console.error('❌ Error updating Service Worker:', error);
    }
  }

  /**
   * ユーザーが更新を承認した時に呼び出す（Service WorkerのSKIP_WAITINGを送信）
   */
  async applyUpdate(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          console.log('✅ User approved update, sending SKIP_WAITING to Service Worker');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch (error) {
      console.error('❌ Error applying update:', error);
    }
  }

  /**
   * バージョン情報を保存
   */
  private saveVersionInfo(versionInfo: VersionInfo): void {
    try {
      const storedInfo: StoredVersionInfo = {
        version: versionInfo.version,
        timestamp: versionInfo.timestamp,
        lastChecked: Date.now()
      };

      localStorage.setItem('app_version_info', JSON.stringify(storedInfo));
      console.log('💾 Version info saved');
    } catch (error) {
      console.error('❌ Error saving version info:', error);
    }
  }

  /**
   * アプリケーションをリロード（ユーザー承認後に呼び出される）
   */
  reload(): void {
    console.log('🔄 Reloading application...');
    window.location.reload();
  }

  /**
   * 定期的なバージョンチェックを開始
   */
  private startPeriodicCheck(): void {
    // 既存のタイマーをクリア（重複実行防止）
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('🧹 Cleared existing periodic check timer');
    }

    this.intervalId = window.setInterval(async () => {
      console.log('⏰ Periodic version check...');
      await this.checkForUpdates();
    }, this.checkInterval);
  }

  /**
   * リソースをクリーンアップ（HMR対応）
   */
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('🧹 VersionManager: Periodic check timer cleared');
    }
    this.isInitialized = false;
    this.isChecking = false;
  }

  /**
   * 現在のバージョン情報を取得
   */
  getCurrentVersion(): VersionInfo | null {
    return this.currentVersion;
  }

  /**
   * 手動でアップデートチェックを実行
   */
  async manualUpdateCheck(): Promise<boolean> {
    console.log('🔄 Manual update check triggered');
    return await this.checkForUpdates();
  }
}

export default VersionManager;
