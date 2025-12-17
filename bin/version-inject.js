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

// ハッシュ値を生成（簡易版）
const crypto = require('crypto');
const buildHash = crypto.createHash('sha256').update(buildVersion + buildTimestamp).digest('hex').substring(0, 8);

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
VITE_BUILD_VERSION=${buildVersion}
VITE_BUILD_TIMESTAMP=${buildTimestamp}
VITE_BUILD_DATE=${buildDate}
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
      .filter(line => !line.startsWith('VITE_BUILD_'))
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
  hash: buildHash,
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

// =====================================================
// 追加: デプロイURLに合わせて index.html のOGP絶対URLを自動調整
// =====================================================
try {
  const indexPath = path.join(__dirname, '../index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Netlify が提供する本番URL/デプロイURLを優先
  const siteUrlRaw = process.env.URL || process.env.DEPLOY_URL || '';
  const siteUrl = siteUrlRaw ? siteUrlRaw.replace(/\/$/, '') : ''; // 末尾スラッシュ除去

  if (siteUrl) {
    console.log(`🔗 Using site URL for OGP: ${siteUrl}`);

    // og:url と canonical を現在のサイトドメインへ統一
    html = html.replace(/(<meta\s+property="og:url"\s+content=")(.*?)("\s*\/>)/, `$1${siteUrl}/$3`);
    html = html.replace(/(<link\s+rel="canonical"\s+href=")(.*?)("\s*\/>)/, `$1${siteUrl}/$3`);

    // 画像URLはドメインに依存しない置換へ（任意の絶対URLを現在のドメインへ）
    html = html.replace(/https?:\/\/[^"']+\/ogp\.webp/g, `${siteUrl}/ogp.webp`);
    html = html.replace(/https?:\/\/[^"']+\/ogp-2025\.jpg/g, `${siteUrl}/ogp-2025.jpg`);

    fs.writeFileSync(indexPath, html);
    console.log('✅ index.html OGP absolute URLs updated to current site domain');
  } else {
    console.log('⚠️ No site URL found in environment (URL/DEPLOY_URL). Skipped OGP URL rewrite.');
  }
} catch (error) {
  console.error('❌ Error updating index.html OGP URLs:', error);
}

console.log('🎉 Version injection completed successfully!');
console.log('📋 Summary:');
console.log(`   - Version: ${buildVersion}`);
console.log(`   - Timestamp: ${buildTimestamp}`);
console.log(`   - Files updated: manifest.json, .env.local, version.json, index.html (OGP URLs)`);
