# Geolonia/Mapbox UI 改善実現性調査レポート

## 1. 調査目的
Geolonia (Mapbox GL JS ベース) を使用した現在のマップ実装において、UI/UX 改善提案（マップスタイルの変更、マーカーのカスタム化、カード型UIの導入）が技術的に実現可能か、および過去に発生した問題（「独自の描画で上手く行かなかった」）の原因と解決策を明確にすること。

## 2. システム構成・依存関係の分析

### 2.1. ライブラリ依存関係
*   **Geolonia読み込み**: `npm` パッケージではなく、`index.html` 内の `<script>` タグ (`cdn.geolonia.com/v1/embed`) から `window.geolonia` として読み込まれています。
*   **API**: `window.geolonia.Map` を使用していますが、これは `mapbox-gl` (v1系 または MapLibre) のラッパーであり、Mapbox GL JS 互換の API を持ちます。
*   **重要設定**:
    *   `data-marker="off"`: 自動マーカー描画が無効化されています。これは**非常に良い兆候**です。Geolonia の自動機能をバイパスし、React 側 (`Map.tsx`) で `map.addLayer` を使って独自に描画しているため、マーカーの完全な制御が可能です。
    *   `data-geolocate-control="off"`: 自動現在地ボタンも無効化されています。

### 2.2. DOM構造とスタックコンテキスト (Z-index)
現在のレイアウト構造は以下のようになっています：

1.  **Map Container** (`LazyMap` in `App.tsx`)
    *   `position: absolute`
    *   `z-index: 5` (ホーム画面時)
    *   `height`: フッター分 (`70px`) を除いた高さ
2.  **Footer** (`.app-footer` in `App.scss`)
    *   `position: absolute`, `bottom: 0`
    *   `z-index: 100`

**過去の失敗（推測）**:
過去に UI 変更がうまくいかなかった原因は、Geolonia が動的に挿入するコントロール（著作権表示など）の Z-index や配置ルール、そして Map コンテナ自体の高さ計算とフッターの干渉において、CSS の競合が発生したためと考えられます。特に、Geolonia の埋め込みスクリプトは一部のスタイルを強制 (`!important`) することがあるため、単純な CSS では勝てない場合があります。

## 3. UI/UX 改善提案の実現性評価

### 3.1. マップスタイルの刷新 (Map Style)
*   **判定: 実現可能 (High Feasibility)**
*   **方法**: `Map.tsx` の `style: 'geolonia/basic'` を変更します。
*   **詳細**:
    *   `geolonia/midnight` などのプリセットスタイルが利用可能です（APIキーに紐付くプランによるが、通常は基本スタイル群は利用可）。
    *   または、自作の `style.json` を `/public` に配置し、その URL を指定することで、完全に自由な配色（ダークモード等）を適用できます。CSS `filter` に頼る必要はありません。

### 3.2. マーカーのアイコン化 (Custom Markers)
*   **判定: 実現可能 (High Feasibility)**
*   **方法**: 現在の `circle` レイヤーを `symbol` レイヤーに変更します。
*   **詳細**:
    *   既に `data-marker="off"` で自動描画を回避しているため、`Map.tsx` の `updateMarkers` 関数内で `map.loadImage()` を使い画像を読み込み、`layout: { 'icon-image': '...' }` を設定する標準的な Mapbox GL JS の手法がそのまま動作します。
    *   Geolonia 独自の制約はここには影響しません。

### 3.3. カード型 UI / 検索バーの導入
*   **判定: 条件付き実現可能 (Conditional Feasibility)**
*   **課題**: 著作権表示 (Attribution) との兼ね合い。
*   **解決策**:
    *   新しい UI 要素（検索バーやカード）は、Map コンテナの **外側**（`App.tsx` レベル）ではなく、**兄弟要素**として配置し、適切な `z-index` (例: 10〜50) を設定します。
    *   **重要**: 地図の下部にカードを表示する場合、Geolonia の著作権表示が隠れてしまう可能性があります。これを防ぐため、`map.setPadding({ bottom: 200 })` のように Mapbox のパディング機能を使って、地図の「論理的な表示領域」をずらすことで、著作権表示や中心座標をカードの上に自動的に移動させることができます。これは CSS ハックよりも安全で確実な方法です。

## 4. 結論と推奨手順

提案した UI 改善は、**現在のシステム構成（Geolonia Embed API）上で完全に実現可能**です。
「Geolonia 独自の描画」による制限は、`data-marker="off"` 等の属性ですでに回避されており、実質的に Mapbox GL JS アプリケーションとして自由に構築できる状態にあります。

**推奨する次のステップ**:
1.  **スタイル変更**: `geolonia/midnight` への切り替えテスト。
2.  **マーカー変更**: SVG アイコンを用いた `symbol` レイヤーへの書き換え。
3.  **UI実装**: `map.setPadding` を活用した、著作権表示と干渉しないカード UI の実装。

このアプローチであれば、過去の「上手く行かなかった」干渉問題を回避しつつ、モダンな UI を構築できます。
