// バージョンチェック用スクリプト
(function() {
  'use strict';
  
  // 固定バージョン番号を使用（アプリ更新時に手動で変更）
  const currentVersion = '1.0.0';
  const versionKey = 'app_version';
  const lastVersion = localStorage.getItem(versionKey);
  
  // バージョンが変更されている場合、記録のみ（非破壊）
  if (lastVersion && lastVersion !== currentVersion.toString()) {
    console.log('🆕 New version detected. Recording without clearing caches or reloading.');

    // 新しいバージョンを保存（破壊的操作なし）
    localStorage.setItem(versionKey, currentVersion.toString());

    // クライアント側で利用できる軽量通知フラグを設定（任意表示用）
    try {
      window.__APP_VERSION_UPDATE__ = { previous: lastVersion, current: currentVersion.toString(), ts: Date.now() };
      window.dispatchEvent(new CustomEvent('app-version-updated', { detail: window.__APP_VERSION_UPDATE__ }));
    } catch (e) {
      // 例外は無視
    }
  } else if (!lastVersion) {
    // 初回訪問時
    localStorage.setItem(versionKey, currentVersion.toString());
  }
})();