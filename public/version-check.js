// バージョンチェック用スクリプト
(function() {
  'use strict';
  
  // 固定バージョン番号を使用（アプリ更新時に手動で変更）
  const currentVersion = '1.0.0';
  const versionKey = 'app_version';
  const lastVersion = localStorage.getItem(versionKey);
  
  // バージョンが変更されている場合、キャッシュをクリア
  if (lastVersion && lastVersion !== currentVersion.toString()) {
    console.log('New version detected, clearing cache...');
    
    // Service Workerのキャッシュをクリア
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // ブラウザキャッシュをクリア
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    
    // ローカルストレージの一部をクリア（必要に応じて）
    localStorage.removeItem('eventListCache');
    sessionStorage.clear();
    
    // 新しいバージョンを保存
    localStorage.setItem(versionKey, currentVersion.toString());
    
    // ページをリロード
    window.location.reload(true);
  } else if (!lastVersion) {
    // 初回訪問時
    localStorage.setItem(versionKey, currentVersion.toString());
  }
})();