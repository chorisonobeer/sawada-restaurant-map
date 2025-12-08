# UI構造徹底分析ドキュメント

## 概要

本ドキュメントは、MAPアプリのTypeScriptコンポーネントとCSS/SCSSの関係性、DOMの親子関係、ネスト構造、ポジショニング、z-index階層を完全に把握し、破綻しないUI改修を実現するための包括的な分析レポートです。

---

## 1. DOM階層構造（完全版）

### 1.1 ルート階層

```
#root (index.html)
└── <HashRouter> (index.tsx)
    ├── <PageViewReporter />
    └── <Container> (Container.tsx)
        ├── <div className="outer-container">
        │   └── <div className="inner-container">
        │       ├── <About /> (About.tsx) - デスクトップのみ表示
        │       └── <App /> (App.tsx)
        │           ├── <GeolocationProvider>
        │           │   └── <div className="app">
        │           │       ├── <div className="app-body">
        │           │       │   └── <Routes>
        │           │       │       ├── <Route path="/" element={<Home />} />
        │           │       │       ├── <Route path="/list" element={<List />} />
        │           │       │       ├── <Route path="/category" element={<Category />} />
        │           │       │       ├── <Route path="/images" element={<Images />} />
        │           │       │       ├── <Route path="/about" element={<AboutUs />} />
        │           │       │       └── <Route path="/events" element={<Events />} />
        │           │       ├── <LazyMap /> (永続化された地図)
        │           │       ├── <div id="modal-root"></div>
        │           │       └── <div className="app-footer">
        │           │           └── <Tabbar />
        └── <PWAInstallBanner />
```

### 1.2 Homeページの詳細構造

```
<div className="home"> (Home.tsx)
├── <SearchFeature /> (SearchFeature.tsx)
│   └── <div className="search-feature">
│       ├── <div className="search-input-container">
│       │   ├── <input className="search-input" />
│       │   └── <button className="clear-button"> (条件付き表示)
│       ├── <div className="filter-container">
│       │   ├── <div className="filter-row first-row">
│       │   │   ├── <div className="filter-item category-filter">
│       │   │   │   ├── <div className="custom-dropdown-header">
│       │   │   │   └── <div className="custom-dropdown-list"> (条件付き表示)
│       │   │   └── <div className="filter-item tag-filter">
│       │   │       ├── <div className="custom-dropdown-header">
│       │   │       └── <div className="custom-dropdown-list"> (条件付き表示)
│       │   └── <div className="filter-row second-row">
│       │       ├── <div className="filter-item operation-filter">
│       │       │   └── <button className="filter-button">
│       │       └── <div className="filter-item parking-filter">
│       │           └── <button className="filter-button">
│       └── <div className="search-results"> (条件付き表示)
│           ├── <div className="no-results"> または
│           └── <div className="results-list">
│               └── <div className="result-item">
│                   ├── <div className="result-info">
│                   │   ├── <div className="result-header">
│                   │   │   ├── <div className="result-name">
│                   │   │   └── <span className="status-badge">
│                   │   ├── <div className="result-categories">
│                   │   │   └── <span className="category-tag">
│                   │   ├── <div className="result-line result-hours">
│                   │   ├── <div className="result-line result-closed">
│                   │   └── <div className="result-line result-address">
│                   └── <div className="result-image">
│                       └── <img />
└── <Shop /> (Portal経由で modal-root にレンダリング)
    └── <div className="shop-single">
        ├── <div className="head">
        │   └── <button>
        ├── <div className="container">
        │   ├── <h2 className="shop-title-large">
        │   ├── <div className="tag-box">
        │   │   ├── <Link><span className="category">
        │   │   └── <span className="distance">
        │   ├── <Links />
        │   ├── <div className="shop-route">
        │   ├── <div className="shop-info-box">
        │   ├── <div className="shop-images-grid">
        │   └── <div className="shop-content">
        ├── <div className="image-modal"> (条件付き表示)
        └── <div className="action-buttons">
            ├── <a className="action-button phone-button"> (条件付き)
            └── <a className="action-button web-button"> (条件付き)
```

