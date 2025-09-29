#!/usr/bin/env node

/**
 * ビルド時バージョン自動挿入スクリプト
 * manifest.jsonにビルドタイムスタンプとバージョン情報を自動挿入
 */

const fs = require('fs');
const path = require('path');

// バージョン情報を生成
const now = new Date();
const buildTimestamp = now.getTime();
const buildVersion = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
const buildDate = now.toISOString();

console.log('🚀 Version injection started...');
console.log(`📅 Build Version: ${buildVersion}`);
console.log(`⏰ Build Timestamp: ${buildTimestamp}`);
console.log(`📆 Build Date: ${buildDate}`);

// manifest.jsonを更新
const manifestPath = path.join(__dirname, '../public/manifest.json');

try {
  // 既存のmanifest.jsonを読み込み
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  // バージョン情報を追加
  manifest.version = buildVersion;
  manifest.build_timestamp = buildTimestamp;
  manifest.build_date = buildDate;
  manifest.last_updated = buildDate;
  
  // manifest.jsonを更新
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json updated successfully');
  
} catch (error) {
  console.error('❌ Error updating manifest.json:', error);
  process.exit(1);
}

// 環境変数ファイルを生成（Reactで使用）
const envContent = `# Auto-generated version info - DO NOT EDIT MANUALLY
REACT_APP_BUILD_VERSION=${buildVersion}
REACT_APP_BUILD_TIMESTAMP=${buildTimestamp}
REACT_APP_BUILD_DATE=${buildDate}
`;

const envPath = path.join(__dirname, '../.env.local');

try {
  // 既存の.env.localがあれば読み込み、バージョン情報のみ更新
  let existingEnv = '';
  if (fs.existsSync(envPath)) {
    existingEnv = fs.readFileSync(envPath, 'utf8');
    // バージョン関連の行を削除
    existingEnv = existingEnv
      .split('\n')
      .filter(line => !line.startsWith('REACT_APP_BUILD_'))
      .filter(line => line.trim() !== '# Auto-generated version info - DO NOT EDIT MANUALLY')
      .join('\n');
  }
  
  // 新しいバージョン情報を追加
  const finalEnvContent = existingEnv.trim() + '\n\n' + envContent;
  fs.writeFileSync(envPath, finalEnvContent);
  console.log('✅ .env.local updated successfully');
  
} catch (error) {
  console.error('❌ Error updating .env.local:', error);
  process.exit(1);
}

// バージョン情報をJSONファイルとしても出力（デバッグ用）
const versionInfo = {
  version: buildVersion,
  timestamp: buildTimestamp,
  buildDate: buildDate,
  environment: process.env.NODE_ENV || 'development'
};

const versionPath = path.join(__dirname, '../public/version.json');

try {
  fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
  console.log('✅ version.json created successfully');
} catch (error) {
  console.error('❌ Error creating version.json:', error);
  process.exit(1);
}

console.log('🎉 Version injection completed successfully!');
console.log('📋 Summary:');
console.log(`   - Version: ${buildVersion}`);
console.log(`   - Timestamp: ${buildTimestamp}`);
console.log(`   - Files updated: manifest.json, .env.local, version.json`);
