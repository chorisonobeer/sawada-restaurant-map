/**
 * バージョン管理システム
 * アプリケーションの自動更新とキャッシュクリアを管理
 */

interface VersionInfo {
  version: string;
  timestamp: number;
  buildDate: string;
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

  private constructor() {}

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
    this.forceUpdateCallback = forceUpdateCallback;
    
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
      const buildVersion = process.env.REACT_APP_BUILD_VERSION;
      const buildTimestamp = process.env.REACT_APP_BUILD_TIMESTAMP;
      const buildDate = process.env.REACT_APP_BUILD_DATE;

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

    return serverVersion.timestamp > this.currentVersion.timestamp;
  }

  /**
   * アップデートを処理
   */
  private async handleUpdate(newVersion: VersionInfo): Promise<void> {
    console.log('🔄 Handling update (non-destructive)...');
    
    // 非破壊: キャッシュやローカルデータの削除は行わない
    // await this.clearAllCaches(); // disabled
    // this.clearLocalData(); // disabled
    
    // Service Workerを更新（skipWaiting/clientsClaimはSW側で対応）
    await this.updateServiceWorker();
    
    // バージョン情報を保存
    this.saveVersionInfo(newVersion);
    
    // 強制リロードは行わず、コールバックがあれば通知のみ
    if (this.forceUpdateCallback) {
      this.forceUpdateCallback();
    } else {
      console.log('✅ Update applied. Waiting for user-initiated reload.');
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
   * Service Workerを強制更新
   */
  private async updateServiceWorker(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        for (const registration of registrations) {
          // 新しいService Workerをチェック
          await registration.update();
          
          // 待機中のService Workerがあれば即座に有効化
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
        
        console.log('🔄 Service Worker updated');
      }
    } catch (error) {
      console.error('❌ Error updating Service Worker:', error);
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
   * 強制リロード
   */
  private forceReload(): void {
    console.log('🔄 Force reloading application...');
    
    // 少し遅延を入れてからリロード（ログ出力のため）
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  /**
   * 定期的なバージョンチェックを開始
   */
  private startPeriodicCheck(): void {
    setInterval(async () => {
      console.log('⏰ Periodic version check...');
      await this.checkForUpdates();
    }, this.checkInterval);
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
