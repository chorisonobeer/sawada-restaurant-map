# 多言語対応（日本語・英語切り替え機能）実装分析レポート

**作成日**: 2025年12月17日  
**対象プロジェクト**: 佐和田料飲店マップ2025

---

## 📋 目次

1. [概要](#概要)
2. [現状分析](#現状分析)
3. [実装方針の検討](#実装方針の検討)
4. [推奨アプローチ](#推奨アプローチ)
5. [実装規模の評価](#実装規模の評価)
6. [破壊的変更のリスク評価](#破壊的変更のリスク評価)
7. [実装工程](#実装工程)
8. [結論と推奨事項](#結論と推奨事項)

---

## 概要

本レポートは、佐和田料飲店マップに**日本語・英語切り替え機能**を追加する可能性について調査・評価を行ったものです。ユーザー要件として、フローティングボタンによる言語切り替えUIが想定されています。

---

## 現状分析

### プロジェクト技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | React 17.x |
| 言語 | TypeScript |
| ビルドツール | Vite 7.x |
| スタイリング | SCSS |
| ルーティング | React Router v6 |
| 状態管理 | React Context + Hooks |

### 現在のi18n対応状況

```diff
- i18nライブラリ: 導入なし
- 翻訳ファイル: 存在しない
- 言語設定: なし
```

> [!WARNING]
> 現在、すべてのテキストがコンポーネント内にハードコードされており、翻訳の仕組みは一切存在しません。

### ハードコードされた日本語テキストの分布

以下のコンポーネントに日本語テキストが直接記述されています：

| コンポーネント | テキスト量 | 主な内容 |
|----------------|------------|----------|
| `Tabbar.tsx` | 5項目 | ホーム、一覧、写真から探す、イベント、マップについて |
| `Shop.tsx` | 25+項目 | 閉じる、営業時間、定休日、住所、電話番号、その他ラベル |
| `SearchFeature.tsx` | 20+項目 | プレースホルダー、フィルターラベル、ステータス表示 |
| `List.tsx` | 10+項目 | ローディング、エラー、件数表示 |
| `AboutUs.tsx` | 50+項目 | ページ全体のコンテンツ、説明文 |
| `Events.tsx` | 20+項目 | イベント関連ラベル、エラーメッセージ |
| `PWAInstallBanner.tsx` | 5項目 | インストール促進メッセージ |
| その他 | 多数 | エラーメッセージ、アクセシビリティラベル等 |

**推定テキスト数**: **150〜200個以上**

---

## 実装方針の検討

### 方式A: react-i18next（推奨）

最も実績のあるReact向けi18nライブラリです。

**メリット**:
- Reactとの統合が優れている
- Hooks API（`useTranslation`）で簡潔に実装可能
- 遅延ロード対応
-豊富なエコシステム

**デメリット**:
- バンドルサイズ増加（約20-30KB gzip）

```typescript
// 使用例
import { useTranslation } from 'react-i18next';

function Tabbar() {
  const { t } = useTranslation();
  return <div>{t('tabbar.home')}</div>;
}
```

### 方式B: react-intl

Facebook製の国際化ライブラリです。

**メリット**:
- 日付・数値のフォーマット機能が強力
- ICUメッセージ形式対応

**デメリット**:
- 学習コストがやや高い
- バンドルサイズがreact-i18nextより大きい

### 方式C: カスタム実装（Context API）

外部ライブラリを使用せず、自前で実装する方式です。

**メリット**:
- 依存関係が増えない
- 完全にカスタマイズ可能

**デメリット**:
- 実装コストが高い
- 拡張性・保守性に課題

---

## 推奨アプローチ

### **react-i18next + フローティング言語切替ボタン**

以下の構成を推奨します：

#### 1. ディレクトリ構造

```
src/
├── i18n/
│   ├── index.ts          # i18n初期化設定
│   ├── locales/
│   │   ├── ja/
│   │   │   └── translation.json
│   │   └── en/
│   │       └── translation.json
├── components/
│   └── LanguageSwitcher/
│       ├── LanguageSwitcher.tsx
│       └── LanguageSwitcher.scss
```

#### 2. 翻訳ファイル例

```json
// src/i18n/locales/ja/translation.json
{
  "tabbar": {
    "home": "ホーム",
    "list": "一覧",
    "photos": "写真から探す",
    "events": "イベント",
    "about": "マップについて"
  },
  "search": {
    "placeholder": "スポットを検索...",
    "openNow": "現在営業中",
    "hasParking": "駐車場有り",
    "category": "カテゴリ",
    "all": "すべて"
  }
  // ... 他のテキスト
}
```

```json
// src/i18n/locales/en/translation.json
{
  "tabbar": {
    "home": "Home",
    "list": "List",
    "photos": "Photos",
    "events": "Events",
    "about": "About"
  },
  "search": {
    "placeholder": "Search spots...",
    "openNow": "Open Now",
    "hasParking": "Parking Available",
    "category": "Category",
    "all": "All"
  }
  // ... 他のテキスト
}
```

#### 3. フローティング言語切替ボタン

```tsx
// src/components/LanguageSwitcher/LanguageSwitcher.tsx
const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'ja' ? 'en' : 'ja';
    i18n.changeLanguage(newLang);
    localStorage.setItem('preferred-language', newLang);
  };

  return (
    <button 
      className="language-switcher-fab"
      onClick={toggleLanguage}
    >
      {i18n.language === 'ja' ? '🇺🇸 EN' : '🇯🇵 JA'}
    </button>
  );
};
```

---

## 実装規模の評価

### 作業工数見積もり

| 作業項目 | 推定時間 | 難易度 |
|----------|----------|--------|
| i18nライブラリ導入・設定 | 2-3時間 | 低 |
| 翻訳ファイル作成（日本語） | 3-4時間 | 低 |
| 翻訳ファイル作成（英語） | 4-6時間 | 中 |
| コンポーネント改修（全体） | 8-12時間 | 中-高 |
| フローティングボタン実装 | 2-3時間 | 低 |
| テスト・調整 | 3-4時間 | 中 |
| **合計** | **22-32時間** | - |

### 影響を受けるファイル

```
改修が必要なファイル（推定）: 15-20ファイル

主要コンポーネント:
- src/App.tsx
- src/App/Tabbar.tsx
- src/App/Shop.tsx
- src/App/SearchFeature.tsx
- src/App/List.tsx
- src/App/AboutUs.tsx
- src/App/Events.tsx
- src/App/PWAInstallBanner.tsx
- src/App/LoadingSpinner.tsx
- src/App/ShopListItem.tsx
- src/App/Category.tsx
- src/App/Images.tsx
- その他
```

---

## 破壊的変更のリスク評価

### リスクレベル: 🟡 中程度

> [!IMPORTANT]
> 本実装は**破壊的変更を伴わない**形で進めることが可能です。

### 詳細なリスク分析

| リスク項目 | レベル | 説明 | 対策 |
|------------|--------|------|------|
| 既存機能の破壊 | 低 | テキスト置換のみで、ロジック変更なし | 段階的実装 |
| ビルドエラー | 低 | 新規パッケージ追加のみ | 依存関係確認 |
| パフォーマンス影響 | 低-中 | バンドルサイズ微増 | 遅延ロード活用 |
| レイアウト崩れ | 中 | 英語テキストは日本語より長い場合あり | デザイン調整必要 |
| データ連携 | 中 | 店舗データ（CSV）は日本語のみ | データ側は対象外とする |

### 特記事項

> [!CAUTION]
> **店舗データ（CSVから取得）の翻訳は今回のスコープ外**として扱う必要があります。  
> 店舗名、住所、営業時間などのデータは日本語のまま表示されます。  
> これは翻訳データの管理コストが非常に高く、運用面での課題が大きいためです。

---

## 実装工程

### フェーズ1: 基盤整備（1日）

1. react-i18nextパッケージのインストール
2. i18n設定ファイルの作成
3. Appコンポーネントにi18nプロバイダーを追加
4. フローティングボタンコンポーネントの作成

### フェーズ2: 翻訳ファイル作成（1-2日）

1. 日本語翻訳ファイルの作成（既存テキストの抽出）
2. 英語翻訳ファイルの作成
3. 翻訳キーの命名規則策定

### フェーズ3: コンポーネント改修（2-3日）

1. 主要コンポーネントの`useTranslation`フック導入
2. ハードコードされたテキストを`t()`関数呼び出しに置換
3. 動的テキスト（補間）の対応

### フェーズ4: テスト・調整（1日）

1. 全ページの表示確認
2. 言語切替動作確認
3. レイアウト調整
4. ブラウザのlocalStorage永続化確認

---

## 結論と推奨事項

### 総合評価

| 評価項目 | 結果 |
|----------|------|
| 実現可能性 | ✅ 十分に実現可能 |
| 実装難易度 | 🟡 中程度 |
| 破壊的変更 | ✅ なし（適切に実装すれば） |
| 推定工数 | 約3-5日（1人作業） |
| 保守性への影響 | 🟢 プラス（テキスト管理が集約化） |

### 推奨事項

1. **react-i18nextを採用**することを推奨します
2. **段階的に実装**し、主要コンポーネントから着手してください
3. **店舗データの翻訳はスコープ外**として明確に定義してください
4. **英語テキストが長くなる箇所**のレイアウト調整を考慮してください
5. **言語設定はlocalStorage**に保存し、次回訪問時も維持するようにしてください

### 優先度の高いコンポーネント（先に対応すべき）

1. `Tabbar.tsx` - ナビゲーション
2. `SearchFeature.tsx` - 検索機能
3. `Shop.tsx` - 店舗詳細
4. `PWAInstallBanner.tsx` - インストール促進

---

## 付録: パッケージ追加コマンド

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

---

*本レポートは現時点での調査に基づくものであり、実装時には追加の検討が必要になる可能性があります。*
