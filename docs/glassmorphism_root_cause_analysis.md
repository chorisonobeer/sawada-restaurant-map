# グラスモーフィズム機能不全 根本原因分析レポート

## 1. 調査結論

**判定: 条件付きで実装可能（修正が必要）**

グラスモーフィズムが機能していない根本原因は**2つ**あり、両方を修正する必要があります。

---

## 2. 根本原因

### 原因1: 背景の不透明度が高すぎる (90%)

**現在のコード** (`SearchFeature.scss` 14行目):
```scss
background: rgba(255, 255, 255, 0.9);
```

**問題点**:
- `0.9` = 90% 不透明 = ほぼ白色
- `backdrop-filter` は機能していても、**見えるのは白色だけ**
- グラスモーフィズム効果を視認するには **60〜75%** 程度の不透明度が必要

**解決策**:
```scss
background: rgba(255, 255, 255, 0.65);
```

---

### 原因2: スタックコンテキストの階層構造

**DOM構造**:
```
.app
├── .app-body
│   └── PageTransition
│       └── .home (position: relative) ← ★ここのオーバーフロー
│           └── .search-feature (position: relative, z-index: 6)
│               └── .search-input-container (position: absolute, backdrop-filter)
│
├── LazyMap (position: absolute, z-index: 5) ← ★これが背景
```

**問題点**:
- `.search-input-container` の `backdrop-filter` は、**直接の描画レイヤーの背後**に対してのみ有効
- `.search-feature` → `.home` → `.app-body` → `.app` という階層を**超えて** `LazyMap` をぼかすことは**できない**
- **これがCSSの仕様制限であり、スタックコンテキストを超えた `backdrop-filter` は機能しない**

**補足事実**:
- `Shop.scss` の `.action-buttons` も `backdrop-filter` を使用しているが、これは `.shop-single` **内部**のコンテンツに対するブラーであり、**同じスタックコンテキスト内**なので機能する
- `SearchFeature` は `.home` の子であり、`LazyMap` は `.home` の**兄弟要素**（別のスタックコンテキスト）

---

## 3. なぜ `Shop.scss` では機能するのか

`Shop.tsx` は `ReactDOM.createPortal` によって `#modal-root` に挿入されます：

```tsx
// Home.tsx
ReactDOM.createPortal(
  <Shop ... />,
  document.getElementById('modal-root') as HTMLElement
);
```

```html
<!-- App.tsx のレンダリング結果 -->
<div class="app">
  <div class="app-body">...</div>
  <LazyMap /> <!-- z-index: 5 -->
  <div id="modal-root">
    <div class="shop-single"> <!-- z-index: 50 -->
      <div class="action-buttons" style="backdrop-filter: blur(8px)">
        <!-- ↑ これは .shop-single 内のコンテンツをぼかすので機能する -->
      </div>
    </div>
  </div>
  <div class="app-footer">...</div>
</div>
```

`.action-buttons` の `backdrop-filter` は `.shop-single` が持つ画像やテキストをぼかすため、**同じコンテキスト内**で機能します。

---

## 4. 解決策の選択肢

### 選択肢A: 背景不透明度のみ調整（効果なし）
- **不透明度を下げても、スタックコンテキストの問題は解決しない**
- `backdrop-filter` は依然として「透明な背景」しかぼかせない
- **結論: この選択肢では地図はぼけない**

### 選択肢B: SearchFeature を Map と同じ階層に移動（中規模リファクタリング）
- `SearchFeature` を `App.tsx` レベルで `LazyMap` の兄弟要素として配置
- `Home.tsx` から `SearchFeature` を切り離す
- **リスク**: ルーティング・状態管理の変更が必要

### 選択肢C: グラスモーフィズムの代替デザインを採用
- `backdrop-filter` を諦め、**半透明背景 + シャドウ + ボーダー**でモダン感を演出
- 地図は透けないが、**フロート感と高級感**は出せる
- **リスク**: 最も安全、現在の構造を変更しない

### 選択肢D: 疑似要素 (::before) でブラー効果を模倣
- `.search-input-container::before` に地図のスクリーンショットのような背景を配置
- **リスク**: 実装が複雑で、動的な背景には対応できない

---

## 5. 推奨事項

**選択肢C（代替デザイン）を推奨します。**

理由:
1. スタックコンテキストの構造問題を解決せずにグラスモーフィズムを実現することは**CSSの仕様上不可能**
2. 構造変更（選択肢B）は**リスクが高く、過去の失敗を繰り返す可能性**がある
3. 代替デザインでも十分にモダンでスタイリッシュなUIは実現可能

### 代替デザイン案

```scss
.search-input-container {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.06);
  // backdrop-filter は削除（効果がないため）
}
```

---

## 6. 最終判定

| 項目 | 結果 |
|------|------|
| グラスモーフィズム（地図が透けて見える）| **NG - 技術的に不可能（構造変更なし）** |
| 構造変更（SearchFeature移動）| 可能だが**高リスク** |
| 代替デザイン（フロート感のあるUI）| **OK - 推奨** |

**グラスモーフィズムを「地図が透けて見える効果」として実現するには、`SearchFeature` を `App.tsx` に移動する大規模リファクタリングが必要です。**

この変更を行いますか？それとも代替デザインで進めますか？