### 1.3 地図コンポーネントの構造

```
<LazyMap /> (App.tsx内で永続化)
└── <div style={{ position: 'absolute', zIndex: 5 or -1 }}>
    └── <Suspense>
        └── <Map /> (Map.tsx)
            └── <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                ├── <LoadingSpinner /> (条件付き表示)
                └── <div ref={mapNode}> (Geolonia Map がマウントされる)
```

### 1.4 ボトムナビゲーションの構造

```
<div className="app-footer"> (App.tsx)
└── <Tabbar /> (Tabbar.tsx)
    └── <div className="tabbar">
        └── <ul>
            ├── <li>
            │   └── <Link className="home [active]">
            │       ├── <div className="icon">
            │       └── <div className="text">
            ├── <li>
            │   └── <Link className="list [active]">
            ├── <li>
            │   └── <Link className="images [active]">
            ├── <li>
            │   └── <Link className="events [active]">
            └── <li>
                └── <Link className="aboutus [active]">
```

---

## 2. CSS/SCSS適用関係マップ

### 2.1 グローバルスタイル

| ファイル | 適用範囲 | 主な役割 |
|---------|---------|---------|
| `src/index.scss` | 全要素 (`*`) | リセット、フォント、基本スタイル |
| `src/Container.scss` | `.outer-container`, `.inner-container`, `.app`, `.about` | レイアウトコンテナ、レスポンシブ対応 |

### 2.2 コンポーネント別スタイル

| コンポーネント | TSXファイル | SCSSファイル | 主なクラス名 |
|--------------|-----------|------------|------------|
| App | `App.tsx` | `App.scss` | `.app-body`, `.app-footer` |
| Home | `Home.tsx` | `Home.scss` | `.home` |
| SearchFeature | `SearchFeature.tsx` | `SearchFeature.scss` | `.search-feature`, `.search-input-container`, `.filter-container`, `.search-results` |
| Tabbar | `Tabbar.tsx` | `Tabbar.scss` | `.tabbar`, `.tabbar ul`, `.tabbar a` |
| Shop | `Shop.tsx` | `Shop.scss` | `.shop-single`, `.head`, `.container`, `.action-buttons`, `.image-modal` |
| Map | `Map.tsx` | `Map.scss` | (地図ライブラリのコントロール用) |

---

## 3. ポジショニング完全マップ

### 3.1 `position: absolute` の要素

| 要素 | ファイル | 親要素 | top/left/right/bottom | 目的 |
|-----|---------|--------|---------------------|------|
| `.app` | `Container.scss` | `.inner-container` | `top: 0, left: 0` | デスクトップでの配置 |
| `.about` | `Container.scss` | `.inner-container` | `top: 0, left: 0` | デスクトップでの配置 |
| `.app-footer` | `App.scss` | `.app` | `bottom: 0` | フッター固定 |
| `.search-input-container` | `SearchFeature.scss` | `.search-feature` | `top: 10px, left: 10px` | 検索バー配置 |
| `.filter-container` | `SearchFeature.scss` | `.search-feature` | `top: 52px, left: 10px` | フィルタ配置 |
| `.search-results` | `SearchFeature.scss` | `.search-feature` | `top: 120px, left: 10px` | 検索結果配置 |
| `.custom-dropdown-list` | `SearchFeature.scss` | `.filter-item` | `top: 100%` | ドロップダウン |
| `.shop-single` | `Shop.scss` | `#modal-root` | `top: 0, bottom: 60px, left: 0, right: 0` | 店舗詳細モーダル |
| `.action-buttons` | `Shop.scss` | `.shop-single` | `bottom: 0, left: 0, right: 0` | アクションボタン固定 |
| `.image-modal` | `Shop.scss` | `body` | `top: 0, left: 0, width: 100vw, height: 100vh` | 画像拡大モーダル |
| `LazyMap` (インライン) | `App.tsx` | `.app` | `top: 0, left: 0` | 地図配置 |

### 3.2 `position: relative` の要素

