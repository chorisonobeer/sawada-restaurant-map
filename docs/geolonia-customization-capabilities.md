# Geolonia Maps カスタマイズ機能まとめ

## 概要

Geolonia Mapsで可能なカスタマイズ機能について、公式ドキュメントを基にまとめました。

**参考資料**:
- [カスタムスタイル](https://docs.geolonia.com/custom-style/)
- [マーカーをカスタマイズ](https://docs.geolonia.com/cookbook/003/)

---

## 1. カスタムスタイル

### 1.1 利用可能なスタイル

Geoloniaでは、デフォルトのスタイル `geolonia/basic` 以外にも以下のスタイルが用意されています：

- `geolonia/basic` - デフォルトスタイル
- `geolonia/midnight` - ダークテーマ（カスタマイズしやすい）
- `geolonia/red-planet` - レッドプラネットテーマ
- `geolonia/notebook` - ノートブックテーマ

### 1.2 カスタムスタイルの作成方法

#### Maputnikを使用したGUI編集

**ツール**: [Maputnik](https://editor.geolonia.com/) - MapLibre GL JSベースの地図スタイルをGUIで編集できるオープンソースソフトウェア

**推奨手順**:
1. `geolonia/midnight`をベースにする（レイヤー数が少なく、色の数も絞られているため編集しやすい）
2. Maputnikでスタイルを編集
3. スタイルをJSON形式でエクスポート
4. サーバーにアップロードして使用

**GitHubでの公開**:
- すべてのスタイルはGitHubで公開されている
- GitHubページ上では無料で使用可能
- APIキーの変更が不要（`YOUR-API-KEY`のままで使用可能）

### 1.3 カスタマイズ可能な要素

#### 背景色（Background）

**編集方法**:
1. 左側のレイヤー選択メニューで `background` をクリック
2. カラーピッカーで色を選択（例: `rgba(19, 28, 54, 1)`）

**用途**: 地図全体の背景色を変更

#### 海・川などの水の色（Water）

**編集方法**:
1. 地図上で海をクリック
2. ツールチップ内の `water` をクリック
3. 左側のサイドバーで `water` レイヤーが選択される
4. カラーピッカーで色を選択

**用途**: 海、川、湖などの水の色を変更

#### 建物の色（Building）

**編集方法**:
1. 地図上で建物をクリック
2. ツールチップ内の `building` をクリック
3. 複数のレイヤーが重なっている場合は、編集したいレイヤーを選択
4. カラーピッカーで色を選択

**用途**: 建物の色を変更

#### テキスト（POI - Point of Interest）

**編集方法**:
1. 地図上で店舗などのPOIをクリック
2. ツールチップ内の `poi` をクリック
3. 左側のサイドバーで "Text paint properties" を探す
4. テキストの色（`Color`）や輪郭の色（`Halo color`）を変更

**用途**: 地図上に表示されるテキスト（店舗名、地名など）のスタイルを変更

**注意点**:
- フォントの変更は可能だが、日本語フォントを埋め込むには：
  - フォントのフォーマットを変更する必要がある
  - 独自にホスティングする必要がある
  - ファイルサイズが非常に大きくなる
  - 地図の表示に時間がかかる
- Geoloniaでは、ユーザーのローカルフォントを使用するようにEmbed APIにて設定されているため、フォントを変更しても意図したとおりに表示されない

**参考**: [MapLibre GL JS - Local Ideographs](https://maplibre.org/maplibre-gl-js-docs/example/local-ideographs/)

### 1.4 カスタムスタイルの使用

#### 1. APIキーの設定

**手順**:
1. Maputnikのメニューの "Data Sources" をクリック
2. ポップアップウインドウ内の `YOUR-API-KEY` を、ダッシュボードで取得したAPIキーに変更
3. エンターキーをクリック
4. 右上の "X" ボタンをクリックして保存

**注意点**:
- APIキーに対して、あらかじめ `https://editor.geolonia.com` を許可しておかないと、APIキーを変更後に地図が表示されなくなる可能性がある
- この設定は必須ではない
- GitHubページを利用する場合は、APIキーは `YOUR-API-KEY` のままで使用可能

#### 2. スタイルのアップロードと使用

**手順**:
1. Maputnikの上部メニューにある "Export" をクリック
2. ポップアップ内の "Download" をクリック
3. JSONフォーマットのファイルをダウンロード
4. ウェブサーバーにアップロード
5. HTMLにスタイルのURLを記述

**HTMLでの使用例**:
```html
<div class="geolonia" data-style="https://example.com/my-style.json">
```

**推奨**: 手早く試したい場合は、GitHubにアップロードするのがおすすめ（無料で使用可能）

### 1.5 スタイルテンプレート

Geolonia Mapsは、スタイルのテンプレートをGitHubのOrganizationで公開しています。

**例**: [Basic スタイルのテンプレートレポジトリ](https://github.com/geoloniamaps/basic)

直接スタイルをカスタマイズしたい場合は、これらのテンプレートレポジトリを編集してください。

### 1.6 高度なカスタマイズ

MapLibre GL JSの機能を活用することで、以下のような高度なカスタマイズが可能です：

- **条件付き表示**: ズームレベルや各地物が持つプロパティなどの条件に応じて表示非表示を切り替えたりデザインを切り替える
- **道路の幅**: ズームレベルに応じて道路の幅を切り替える
- **ズームレベル固定**: ズームレベルを特定の範囲内に固定する
- **ヒートマップ**: 各地物がもつメタデータに含まれる数字を元にヒートマップを表示する

**参考**: [MapLibre GL JS Style Specification](https://maplibre.org/maplibre-gl-js-docs/style-spec/)

**JavaScript API**: JavaScriptを使用してダイナミックにスタイルを変更することも可能

---

## 2. マーカーのカスタマイズ

### 2.1 マーカーの色をカスタマイズ

#### data-marker-color属性を使用

**基本的な使用方法**:
```html
<div
  class="geolonia"
  data-lat="35.7101"
  data-lng="139.8107"
  data-zoom="16"
  data-marker-color="#003399"
>スカイツリー</div>
```

**透過度の指定**:
```html
<div
  class="geolonia"
  data-lat="35.7101"
  data-lng="139.8107"
  data-zoom="16"
  data-marker-color="rgba(255, 0, 0, 0.4)"
>スカイツリー</div>
```

**説明**:
- `data-marker-color`属性でマーカーの色を指定
- 16進数カラーコード（例: `#003399`）またはRGBA（例: `rgba(255, 0, 0, 0.4)`）で指定可能
- RGBAを使用することで透過度も指定可能

### 2.2 複数マーカーのカスタマイズ

#### JavaScript APIを使用

**特徴**:
- GeoJSONフォーマットのオープンデータを読み込む
- 一定の条件でマーカーの色を変える
- 複数マーカーの設置を含めたあらゆることが可能

**用途**: 動的なマーカーの色変更、条件に応じたスタイル変更など

#### GeoJSONを使用

**特徴**:
- GeoloniaのEmbed APIはGeoJSONフォーマットに対応
- Simplestyleという仕様にも対応
- JavaScriptに比べて制限はあるが、マーカーの色等を変えることも可能

**用途**: 複数マーカーの表示、シンプルなスタイル変更など

**参考**:
- [GeoJSON で複数のマーカーを表示](https://docs.geolonia.com/cookbook/004/)
- [GeoJSON 仕様](https://docs.geolonia.com/geojson/)

---

## 3. 実装プランへの適用可能性

### 3.1 地図の彩度を下げる（Desaturation）

**実装方法**:
- **方法1**: CSS `filter`プロパティを使用（推奨）
  - マップコンテナに`filter: saturate(0.6) brightness(1.05)`を適用
  - 実装が簡単で、パフォーマンスへの影響も軽微

- **方法2**: カスタムスタイルを作成
  - Maputnikで`geolonia/midnight`をベースにスタイルを編集
  - 各レイヤー（background, water, building等）の色を彩度の低い色に変更
  - より細かい制御が可能だが、実装コストが高い

**推奨**: 方法1（CSS filter）を推奨。実装が簡単で、効果も十分。

### 3.2 マーカーのデザイン刷新

**実装方法**:
- **現在の実装**: Mapbox GL JSの`circle`レイヤーを使用
- **カスタマイズ可能な要素**:
  - マーカーの色（`circle-color`）
  - マーカーのサイズ（`circle-radius`）
  - マーカーの輪郭（`circle-stroke-width`, `circle-stroke-color`）
  - マーカーの透明度（`circle-opacity`）

**制約**:
- Mapbox GL JSは`circle`タイプのみサポート（四角形は不可）
- 写真サムネイルの表示は複雑（パフォーマンスへの影響が大きい）

**推奨**: 現在の実装を維持し、色・サイズ・輪郭を調整する方針

### 3.3 地図スタイルのカスタマイズ

**実装方法**:
- カスタムスタイルを作成し、`data-style`属性で指定
- または、JavaScript APIで動的にスタイルを変更

**用途**:
- 地図全体の色調を変更（ダークテーマ、カスタムカラーテーマなど）
- 特定のレイヤー（海、建物、道路など）の色を変更

**注意点**:
- カスタムスタイルの作成には時間がかかる
- スタイルファイルのホスティングが必要
- パフォーマンスへの影響を考慮する必要がある

**推奨**: Phase 3（長期的な改善）で検討

---

## 4. まとめ

### 実装可能なカスタマイズ

| カスタマイズ項目 | 実装方法 | 難易度 | 優先度 |
|----------------|---------|--------|--------|
| **地図の彩度を下げる** | CSS `filter` | 低 | 高 |
| **マーカーの色・サイズ** | Mapbox GL JSのレイヤープロパティ | 低 | 高 |
| **マーカーの輪郭** | `circle-stroke-width`, `circle-stroke-color` | 低 | 高 |
| **地図スタイルの変更** | カスタムスタイル（Maputnik） | 高 | 低 |

### 実装プランへの反映

1. **Phase 1（即座に実装可能）**:
   - CSS `filter`で地図の彩度を下げる
   - マーカーの色・サイズ・輪郭を調整

2. **Phase 2（中期的な改善）**:
   - マーカーの選択状態の強調
   - クラスターのデザイン改善

3. **Phase 3（長期的な改善）**:
   - カスタムスタイルの作成（オプション）
   - 地図全体の色調変更（オプション）

---

## 5. 参考リンク

- [Geolonia Maps - カスタムスタイル](https://docs.geolonia.com/custom-style/)
- [Geolonia Maps - マーカーをカスタマイズ](https://docs.geolonia.com/cookbook/003/)
- [MapLibre GL JS Style Specification](https://maplibre.org/maplibre-gl-js-docs/style-spec/)
- [MapLibre GL JS - Local Ideographs](https://maplibre.org/maplibre-gl-js-docs/example/local-ideographs/)
- [Geolonia Maps - Basic スタイルテンプレート](https://github.com/geoloniamaps/basic)

