# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-12-19

### Major Changes
- 🎉 新潟クラフトビールマップの正式リリース
- 📍 地図ベースのクラフトビール店舗検索機能
- 🔍 フィルター機能（営業状況、店舗タイプ等）
- 📱 PWA対応（オフライン機能、ホーム画面追加）
- 🗺️ 位置情報連携機能
- ℹ️ バージョン管理システムの実装
- 🎨 レスポンシブデザイン対応

### Technical Features
- 自動バージョンチェック・キャッシュクリア機能
- Service Worker による PWA 機能
- Geolocation API 連携
- React + TypeScript 構成
- Material-UI ベースのモダンUI

### Version Management
- セマンティックバージョニング採用
- 自動バージョン更新スクリプト
- ユーザー向けバージョン表示機能
- 開発者向けバージョン管理ドキュメント

---

## バージョン更新方法

新しいバージョンをリリースする際は、以下のコマンドを使用してください：

```bash
# 新機能追加時
node scripts/update-version.js minor "新機能の説明"

# バグ修正時
node scripts/update-version.js patch "修正内容の説明"

# 大幅な変更時
node scripts/update-version.js major "変更内容の説明"
```

## バージョン番号の意味

- **MAJOR**: 互換性のない大幅な変更
- **MINOR**: 後方互換性のある新機能の追加  
- **PATCH**: 後方互換性のあるバグ修正