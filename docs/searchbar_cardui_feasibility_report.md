# 検索バー・カード型UI 変更詳細検証レポート

## 1. 検証目的
ユーザーから「検索バーや上のボタンを編集するだけでも上手くいかず不具合が出て断念した」という経緯があるため、CSS・DOM構造を徹底的に調査し、変更が本当に可能かを評価する。

---

## 2. 現在のCSS・DOM構造分析

### 2.1. DOM階層 (レンダリング順序)

```
#root
└── .app (App.tsx)
    ├── .app-body (height: calc(100% - 68px - env(safe-area-inset-bottom)))
    │   └── PageTransition
    │       └── Routes (ルーティング先)
    │           └── .home (Home.tsx) [position: relative]
    │               └── .search-feature (SearchFeature.tsx) [position: relative, z-index: 6]
    │                   ├── .search-input-container [position: absolute, top/left: clamp(...)]
    │                   ├── .filter-container [position: absolute, top: calc(...)]
    │                   └── .search-results [position: absolute, top: calc(...), z-index: 999]
    │
    ├── LazyMap (persistentMap) [position: absolute, z-index: 5]
    │   └── Map.tsx
    │       └── Geolonia Map Canvas
    │           ├── .maplibregl-ctrl-top-right (現在地ボタン等)
    │           └── .maplibregl-ctrl-bottom-right (著作権表示) ← !important で位置調整中
    │
    ├── #modal-root (Shop.tsx がPortalで挿入)
    │   └── .shop-single [position: absolute, z-index: 50, bottom: 60px]
    │
    └── .app-footer [position: absolute, bottom: 0, z-index: 100]
        └── Tabbar
```

### 2.2. z-index 階層 (design-tokens.scss)

| トークン名 | 値 | 対象 |
|------------|------|------|
| `base` | 0 | - |
| `app` | 2 | - |
| `map` | 5 | LazyMap |
| `search` | 6 | .search-feature |
| `shop-actions` | 20 | .action-buttons |
| `shop-modal` | 50 | .shop-single |
| `footer` | 100 | .app-footer |
| `search-results-panel` | 999 | .search-results |
| `dropdown` | 1000 | フィルタードロップダウン |
| `modal` | 1000 | 画像拡大モーダル等 |

**判断**: z-index の設計は体系的であり、互いに干渉しにくい構造になっている。

---

## 3. 過去に発生した可能性のある不具合の仮説

### 3.1. 仮説1: `.search-feature` の `position: relative` がスタックコンテキストを作成し、子要素の `z-index` がグローバルに効かなかった

**検証結果**:
- `SearchFeature.scss` の `.search-feature` は `position: relative` かつ `z-index: z-index(search)` (= 6) を持っています。
- これにより、`.search-feature` 自体が新しいスタックコンテキストを形成し、その子要素 (`.search-input-container`, `.filter-container`) の `z-index` は**親の範囲内**でのみ有効となります。
- **しかし**、`.search-feature` 全体の `z-index: 6` は `.home` のスタックコンテキスト内で評価され、`LazyMap` (z-index: 5) より上に表示されます。
- **結論**: この構造は正しく機能するはずです。ただし、**`.home` 自体に `z-index` が設定されていない**ため、`.home` はスタックコンテキストを形成**しておらず**、子要素の `z-index` は `.app` レベルで評価されます。

### 3.2. 仮説2: Map.scss の `!important` ルールとの競合

**検証結果**:
- `Map.scss` には 26 個の `!important` ルールがあります。
- これらは**すべて** `.maplibregl-*` や `.mapboxgl-*` といった**Geolonia/MapLibre のコントロール要素**に対するものです。
- **SearchFeature や Tabbar には適用されません**。
- **結論**: `!important` ルールは SearchFeature の変更には影響しません。

### 3.3. 仮説3: `calc()` + `clamp()` の複雑な計算式によるブラウザ互換性

**検証結果**:
- `SearchFeature.scss` では `top: calc(clamp(0.5rem, 1.5vw, 1rem) + layout(...) + ...)` のような**高度にネストされた計算式**が使用されています。
- 一部の古いブラウザや特定バージョンの Safari では、このような複雑な計算式でレンダリングの予測不能な挙動が発生する可能性があります。
- **推測**: 過去の不具合はこの計算式の評価順序やデバイス固有の解釈の違いに起因した可能性があります。
- **結論**: **可能性あり**。改善案として、計算式を簡略化するか、CSS カスタムプロパティ (`--var`) を活用して段階的に計算させることが有効です。

