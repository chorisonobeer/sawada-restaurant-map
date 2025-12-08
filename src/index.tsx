/* 
 * /src/index.tsx
 * 2025-10-31T12:40+09:00
 * 変更概要: HashRouter直下にPageViewReporterを配線して手動ページビュー送信を有効化
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from "react-router-dom";
import Container from './Container';
import './index.scss'
import './global-pull-refresh-disable.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import VersionManager from './utils/versionManager';
import UpdateNotifier from './utils/UpdateNotifier';
import PageViewReporter from './App/PageViewReporter';

// バージョン管理システムを初期化
const versionManager = VersionManager.getInstance();

// クリーンアップ関数を保存（HMR対応）
let cleanupFunctions: Array<() => void> = [];
let loadHandlerRegistered = false;

ReactDOM.render(
  <React.StrictMode>
    <HashRouter>
      <PageViewReporter />
      <Container />
    </HashRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// Service Worker登録時のコールバック（非強制化）
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    console.log('🆕 Service Worker update detected (non-forced)');
    try {
      window.dispatchEvent(new CustomEvent('sw-update-available', { detail: registration }));
    } catch (e) {
      // ignore
    }
  },
  onSuccess: (registration) => {
    console.log('✅ Service Worker registered successfully');
  }
});

// バージョン管理システムを初期化（DOM読み込み完了後）
// 重複登録防止
if (!loadHandlerRegistered) {
  loadHandlerRegistered = true;
  const loadHandler = async () => {
    try {
      // 開発環境では無効化
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Version Manager initialization skipped');
        if (process.env.NODE_ENV === 'development') {
          (window as any).checkForUpdates = () => versionManager.manualUpdateCheck();
          console.log('🔧 Debug: Use checkForUpdates() to manually check for updates');
        }
        return;
      }

      console.log('🚀 Initializing Version Manager...');
      await versionManager.initialize(() => {
        // 強制リロードは行わず、更新通知のみ
        try {
          window.dispatchEvent(new CustomEvent('app-version-updated'));
        } catch (e) {}
      });

      const currentVersion = versionManager.getCurrentVersion();
      if (currentVersion) {
        console.log('📦 App Version:', currentVersion.version);
        console.log('📅 Build Date:', currentVersion.buildDate);
      }
    } catch (error) {
      console.error('❌ Error initializing Version Manager:', error);
    }
  };
  
  window.addEventListener('load', loadHandler);
  cleanupFunctions.push(() => {
    window.removeEventListener('load', loadHandler);
    loadHandlerRegistered = false;
  });
}

// 軽いデバウンスで更新チェック（1.5秒）
let updateCheckTimer: number | undefined;
const debounceUpdateCheck = () => {
  if (updateCheckTimer) {
    clearTimeout(updateCheckTimer as any);
  }
  updateCheckTimer = window.setTimeout(() => {
    versionManager.checkForUpdates().catch(error => {
      console.warn('⚠️ Update check failed:', error);
    });
  }, 1500);
};

// ページの可視性が変更された時にバージョンチェック（非破壊、デバウンス）
// 開発環境では無効化
if (process.env.NODE_ENV !== 'development') {
  const visibilityHandler = () => {
    if (!document.hidden) {
      console.log('👁️ Page became visible, debounced update check...');
      debounceUpdateCheck();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  cleanupFunctions.push(() => document.removeEventListener('visibilitychange', visibilityHandler));

  // ネットワーク接続が復旧した時にバージョンチェック（非破壊、デバウンス）
  const onlineHandler = () => {
    console.log('🌐 Network connection restored, debounced update check...');
    debounceUpdateCheck();
  };
  window.addEventListener('online', onlineHandler);
  cleanupFunctions.push(() => window.removeEventListener('online', onlineHandler));
}

// 非侵襲な更新通知トースト（モダン・フローティング型）
function showUpdateToast() {
  if (document.getElementById('update-toast')) return;

  // スタイルを一度だけ注入
  if (!document.getElementById('update-toast-style')) {
    const style = document.createElement('style');
    style.id = 'update-toast-style';
    style.textContent = `
      .version-update-toast {
        position: fixed;
        left: 50%;
        bottom: 20px;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: #fff;
        padding: 18px 20px;
        border-radius: 16px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        z-index: 9999;
        width: calc(100% - 32px);
        max-width: 480px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        opacity: 0;
        transform-origin: bottom center;
      }
      .version-update-toast.show {
        animation: toastIn 0.3s ease-out forwards;
      }
      .version-update-toast.hide {
        animation: toastOut 0.2s ease-out forwards;
      }
      .version-update-toast .toast-title {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 6px;
      }
      .version-update-toast .toast-desc {
        font-size: 14px;
        font-weight: 400;
        color: rgba(255,255,255,0.85);
        margin-bottom: 12px;
      }
      .version-update-toast .toast-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
      }
      .version-update-toast .btn {
        height: 42px;
        padding: 0 16px;
        border-radius: 14px;
        border: 1px solid transparent;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: transform 0.1s ease, opacity 0.2s ease, background-color 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      .version-update-toast .btn:focus-visible {
        outline: 2px solid rgba(255,255,255,0.7);
        outline-offset: 2px;
      }
      .version-update-toast .btn-primary {
        background: var(--app-primary, #4CAF50);
        color: #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
      .version-update-toast .btn-primary:active { transform: translateY(1px); }
      .version-update-toast .btn-secondary {
        background: transparent;
        color: #999;
        border-color: rgba(255,255,255,0.3);
      }
      .version-update-toast .btn-secondary:active { transform: translateY(1px); }
      .version-update-toast .btn .ripple {
        position: absolute;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        width: 10px;
        height: 10px;
        background: rgba(255,255,255,0.5);
        animation: ripple 0.4s ease-out;
        opacity: 0.9;
      }
      @keyframes ripple {
        from { width: 0; height: 0; opacity: 0.8; }
        to { width: 200px; height: 200px; opacity: 0; }
      }
      @keyframes toastIn {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes toastOut {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, 10px); }
      }
      @media (prefers-reduced-motion: reduce) {
        .version-update-toast.show, .version-update-toast.hide {
          animation: none;
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const toast = document.createElement('div');
  toast.id = 'update-toast';
  toast.className = 'version-update-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const title = document.createElement('div');
  title.className = 'toast-title';
  title.textContent = '新しいバージョンがあります';

  const desc = document.createElement('div');
  desc.className = 'toast-desc';
  desc.textContent = 'より快適に使えるようになります';

  const actions = document.createElement('div');
  actions.className = 'toast-actions';

  const btnUpdate = document.createElement('button');
  btnUpdate.className = 'btn btn-primary';
  btnUpdate.textContent = '今すぐ更新';

  const btnLater = document.createElement('button');
  btnLater.className = 'btn btn-secondary';
  btnLater.textContent = 'あとで';

  // リップル演出（軽め）
  const addRipple = (e: MouseEvent, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  };

  btnUpdate.addEventListener('click', async (e) => {
    addRipple(e, btnUpdate);
    try {
      (window as any).__pendingReload = true;
      
      // Service Workerの更新を適用（SKIP_WAITINGを送信）
      await versionManager.applyUpdate();
      
      // トーストを非表示にする（アニメーション開始）
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 200);
      
      // 少し待ってからリロード（Service Workerが有効化される時間を確保）
      // フラグはリロード実行直前でクリア（レースコンディションを防ぐ）
      setTimeout(() => {
        (window as any).__updateToastVisible = false;
        versionManager.reload();
      }, 300);
    } catch (error) {
      console.error('❌ Error applying update:', error);
      // トーストを非表示にする（アニメーション開始）
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 200);
      
      // エラーが発生した場合でもリロードを試みる
      // フラグはリロード実行直前でクリア（レースコンディションを防ぐ）
      setTimeout(() => {
      (window as any).__updateToastVisible = false;
        versionManager.reload();
      }, 300);
    }
  });

  btnLater.addEventListener('click', (e) => {
    addRipple(e, btnLater);
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 200);
    (window as any).__updateToastVisible = false;
  });

  actions.appendChild(btnUpdate);
  actions.appendChild(btnLater);
  toast.appendChild(title);
  toast.appendChild(desc);
  toast.appendChild(actions);
  document.body.appendChild(toast);

  // 表示アニメーション
  requestAnimationFrame(() => toast.classList.add('show'));
  (window as any).__updateToastVisible = true;
}

// グローバル公開して、UpdateNotifierから呼べるようにする
(window as any).__showUpdateToast = showUpdateToast;

// 更新通知の集約と重複ガードを初期化（開発環境では無効化）
if (process.env.NODE_ENV !== 'development') {
  UpdateNotifier.getInstance().init();
}

// HMR対応: モジュール再読み込み時にクリーンアップ
if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.dispose(() => {
    console.log('🧹 HMR: Cleaning up event listeners and timers...');
    // クリーンアップ関数を実行
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
      }
    });
    cleanupFunctions = [];
    
    // VersionManagerとUpdateNotifierのクリーンアップ
    try {
      versionManager.destroy?.();
    } catch (error) {
      console.error('❌ Error destroying VersionManager:', error);
    }
    
    try {
      UpdateNotifier.getInstance().destroy?.();
    } catch (error) {
      console.error('❌ Error destroying UpdateNotifier:', error);
    }
    
    // ServiceWorkerRegistrationのクリーンアップ
    try {
      serviceWorkerRegistration.cleanup?.();
    } catch (error) {
      console.error('❌ Error cleaning up ServiceWorkerRegistration:', error);
    }
    
    // タイマーをクリア
    if (updateCheckTimer) {
      clearTimeout(updateCheckTimer);
      updateCheckTimer = undefined;
    }
  });
}