| 要素 | ファイル | 目的 |
|-----|---------|------|
| `.inner-container` | `Container.scss` | 絶対配置の基準点 |
| `.home` | `Home.scss` | 検索機能の基準点 |
| `.search-feature` | `SearchFeature.scss` | 検索要素の基準点 |
| `.filter-item` | `SearchFeature.scss` | ドロップダウンの基準点 |
| `.result-item` | `SearchFeature.scss` | ステータスバーの基準点 |

### 3.3 `position: fixed` の要素

| 要素 | ファイル | 目的 |
|-----|---------|------|
| `.image-modal` | `Shop.scss` | 画面全体を覆うモーダル |
| `.version-update-toast` | `index.tsx` (インライン) | 更新通知トースト |

---

## 4. z-index階層マップ

### 4.1 z-index値の一覧（低→高の順）

| z-index | 要素 | ファイル | コンテキスト |
|---------|------|---------|------------|
| `-1` | `LazyMap` (非表示時) | `App.tsx` | `.app`内 |
| `0` | 通常のフロー要素 | - | - |
| `2` | `.app` | `Container.scss` | `.inner-container`内 |
| `5` | `LazyMap` (表示時) | `App.tsx` | `.app`内 |
| `6` | `.search-feature` | `SearchFeature.scss` | `.home`内 |
| `20` | `.action-buttons` | `Shop.scss` | `.shop-single`内 |
| `50` | `.shop-single` | `Shop.scss` | `#modal-root`内 |
| `100` | `.app-footer` | `App.scss` | `.app`内 |
| `999` | `.search-results-panel` | `SearchResultsPanel.scss` | - |
| `1000` | `.custom-dropdown-list` | `SearchFeature.scss` | `.filter-item`内 |
| `1000` | `.search-results` | `SearchFeature.scss` | `.search-feature`内 |
| `1000` | `.image-modal` | `Shop.scss` | `body`内 |
| `1000` | `LoadingSpinner` (地図内) | `Map.tsx` | 地図コンテナ内 |
| `9999` | `.version-update-toast` | `index.tsx` | `body`内 |
| `9999` | `.pwa-install-banner` | `PWAInstallBanner.scss` | `body`内 |

### 4.2 z-index階層の視覚化

```
z-index: 9999
├── .version-update-toast
└── .pwa-install-banner

z-index: 1000
├── .image-modal (Shop)
├── .search-results (SearchFeature)
├── .custom-dropdown-list (SearchFeature)
└── LoadingSpinner (Map内)

z-index: 999
└── .search-results-panel

z-index: 100
└── .app-footer (Tabbar)

z-index: 50
└── .shop-single

z-index: 20
└── .action-buttons (Shop内)

z-index: 6
└── .search-feature

z-index: 5
└── LazyMap (表示時)

z-index: 2
└── .app

z-index: 0
└── 通常のフロー要素

z-index: -1
└── LazyMap (非表示時)
```

---

## 5. マージン・パディング・サイズ関係

### 5.1 重要なサイズ値

| 要素 | プロパティ | 値 | ファイル | 備考 |
|-----|----------|-----|---------|------|
| `.app-footer` | `height` | `60px` | `App.scss` | フッターの高さ |
| `.app-body` | `height` | `calc(100% - 68px - env(safe-area-inset-bottom))` | `App.scss` | フッター分を引く |
| `.shop-single` | `bottom` | `60px` | `Shop.scss` | フッター分を空ける |
| `.search-input-container` | `top` | `10px` | `SearchFeature.scss` | 上端からの距離 |
| `.search-input-container` | `left` | `10px` | `SearchFeature.scss` | 左端からの距離 |
| `.search-input-container` | `width` | `calc(85% - 0px)` | `SearchFeature.scss` | 幅計算 |
| `.filter-container` | `top` | `52px` | `SearchFeature.scss` | 検索バー下 |
| `.search-results` | `top` | `120px` | `SearchFeature.scss` | フィルタ下 |
| `.search-results.results-open` | `top` | `42px` | `SearchFeature.scss` | 検索時は検索バー直下 |
| `.tabbar` | `height` | `100%` | `Tabbar.scss` | フッター内で100% |
| `.tabbar ul li` | `min-height` | `80px` (モバイル), `70px` (デスクトップ) | `Tabbar.scss` | タブの高さ |
| `.shop-single .container` | `padding-bottom` | `200px` | `Shop.scss` | アクションボタン分の余白 |