### 3.4. 仮説4: `.app-body` の `overflow: hidden` が子要素の `position: fixed` 相当の配置を妨げた

**検証結果**:
- `.app-body` は `overflow-y: auto` を持ちます (`.app-body` がスクロールする)。
- `.home` はその子であり、`overflow: hidden` を持っています。
- **`.search-feature` は `.home` 内の `position: absolute` 要素であるため、`.home` のサイズ・位置に依存します。**
- `.home` が何らかの理由で高さ 0 になった場合、子要素が見えなくなります。
- **結論**: **可能性あり**。ただし現状は `height: 100%` が設定されているため、通常は問題ないはずです。

---

## 4. 変更可能性の結論

| 項目 | 判定 | 理由 |
|------|------|------|
| **検索バーのスタイル変更（色、角丸、シャドウ）** | ✅ 可能 | z-index 階層が明確であり、`!important` の競合がない |
| **検索バーの位置調整（微調整）** | ⚠️ 要注意 | `calc()` + `clamp()` の複雑な計算式がある。単純化または CSS 変数化を推奨 |
| **フィルターボタンのスタイル変更** | ✅ 可能 | 上記と同様 |
| **カード型UI（ボトムシート）の新規追加** | ✅ 可能（条件付き） | `.shop-single` の構造を参考に、`z-index: 50`、`bottom: 60px` の原則を守れば可能。ただし、Geolonia 著作権表示 (`bottom: calc(60px + ...)`) との干渉を避けるため、`map.setPadding()` の併用を推奨 |
| **検索バーを画面下部へ移動** | ❌ 非推奨 | Geolonia 著作権表示との干渉が確実であり、法的・UX両面でリスクが高い |

---

## 5. 安全に変更を行うための推奨手順

### 5.1. スタイルのみ変更する場合（低リスク）
1. `SearchFeature.scss` の `.search-input-container` 内のスタイル（`background`, `border-radius`, `box-shadow`）を変更する。
2. `position`, `top`, `left`, `width` には**触れない**。
3. 変更後、Chrome DevTools でレンダリングを確認し、iOS Safari 実機でもテストする。

### 5.2. 位置計算を変更する場合（中リスク）
1. `design-tokens.scss` に新しい CSS カスタムプロパティを追加し、`calc()` の中間値を定義する。
   例: `--search-top-total: calc(var(--search-top-offset) + var(--search-input-height) + var(--search-filter-gap));`
2. `SearchFeature.scss` で直接 `layout()` 関数を呼ぶのではなく、カスタムプロパティを参照するように変更。
3. ブラウザ互換性のリスクを軽減。

### 5.3. カード型UI（ボトムシート）を新規追加する場合（中〜高リスク）
1. `Shop.tsx` の構造を参考にする（`position: absolute`, `bottom: 60px`, `z-index: 50`）。
2. **重要**: `Map.tsx` で `mapObject.setPadding({ bottom: <カードの高さ> })` を動的に設定し、著作権表示と中心座標がカードに隠れないようにする。
3. これにより、CSS ハックなしで Geolonia コントロールとの干渉を回避できる。

---

## 6. 総合結論

**「検索バーや上のボタンを編集するだけでも上手くいかなかった」原因として最も可能性が高いのは、`calc()` と `clamp()` のネストによるブラウザ固有のレンダリング問題、または `.home` の高さが特定条件下で 0 になったことによる子要素の非表示化です。**

**現在のコード構造自体は、z-index 設計が明確であり、変更は可能です。**
ただし、以下を守ることを強く推奨します：

1. **`position`, `top`, `left` の計算式には極力触れない**（スタイルのみ変更）。
2. **位置を変える必要がある場合は、CSS カスタムプロパティを活用して計算式を簡略化する。**
3. **ボトムシートを追加する場合は、`map.setPadding()` を使用して Geolonia 著作権表示との干渉を回避する。**

これらを守れば、UI 改善は**安全に実施可能**です。
