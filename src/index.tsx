import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from "react-router-dom";
import Container from './Container';
import './index.scss'
import './global-pull-refresh-disable.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import VersionManager from './utils/versionManager';

// バージョン管理システムを初期化
const versionManager = VersionManager.getInstance();



ReactDOM.render(
  <React.StrictMode>
    <HashRouter>
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
window.addEventListener('load', async () => {
  try {
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

    if (process.env.NODE_ENV === 'development') {
      (window as any).checkForUpdates = () => versionManager.manualUpdateCheck();
      console.log('🔧 Debug: Use checkForUpdates() to manually check for updates');
    }
  } catch (error) {
    console.error('❌ Error initializing Version Manager:', error);
  }
});

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
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('👁️ Page became visible, debounced update check...');
    debounceUpdateCheck();
  }
});

// ネットワーク接続が復旧した時にバージョンチェック（非破壊、デバウンス）
window.addEventListener('online', () => {
  console.log('🌐 Network connection restored, debounced update check...');
  debounceUpdateCheck();
});

// 非侵襲な更新通知トーストの最小実装
function showUpdateToast() {
  if (document.getElementById('update-toast')) return;
  const toast = document.createElement('div');
  toast.id = 'update-toast';
  toast.style.position = 'fixed';
  toast.style.left = '50%';
  toast.style.bottom = '16px';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = '#222';
  toast.style.color = '#fff';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  toast.style.zIndex = '9999';
  toast.style.fontSize = '14px';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '8px';

  const text = document.createElement('span');
  text.textContent = '新しいバージョンがあります。更新しますか？';

  const btnUpdate = document.createElement('button');
  btnUpdate.textContent = '今すぐ更新';
  btnUpdate.style.background = '#4CAF50';
  btnUpdate.style.color = '#fff';
  btnUpdate.style.border = 'none';
  btnUpdate.style.padding = '6px 10px';
  btnUpdate.style.borderRadius = '6px';
  btnUpdate.style.cursor = 'pointer';

  const btnClose = document.createElement('button');
  btnClose.textContent = '閉じる';
  btnClose.style.background = '#555';
  btnClose.style.color = '#fff';
  btnClose.style.border = 'none';
  btnClose.style.padding = '6px 10px';
  btnClose.style.borderRadius = '6px';
  btnClose.style.cursor = 'pointer';

  btnUpdate.addEventListener('click', () => {
    // ユーザー任意のリロードで更新を適用
    try {
      window.location.reload();
    } finally {
      document.body.removeChild(toast);
    }
  });

  btnClose.addEventListener('click', () => {
    document.body.removeChild(toast);
  });

  toast.appendChild(text);
  toast.appendChild(btnUpdate);
  toast.appendChild(btnClose);
  document.body.appendChild(toast);
}

window.addEventListener('sw-update-available', showUpdateToast as EventListener);
window.addEventListener('app-version-updated', showUpdateToast as EventListener);