### 5.2 マージン・パディングの依存関係

#### SearchFeature内の配置計算

```
.search-feature (position: relative)
├── .search-input-container
│   ├── top: 10px
│   ├── left: 10px
│   └── width: calc(85% - 0px)
├── .filter-container
│   ├── top: 52px (10px + 32px検索バー高さ + 10px余白)
│   ├── left: 10px
│   └── width: calc(85% - 0px)
└── .search-results
    ├── top: 120px (52px + フィルタ高さ + 余白)
    ├── left: 10px
    └── width: calc(92% - 0px)
```

#### Shop内の配置計算

```
.shop-single (position: absolute)
├── top: 0
├── bottom: 60px (.app-footerの高さ)
├── left: 0
└── right: 0
    └── .container
        └── padding-bottom: 200px (アクションボタン分)
            └── .action-buttons (position: absolute, bottom: 0)
```

---

## 6. レスポンシブ対応

### 6.1 ブレークポイント

| ブレークポイント | ファイル | 変更内容 |
|---------------|---------|---------|
| `max-width: 960px` | `Container.scss` | `.app`を全画面化、`.about`を非表示 |
| `min-width: 768px` | `Tabbar.scss` | タブの高さとフォントサイズ調整 |
| `max-width: 480px` | `Shop.scss` | フォントサイズとパディング調整 |

### 6.2 レスポンシブ時の構造変化

#### デスクトップ (width > 960px)
```
.inner-container (720px × 673px)
├── .app (381px, 左側に配置)
└── .about (右側に配置)
```

#### モバイル (width ≤ 960px)
```
.inner-container (100% × 100%)
└── .app (100% × 100%, 全画面)
    └── .about (display: none)
```

---

## 7. 重要なCSS依存関係

### 7.1 検索結果表示時の状態変化

```scss
.search-feature.results-open {
  .search-input-container {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom: none;
  }
  .filter-container {
    display: none; // フィルタを非表示
  }
  .search-results {
    top: 42px; // 検索バー直下に移動
    left: 0;
    right: 0;
    width: 100%; // 幅を100%に
  }
}
```

### 7.2 Shopモーダルのアニメーション

```scss
.shop-single {
  transform: translateX(100%); // 初期状態: 右側に隠れる
  transition: transform 0.3s ease-in-out;
  
  &.slide-in {
    transform: translateX(0); // 表示時: スライドイン
  }
  
  &.closing {
    transform: scale(0.5);
    opacity: 0.8;
    transition: 0.8s cubic-bezier(0,.71,.93,.45);
  }
}
```

### 7.3 地図の表示/非表示制御

```tsx
// App.tsx内
const persistentMap = useMemo(() => {
  const isHomePage = location.pathname === '/';
  return (
    <LazyMap 
      style={{ 
        display: isHomePage ? 'block' : 'none',
        zIndex: isHomePage ? 5 : -1,
        pointerEvents: isHomePage ? 'auto' : 'none'
      }}
    />
  );
}, [location.pathname]);
```

---

## 8. 破綻しないUI改修の方法（5回検討）

### 検討1: 段階的変更と影響範囲の徹底分析

#### 原則
1. **変更前に影響範囲を完全に把握する**
   - 変更するCSSクラスが使用されている全てのファイルを検索
   - そのクラスに依存する子要素・親要素を特定
   - 同じz-index値を持つ要素がないか確認

2. **1つの変更を1つのコミットにする**
   - 複数の変更を同時に行わない
   - 各変更後に動作確認

3. **計算値の依存関係を文書化**
   - `top: 52px` のような値は `10px + 32px + 10px` のように計算式をコメントに残す
   - 変更時は計算式から再計算

