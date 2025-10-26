# 検索結果リストデザイン改善実装プラン

## 📋 現状分析

### 現在のデザインの問題点
1. **配色の問題**
   - `SearchFeature.scss`で交互配色（`#dbfde298` と `#ffffff`）を使用
   - 表のような印象で地図アプリの軽快さに欠ける
   - モダンなカードデザインではない

2. **レイアウトの問題**
   - 情報が縦に並んでいて情報過多に見える
   - 視覚的な階層構造が不明確
   - 営業状況の視覚的な区別が不十分

3. **フォントスタイルの問題**
   - 統一感のないフォントサイズ（12px〜17px）
   - 重要度に応じた視覚的な重み付けが不足

## 🎨 改善案1: カードデザイン化

### A. 基本カードスタイル

#### 対象ファイル
- `src/App/SearchFeature.scss`
- `src/App/SearchResultItem.scss`
- `src/App/SearchResultsPanel.scss`

#### 実装内容

**1. 背景とカードの基本スタイル**
```scss
// SearchResultsPanel.scss の更新
.search-results-panel {
  background-color: #F7F8FA; // 薄いグレー背景
  
  .results-list {
    padding: 8px;
    gap: 8px;
    display: flex;
    flex-direction: column;
  }
}

// SearchFeature.scss の .result-item 更新
.result-item {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  padding: 16px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  
  // 交互配色を削除
  &:nth-child(odd),
  &:nth-child(even) {
    background-color: white;
  }
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
  }
}
```

**2. SearchResultItem.scss の更新**
```scss
.search-result-item {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  padding: 16px;
  margin-bottom: 8px;
  border-bottom: none; // 既存のボーダーを削除
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
    background-color: white; // ホバー色を白に統一
  }
}
```

### B. アクセントカラー（ステータスバー）

#### 実装内容

**1. ステータスバーの追加**
```scss
.result-item,
.search-result-item {
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  
  // 営業中の店舗
  &.status-open::before {
    background-color: #4CAF50;
  }
  
  // 閉店中の店舗
  &.status-closed::before {
    background-color: #B0BEC5;
  }
  
  // 営業時間不明の店舗
  &.status-unknown::before {
    background-color: #FFC107;
  }
}
```

**2. TypeScript側での営業状況判定ロジック追加**
- `SearchFeature.tsx` と `SearchResultItem.tsx` で営業状況を判定
- 現在時刻と営業時間を比較してクラス名を動的に付与

## 🔄 改善案2: 情報レイアウト改善

### レイアウト構造の変更

#### 対象ファイル
- `src/App/SearchFeature.tsx`
- `src/App/SearchResultItem.tsx`

#### 実装内容

**1. 新しいHTML構造**
```tsx
// SearchResultItem.tsx の構造例
<div className={`search-result-item ${getStatusClass(shop)}`}>
  <div className="item-header">
    <div className="item-name-section">
      <h3 className="item-name">{shop.店名}</h3>
      <div className="item-badges">
        <span className={`status-badge ${getStatusClass(shop)}`}>
          {getStatusText(shop)}
        </span>
      </div>
    </div>
    <div className="item-image-container">
      <img className="item-image" src={image} alt={shop.店名} />
    </div>
  </div>
  
  <div className="item-details">
    <div className="detail-row">
      <span className="detail-icon">🕒</span>
      <span className="detail-label">営業時間</span>
      <span className="detail-value">{shop.営業時間}</span>
    </div>
    <div className="detail-row">
      <span className="detail-icon">📅</span>
      <span className="detail-label">定休日</span>
      <span className="detail-value">{shop.定休日}</span>
    </div>
    <div className="detail-row">
      <span className="detail-icon">📍</span>
      <span className="detail-label">住所</span>
      <span className="detail-value">{shop.住所}</span>
    </div>
  </div>
</div>
```

**2. 対応するSCSSスタイル**
```scss
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.item-name-section {
  flex: 1;
  margin-right: 12px;
}

.item-badges {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  
  &.status-open {
    background-color: #E8F5E8;
    color: #2E7D32;
  }
  
  &.status-closed {
    background-color: #F5F5F5;
    color: #757575;
  }
  
  &.status-unknown {
    background-color: #FFF8E1;
    color: #F57C00;
  }
}



.item-details {
  border-top: 1px solid #F0F0F0;
  padding-top: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.detail-icon {
  width: 16px;
  margin-right: 8px;
  font-size: 12px;
}

.detail-label {
  min-width: 60px;
  color: #666;
  margin-right: 8px;
}

.detail-value {
  color: #333;
  flex: 1;
}
```

## 🔤 改善案3: フォントと文字スタイル

### フォントスタイルの統一

#### 実装内容

```scss
// 店名
.item-name {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  line-height: 1.3;
  margin: 0 0 6px 0;
}

// 営業中バッジ
.status-badge {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

// サブ情報（営業時間など）
.detail-label {
  font-size: 13px;
  font-weight: 400;
  color: #666;
}

.detail-value {
  font-size: 13px;
  font-weight: 400;
  color: #333;
}

// 住所（最も小さく）
.detail-row:last-child .detail-value {
  font-size: 12px;
  color: #888;
}
```

## 📱 実装手順

### Phase 1: 基本カードデザイン
1. `SearchResultsPanel.scss` の背景色変更
2. `SearchFeature.scss` の交互配色削除とカードスタイル追加
3. `SearchResultItem.scss` のカードスタイル追加
4. ホバーエフェクトとシャドウの統一

### Phase 2: ステータスバーとバッジ
1. 営業状況判定ロジックの実装（TypeScript）
2. ステータスバー用のCSS追加
3. バッジコンポーネントの実装
4. 動的クラス名の付与

### Phase 3: レイアウト構造変更
1. HTML構造の変更（TSXファイル）
2. 新しいレイアウト用のSCSS実装
3. アイコンとラベルの追加
4. レスポンシブ対応

### Phase 4: フォントスタイル統一
1. フォントサイズの統一
2. カラーパレットの統一
3. 行間とマージンの調整
4. 全体的な視覚的バランスの調整

## 🎯 期待される効果

1. **視覚的な改善**
   - モダンなカードデザインによる洗練された印象
   - 営業状況の直感的な理解
   - 情報の階層構造の明確化

2. **ユーザビリティの向上**
   - 重要な情報（店名、営業状況）の視認性向上
   - 一目で営業中かどうかが分かる
   - Google Maps風の親しみやすいデザイン

3. **ブランド価値の向上**
   - 地図アプリとしての軽快さとモダンさの表現
   - 統一感のあるデザインシステム
   - ユーザーエクスペリエンスの向上

## ⚠️ 注意事項

1. **既存機能の保持**
   - 検索機能、フィルタリング機能は変更しない
   - 画像表示ロジックは既存のものを維持
   - クリックイベントなどの動作は保持

2. **パフォーマンス考慮**
   - CSS Transitionは軽量に保つ
   - 画像の遅延読み込みは維持
   - 大量の検索結果でもスムーズに動作

3. **レスポンシブ対応**
   - モバイルデバイスでの表示も考慮
   - タッチデバイスでのホバーエフェクト調整
   - 小さな画面でも情報が読みやすい設計