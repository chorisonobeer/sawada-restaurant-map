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

// アプリ終了時にイベントキャッシュを削除
window.addEventListener('beforeunload', () => {
  sessionStorage.removeItem('eventListCache');
});

// アプリケーション強制更新用のコールバック
const handleForceUpdate = () => {
  console.log('🔄 Force update triggered by Version Manager');
  
  // 少し遅延を入れてからリロード（ユーザーに更新を通知する時間を確保）
  setTimeout(() => {
    window.location.reload();
  }, 1000);
};

ReactDOM.render(
  <React.StrictMode>
    <HashRouter>
      <Container />
    </HashRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// Service Worker登録時に更新があれば即座に適用
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    console.log('🆕 Service Worker update detected');
    
    // 新しいService Workerが利用可能になったら即座に更新
    if (registration && registration.waiting) {
      console.log('🔄 Applying Service Worker update immediately');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // 少し待ってからリロード
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
    await versionManager.initialize(handleForceUpdate);
    
    // 現在のバージョン情報をコンソールに表示
    const currentVersion = versionManager.getCurrentVersion();
    if (currentVersion) {
      console.log('📦 App Version:', currentVersion.version);
      console.log('📅 Build Date:', currentVersion.buildDate);
    }
    
    // デバッグ用: 手動更新チェック機能をグローバルに公開
    if (process.env.NODE_ENV === 'development') {
      (window as any).checkForUpdates = () => versionManager.manualUpdateCheck();
      console.log('🔧 Debug: Use checkForUpdates() to manually check for updates');
    }
    
  } catch (error) {
    console.error('❌ Error initializing Version Manager:', error);
  }
});

// ページの可視性が変更された時（タブの切り替えなど）にバージョンチェック
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('👁️ Page became visible, checking for updates...');
    versionManager.checkForUpdates().catch(error => {
      console.warn('⚠️ Update check failed:', error);
    });
  }
});

// ネットワーク接続が復旧した時にバージョンチェック
window.addEventListener('online', () => {
  console.log('🌐 Network connection restored, checking for updates...');
  versionManager.checkForUpdates().catch(error => {
    console.warn('⚠️ Update check failed:', error);
  });
});