#### 実践例: 検索バーのフローティング化

**変更前の分析**:
- `.search-input-container` は `SearchFeature.scss` で定義
- `position: absolute`, `top: 10px`, `left: 10px`
- `.filter-container` の `top: 52px` は検索バーの高さに依存
- `.search-results` の `top: 120px` はフィルタの位置に依存

**変更手順**:
1. 検索バーのスタイルのみ変更（背景、シャドウ、角丸）
2. フィルタと検索結果の位置は変更しない（既存の計算を維持）
3. 動作確認後、必要に応じて微調整

---

### 検討2: z-index管理の体系化

#### 問題点
- z-index値が散在している（2, 5, 6, 20, 50, 100, 999, 1000, 9999）
- 値の意味が不明確
- 新しい要素を追加する際に適切な値を選びにくい

#### 解決策: z-index階層の定義

```scss
// 新規ファイル: src/styles/z-index.scss
$z-index: (
  base: 0,
  app: 2,
  map: 5,
  search: 6,
  shop-actions: 20,
  shop-modal: 50,
  footer: 100,
  dropdown: 1000,
  modal: 1000,
  toast: 9999
);
```

**使用例**:
```scss
.search-feature {
  z-index: map-get($z-index, search);
}

.shop-single {
  z-index: map-get($z-index, shop-modal);
}
```

**メリット**:
- 値の意味が明確になる
- 一箇所で管理できる
- 値の衝突を防げる

---

### 検討3: サイズ・間隔の変数化

#### 問題点
- マジックナンバーが散在（10px, 52px, 60px, 120pxなど）
- 変更時に複数箇所を修正する必要がある
- 計算式が複雑で理解しにくい

#### 解決策: デザイントークンの導入

```scss
// 新規ファイル: src/styles/spacing.scss
$spacing: (
  xs: 4px,
  sm: 8px,
  md: 16px,
  lg: 24px,
  xl: 32px
);

$layout: (
  footer-height: 60px,
  search-input-height: 32px,
  filter-row-height: 40px,
  search-top-offset: 10px
);
```

**使用例**:
```scss
.search-input-container {
  top: map-get($layout, search-top-offset);
  left: map-get($layout, search-top-offset);
}

.filter-container {
  top: map-get($layout, search-top-offset) + 
       map-get($layout, search-input-height) + 
       map-get($spacing, sm);
}
```

**メリット**:
- 一箇所で値を管理
- 計算式が明確になる
- レスポンシブ対応が容易

---

### 検討4: コンポーネント間の依存関係の可視化

#### 問題点
- コンポーネント間の依存関係が不明確
- 変更の影響範囲が予測しにくい
- 親子関係の把握が困難

#### 解決策: 依存関係図の作成と維持

```markdown
## コンポーネント依存関係

### SearchFeature
- 親: Home
- 子: なし
- 依存CSS: SearchFeature.scss
- 影響を受ける要素:
  - .search-results の位置は .filter-container に依存
  - .filter-container の位置は .search-input-container に依存

### Shop
- 親: Portal経由で #modal-root
- 子: Links, ZoomableImage
- 依存CSS: Shop.scss
- 影響を受ける要素:
  - .shop-single の bottom は .app-footer の height に依存
  - .action-buttons の位置は .shop-single の bottom に依存
```

**実践**:
- 各コンポーネントのREADMEに依存関係を記載
- 変更時は依存関係図を確認してから実装

---

### 検討5: テスト駆動のUI改修

#### 問題点
- 変更後の動作確認が手動
- レイアウトの崩れに気づきにくい
- 複数の画面サイズでの確認が大変

#### 解決策: ビジュアルリグレッションテスト

