# 地図のfilterが効かない原因分析

## 問題

CSS `filter`を`.maplibregl-map`と`.mapboxgl-map`に適用したが、見た目の変化がない。

## 原因の仮説

### 仮説1: セレクタがマッチしていない

**問題点**:
- Geolonia Mapsは`mapNode.current`（div要素）をコンテナとして使用
- 地図キャンバス（`.maplibregl-map`）は地図初期化後に動的に生成される
- 初期化前には`.maplibregl-map`クラスが存在しない

**確認方法**:
- ブラウザの開発者ツールで実際のDOM構造を確認
- `.maplibregl-map`クラスが存在するか確認

### 仮説2: タイミングの問題

**問題点**:
- 地図が完全に読み込まれる前にスタイルが適用される
- 地図の初期化は非同期で行われる

**確認方法**:
- `map.on('load')`イベント後にスタイルを適用する必要がある可能性

### 仮説3: 親要素への適用が必要

**問題点**:
- `mapNode.current`（親要素）に直接filterを適用する必要がある可能性
- 地図キャンバスは親要素の中に生成される

**確認方法**:
- 親要素（`mapNode.current`）に直接filterを適用してみる

### 仮説4: スタイルの優先度の問題

**問題点**:
- 他のスタイルで上書きされている可能性
- `!important`が必要な可能性

**確認方法**:
- ブラウザの開発者ツールで適用されているスタイルを確認

## 推奨される解決策

### 解決策1: 親要素に直接適用（最も確実）

`mapNode.current`（親要素）に直接filterを適用する。

**実装方法**:
```scss
/* Map.tsxのmapNode.current（div要素）に適用 */
/* このdiv要素は地図のコンテナとして使用される */
```

ただし、`mapNode.current`には特定のクラス名がないため、Reactの`style`プロパティで直接適用するか、親要素を特定する必要がある。

### 解決策2: 地図読み込み後に適用

`map.on('load')`イベント後に、JavaScriptで直接スタイルを適用する。

**実装方法**:
```typescript
map.on('load', () => {
  const canvas = map.getCanvasContainer();
  if (canvas) {
    canvas.style.filter = 'saturate(0.6) brightness(1.05) contrast(1.02)';
  }
});
```

### 解決策3: より具体的なセレクタを使用

Geolonia Mapsが生成する実際のDOM構造に基づいたセレクタを使用する。

**確認が必要**:
- 実際のDOM構造
- Geolonia Mapsが使用するクラス名

## 次のステップ

1. ブラウザの開発者ツールで実際のDOM構造を確認
2. `.maplibregl-map`クラスが存在するか確認
3. 存在する場合、スタイルが適用されているか確認
4. 存在しない場合、親要素への適用を試す
5. それでも効かない場合、JavaScriptで動的に適用する

