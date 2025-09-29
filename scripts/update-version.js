#!/usr/bin/env node
/**
 * バージョン更新スクリプト
 * 使用方法:
 * node scripts/update-version.js [major|minor|patch] [説明]
 * 
 * 例:
 * node scripts/update-version.js minor "新機能追加"
 * node scripts/update-version.js patch "バグ修正"
 * node scripts/update-version.js major "大幅なUI変更"
 */

const fs = require('fs');
const path = require('path');

// 引数の取得
const [,, versionType, description] = process.argv;

if (!versionType || !['major', 'minor', 'patch'].includes(versionType)) {
  console.error('使用方法: node scripts/update-version.js [major|minor|patch] [説明]');
  console.error('例: node scripts/update-version.js minor "新機能追加"');
  process.exit(1);
}

if (!description) {
  console.error('バージョン更新の説明を入力してください。');
  process.exit(1);
}

// package.jsonの読み込み
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 現在のバージョンを解析
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// 新しいバージョンを計算
let newVersion;
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`バージョンを ${currentVersion} から ${newVersion} に更新します...`);
console.log(`更新内容: ${description}`);

// package.jsonの更新
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✓ package.json を更新しました');

// version-check.jsの更新
const versionCheckPath = path.join(__dirname, '..', 'public', 'version-check.js');
let versionCheckContent = fs.readFileSync(versionCheckPath, 'utf8');
versionCheckContent = versionCheckContent.replace(
  /const currentVersion = '[^']+';/,
  `const currentVersion = '${newVersion}';`
);
fs.writeFileSync(versionCheckPath, versionCheckContent);
console.log('✓ version-check.js を更新しました');

// CHANGELOG.mdの更新（存在しない場合は作成）
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
const today = new Date().toISOString().split('T')[0];
const changelogEntry = `## [${newVersion}] - ${today}\n\n### ${getChangeType(versionType)}\n- ${description}\n\n`;

let changelogContent = '';
if (fs.existsSync(changelogPath)) {
  changelogContent = fs.readFileSync(changelogPath, 'utf8');
  // 既存のCHANGELOGの先頭に新しいエントリを追加
  const lines = changelogContent.split('\n');
  const titleIndex = lines.findIndex(line => line.startsWith('# '));
  if (titleIndex !== -1) {
    lines.splice(titleIndex + 2, 0, changelogEntry);
    changelogContent = lines.join('\n');
  } else {
    changelogContent = changelogEntry + changelogContent;
  }
} else {
  // 新しいCHANGELOGを作成
  changelogContent = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${changelogEntry}`;
}

fs.writeFileSync(changelogPath, changelogContent);
console.log('✓ CHANGELOG.md を更新しました');

console.log('\n🎉 バージョン更新が完了しました！');
console.log(`新しいバージョン: ${newVersion}`);
console.log('\n次のステップ:');
console.log('1. 変更をコミットしてください: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
console.log('2. アプリをビルドしてデプロイしてください');
console.log('3. ユーザーがアクセスすると自動的に新しいバージョンが適用されます');

function getChangeType(versionType) {
  switch (versionType) {
    case 'major':
      return 'Major Changes';
    case 'minor':
      return 'New Features';
    case 'patch':
      return 'Bug Fixes';
    default:
      return 'Changes';
  }
}