**実装例**:
```typescript
// SearchFeature.test.tsx
describe('SearchFeature Layout', () => {
  it('検索バーが正しい位置に配置される', () => {
    render(<SearchFeature />);
    const searchInput = screen.getByPlaceholderText('スポットを検索...');
    const styles = window.getComputedStyle(searchInput.parentElement!);
    expect(styles.top).toBe('10px');
    expect(styles.left).toBe('10px');
  });
  
  it('フィルタが検索バーの下に配置される', () => {
    render(<SearchFeature />);
    const filterContainer = document.querySelector('.filter-container');
    const searchInput = document.querySelector('.search-input-container');
    const filterTop = filterContainer!.getBoundingClientRect().top;
    const searchBottom = searchInput!.getBoundingClientRect().bottom;
    expect(filterTop).toBeGreaterThanOrEqual(searchBottom);
  });
});
```

**メリット**:
- 変更によるレイアウト崩れを自動検出
- リファクタリング時の安全性向上
- ドキュメントとしての役割

---

## 9. Phase1実装時の具体的な注意事項

### 9.1 検索バーのフローティング化

#### 変更対象
- `src/App/SearchFeature.scss` の `.search-input-container`

#### 注意点
1. **位置は変更しない**
   - `top: 10px`, `left: 10px` は維持
   - `.filter-container` の `top: 52px` は検索バーの高さに依存しているため、高さを変更する場合は再計算が必要

2. **背景の透明度**
   - `backdrop-filter` は古いブラウザでサポートされていない
   - フォールバックとして不透明な背景を用意

3. **z-indexの確認**
   - 現在 `z-index: 6` (`.search-feature`)
   - 地図 (`z-index: 5`) より上なので問題なし

#### 実装手順
```scss
// 変更前
.search-input-container {
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

// 変更後
.search-input-container {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  
  // フォールバック
  @supports not (backdrop-filter: blur(20px)) {
    background: rgba(255, 255, 255, 0.95);
  }
}
```

---

### 9.2 ボトムナビの整理

#### 変更対象
- `src/App/Tabbar.scss`

#### 注意点
1. **縦線の削除**
   - `li + li { border-left: 1px solid #e0e0e0; }` を削除
   - 他のスタイルに影響しないか確認

2. **色の統一**
   - 現在は各タブごとに異なる色（`#00A0E6`, `#4FC3F7`など）
   - 非選択時は `#8E8E93`、選択時は `#007AFF` に統一
   - 既存の `.home.active`, `.list.active` などのクラスは維持（後方互換性）

3. **高さの確認**
   - `.app-footer` の `height: 60px` に依存
   - `.tabbar ul li` の `min-height: 80px` は `.app-footer` より大きいが、実際の高さは `.app-footer` で制限される

#### 実装手順
```scss
// 1. 縦線を削除
.tabbar ul {
  li + li { 
    // border-left: 1px solid #e0e0e0; // 削除
  }
}

// 2. 背景色を変更
.tabbar {
  background-color: #ffffff; // #f8f8f8 から変更
}

// 3. 色を統一
.tabbar ul li a {
  color: #8E8E93; // デフォルト色
  
  &.active {
    color: #007AFF; // アクティブ色
  }
  
  // 個別の色指定を削除またはコメントアウト
  // &.home .icon { color: #00A0E6; } // 削除
}
```

---

### 9.3 角丸とシャドウの統一

#### 変更対象
- 複数のSCSSファイル

#### 注意点
1. **段階的な変更**
   - 一度に全てを変更せず、コンポーネントごとに変更
   - 各変更後に動作確認

2. **既存の計算への影響**
   - 角丸の変更はレイアウトに影響しない
   - シャドウの変更は `box-shadow` のサイズに注意（要素のサイズは変わらないが、視覚的な領域は変わる）

#### 実装手順
```scss
// SearchFeature.scss
.search-input-container {
  border-radius: 12px; // 4px から変更
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); // 追加または変更
}

.filter-button {
  border-radius: 16px; // 4px から変更
}

// Tabbar.scss
.tabbar {
  // 角丸は不要（フッターは画面端）
}

// Shop.scss
.shop-info-box {
  border-radius: 16px; // 5px から変更
}

.result-item {
  border-radius: 16px; // 8px から変更
}
```

---

## 10. チェックリスト: UI改修前の確認事項

### 10.1 変更前チェックリスト

