/**
 * バージョン管理ユーティリティ
 * package.jsonとversion-check.jsのバージョンを統一管理
 */

// package.jsonからバージョン情報を取得
const packageJson = require('../../package.json');

export interface VersionInfo {
  version: string;
  buildDate: string;
  environment: string;
}

/**
 * アプリケーションのバージョン情報を取得
 */
export const getVersionInfo = (): VersionInfo => {
  const version = packageJson.version;
  const buildDate = process.env.REACT_APP_BUILD_DATE || new Date().toISOString().split('T')[0];
  const environment = process.env.NODE_ENV || 'development';
  
  return {
    version,
    buildDate,
    environment
  };
};

/**
 * ローカルストレージからアプリバージョンを取得
 */
export const getStoredVersion = (): string | null => {
  return localStorage.getItem('app_version');
};

/**
 * バージョン表示用の文字列を生成
 */
export const getVersionDisplayString = (): string => {
  const versionInfo = getVersionInfo();
  return `v${versionInfo.version}`;
};

/**
 * 詳細バージョン情報の文字列を生成
 */
export const getDetailedVersionString = (): string => {
  const versionInfo = getVersionInfo();
  return `v${versionInfo.version} (${versionInfo.buildDate})`;
};