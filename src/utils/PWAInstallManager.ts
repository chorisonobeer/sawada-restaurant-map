/** 
 * /src/utils/PWAInstallManager.ts
 * 2025-01-26T10:00+09:00
 * 変更概要: 新規追加 - PWAインストール促進バナーの表示制御管理
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export class PWAInstallManager {
  private static instance: PWAInstallManager;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly STORAGE_KEY = 'pwa-install-banner';
  private readonly DISPLAY_INTERVAL = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): PWAInstallManager {
    if (!PWAInstallManager.instance) {
      PWAInstallManager.instance = new PWAInstallManager();
    }
    return PWAInstallManager.instance;
  }

  /**
   * PWAインストールバナーを表示すべきかどうかを判定
   */
  public shouldShowBanner(): boolean {
    // PWAモードで起動している場合は表示しない
    if (this.isPWAMode()) {
      return false;
    }

    // beforeinstallpromptイベントが利用可能でない場合は表示しない
    if (!this.deferredPrompt) {
      return false;
    }

    // 24時間以内に表示済みの場合は表示しない
    if (this.isRecentlyShown()) {
      return false;
    }

    return true;
  }

  /**
   * PWAモードで起動しているかどうかを判定
   */
  private isPWAMode(): boolean {
    // スタンドアロンモードの判定
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // iOS Safariのスタンドアロンモード判定
    if ((window.navigator as any).standalone === true) {
      return true;
    }

    // Android Chrome PWAの判定
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return true;
    }

    return false;
  }

  /**
   * 24時間以内に表示済みかどうかを判定
   */
  private isRecentlyShown(): boolean {
    try {
      const lastShown = localStorage.getItem(this.STORAGE_KEY);
      if (!lastShown) {
        return false;
      }

      const lastShownTime = parseInt(lastShown, 10);
      const now = Date.now();
      
      return (now - lastShownTime) < this.DISPLAY_INTERVAL;
    } catch (error) {
      console.warn('PWAInstallManager: localStorage access failed', error);
      return false;
    }
  }

  /**
   * バナー表示時刻を記録
   */
  public markAsShown(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, Date.now().toString());
    } catch (error) {
      console.warn('PWAInstallManager: Failed to save banner display time', error);
    }
  }

  /**
   * PWAインストールプロンプトを表示
   */
  public async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      // インストールプロンプトを表示
      await this.deferredPrompt.prompt();
      
      // ユーザーの選択を待機
      const choiceResult = await this.deferredPrompt.userChoice;
      
      // プロンプトを使用済みとしてクリア
      this.deferredPrompt = null;
      
      // インストールが受け入れられた場合
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installation accepted');
        return true;
      } else {
        console.log('PWA installation dismissed');
        // 拒否された場合も表示時刻を記録（24時間後に再表示）
        this.markAsShown();
        return false;
      }
    } catch (error) {
      console.error('PWA installation prompt failed:', error);
      this.deferredPrompt = null;
      return false;
    }
  }

  /**
   * バナーを後で表示するために非表示にする
   */
  public dismissBanner(): void {
    this.markAsShown();
  }

  /**
   * beforeinstallpromptイベントのリスナーを設定
   */
  private setupEventListeners(): void {
    window.addEventListener('beforeinstallprompt', (event: BeforeInstallPromptEvent) => {
      // デフォルトのインストールプロンプトを防止
      event.preventDefault();
      
      // イベントを保存して後で使用
      this.deferredPrompt = event;
      
      console.log('PWA install prompt available');
    });

    // PWAがインストールされた後の処理
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.deferredPrompt = null;
      
      // インストール完了時にバナー表示記録をクリア
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (error) {
        console.warn('PWAInstallManager: Failed to clear banner display record', error);
      }
    });
  }

  /**
   * デバッグ用：強制的にバナーを表示可能にする
   */
  public forceShowBanner(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('PWAInstallManager: Failed to clear banner display record', error);
    }
  }

  /**
   * PWAインストール可能かどうかを判定
   */
  public isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }
}

export default PWAInstallManager;