- [ ] 変更するCSSクラスが使用されている全てのファイルを特定した
- [ ] そのクラスに依存する子要素・親要素を確認した
- [ ] 同じz-index値を持つ要素がないか確認した
- [ ] 計算値（top, left, widthなど）の依存関係を把握した
- [ ] レスポンシブ対応が必要か確認した
- [ ] ブラウザ互換性を確認した（backdrop-filterなど）
- [ ] 変更の影響範囲を文書化した

### 10.2 変更後チェックリスト

- [ ] デスクトップ表示で確認した
- [ ] モバイル表示（960px以下）で確認した
- [ ] タブレット表示（768px以上）で確認した
- [ ] 検索機能が正常に動作するか確認した
- [ ] 地図の表示が正常か確認した
- [ ] 店舗詳細モーダルが正常に表示されるか確認した
- [ ] ボトムナビが正常に動作するか確認した
- [ ] z-indexの重なりが正しいか確認した
- [ ] アニメーションが正常に動作するか確認した

---

## 11. よくある問題と解決策

### 11.1 問題: 要素が重なってしまう

**原因**:
- z-indexの値が適切でない
- positionの指定が間違っている
- 親要素のoverflow設定

**解決策**:
1. z-index階層マップを確認
2. 親要素のpositionを確認（relativeが必要な場合がある）
3. overflow: hiddenが意図せず適用されていないか確認

---

### 11.2 問題: レスポンシブでレイアウトが崩れる

**原因**:
- 固定値（px）を使用している
- calc()の計算が間違っている
- メディアクエリが不足している

**解決策**:
1. 可能な限り相対値（%, vw, vh）を使用
2. calc()の計算式を再確認
3. 主要なブレークポイントでテスト

---

### 11.3 問題: マージンが予期しない動作をする

**原因**:
- マージンの相殺（margin collapse）
- 親要素のpaddingとの関係
- flexbox/gridのgapとの競合

**解決策**:
1. marginの代わりにpaddingを使用
2. flexbox/gridのgapを活用
3. 親要素に`display: flex`や`display: grid`を設定

---

## 12. まとめ

### 12.1 重要なポイント

1. **DOM階層を完全に把握する**
   - 親子関係、Portalの使用、条件付きレンダリング

2. **CSS適用関係を理解する**
   - どのSCSSがどのコンポーネントに適用されるか
   - グローバルスタイルの影響範囲

3. **ポジショニングとz-indexを管理する**
   - 絶対配置の基準点
   - z-index階層の体系化

4. **サイズ・間隔の依存関係を把握する**
   - 計算値の意味
   - 変数化による管理

5. **段階的な変更とテスト**
   - 一度に複数の変更を行わない
   - 各変更後に動作確認

### 12.2 Phase1実装時の推奨アプローチ

1. **検索バーのフローティング化**から開始
   - 影響範囲が限定的
   - 視覚的な効果が高い

2. **ボトムナビの整理**を次に実施
   - 独立したコンポーネント
   - 影響範囲が明確

3. **角丸とシャドウの統一**を最後に実施
   - 複数ファイルにまたがるが、レイアウトへの影響は小さい

各変更は独立したコミットとし、動作確認後に次の変更に進む。

---

## 付録: ファイル参照マップ

### 主要コンポーネントとそのスタイル

```
App.tsx
├── App.scss
│   ├── .app-body
│   └── .app-footer
└── Container.scss (間接的)
    └── .app

Home.tsx
├── Home.scss
│   └── .home
└── SearchFeature.tsx
    └── SearchFeature.scss
        ├── .search-feature
        ├── .search-input-container
        ├── .filter-container
        └── .search-results

Tabbar.tsx
└── Tabbar.scss
    └── .tabbar

Shop.tsx (Portal経由)
└── Shop.scss
    ├── .shop-single
    ├── .head
    ├── .container
    ├── .action-buttons
    └── .image-modal

Map.tsx (LazyMap経由)
└── Map.scss (地図コントロール用)
```

---

**最終更新**: 2025-01-XX  
**作成者**: AI Assistant  
**目的**: Phase1実装前の構造把握と破綻防止

