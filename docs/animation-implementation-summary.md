# アニメーション実装まとめ

このドキュメントは、現在のアプリケーションで使用されているすべてのアニメーション実装とその動作についてまとめたものです。

## 目次

1. [ページ遷移・モーダルアニメーション](#ページ遷移モーダルアニメーション)
2. [コンポーネント表示アニメーション](#コンポーネント表示アニメーション)
3. [ローディングアニメーション](#ローディングアニメーション)
4. [ホバー・インタラクションアニメーション](#ホバーインタラクションアニメーション)
5. [トースト・通知アニメーション](#トースト通知アニメーション)
6. [実装ファイル一覧](#実装ファイル一覧)

---

## ページ遷移・モーダルアニメーション

### 1. Shop詳細画面のスライドイン/アウトアニメーション

**ファイル**: `src/App/Shop.tsx`, `src/App/Shop.scss`

**実装方法**:
- コンポーネントマウント時に`slide-in`クラスを付与して右側からスライドイン
- 閉じる際は`closing`クラスを付与してスケールダウン＋フェードアウト

**動作**:
- **表示時**: 右側（`translateX(100%)`）から中央（`translateX(0)`）へスライドイン
- **閉じる時**: スケール0.5倍＋透明度0.8に変化して閉じる

**CSS実装**:
```scss
.shop-single {
  transform: translateX(100%);  // 初期状態: 右側に配置
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
  
  &.slide-in {
    transform: translateX(0);  // スライドイン
  }
  
  &.closing {
    transform: scale(0.5);
    opacity: 0.8;
    transition: 0.8s cubic-bezier(0,.71,.93,.45);
  }
}
```

**TypeScript実装**:
```typescript
// マウント時にスライドイン
useEffect(() => {
  if (containerRef.current) {
    setTimeout(() => {
      containerRef.current?.classList.add("slide-in");
    }, 10);
  }
}, []);

// 閉じる処理
const handleClose = () => {
  setIsClosing(true);
  setTimeout(() => {
    props.close();
  }, 300); // CSSのtransition時間と合わせる
};
```

**アニメーション時間**: 
- スライドイン: 0.3秒
- 閉じる: 0.8秒（カスタムイージング）

---

### 2. PWAインストールバナーのスライドインアニメーション

**ファイル**: `src/App/PWAInstallBanner.tsx`, `src/App/PWAInstallBanner.scss`

**実装方法**:
- バックドロップのフェードインとバナー本体の上から下へのスライドインを組み合わせ

**動作**:
- **表示時**: 
  - バックドロップがフェードイン（`opacity: 0 → 1`）
  - バナーが上から下へスライドイン（`translateY(-100px) → translateY(0)`）
- **閉じる時**: 逆のアニメーション

**CSS実装**:
```scss
.pwa-install-banner-backdrop {
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  
  &.visible {
    opacity: 1;
  }
}

.pwa-install-banner {
  transform: translateY(-100px);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  &.slide-in {
    transform: translateY(0);
  }
}
```

**TypeScript実装**:
```typescript
const [isAnimating, setIsAnimating] = useState(false);

useEffect(() => {
  if (installManager.shouldShowBanner()) {
    setIsVisible(true);
    setTimeout(() => setIsAnimating(true), 100);
  }
}, [installManager]);

const handleClose = () => {
  setIsAnimating(false);
  setTimeout(() => {
    setIsVisible(false);
    onClose?.();
  }, 300);
};
```

**アニメーション時間**: 0.3秒（バウンスイージング）

---

### 3. Events詳細モーダルのフェードインアップアニメーション

**ファイル**: `src/App/Events.scss`

**実装方法**:
- モーダル表示時に下から上へフェードインしながら表示

**動作**:
- **表示時**: 下40pxから上へ移動しながらフェードイン（`opacity: 0 → 1`）

**CSS実装**:
```scss
.event-detail {
  animation: fadeInUp 0.25s;
}

@keyframes fadeInUp {
  from { 
    transform: translateY(40px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
}
```

**アニメーション時間**: 0.25秒

---

## コンポーネント表示アニメーション

### 4. AboutUsページのヒーロー画像フェードインアニメーション

**ファイル**: `src/App/AboutUs.tsx`, `src/App/AboutUs.scss`

**実装方法**:
- コンポーネントマウント後100ms経過してから`visible`クラスを付与

**動作**:
- **表示時**: 下20pxから上へ移動しながらフェードイン

**CSS実装**:
```scss
.hero-image {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 1s ease-out, transform 1s ease-out;
  
  &.visible {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**TypeScript実装**:
```typescript
const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    setIsVisible(true);
  }, 100);
  
  return () => clearTimeout(timer);
}, []);
```

**アニメーション時間**: 1秒

---

### 5. AboutUsページのスクロールキューアニメーション

**ファイル**: `src/App/AboutUs.scss`

**実装方法**:
- ヒーロー画像内のスクロールキューアイコンが上下にバウンス

**動作**:
- 無限ループで上下に6px移動

**CSS実装**:
```scss
.hero-scroll-cue {
  animation: cueBounce 1.6s ease-in-out infinite;
}

@keyframes cueBounce {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}
```

**アニメーション時間**: 1.6秒（無限ループ）

---

## ローディングアニメーション

### 6. スケルトンローディングアニメーション

**ファイル**: `src/App/List.scss`, `src/App/Shop.scss`

**実装方法**:
- ローディング中に表示されるプレースホルダーの不透明度を変化させる

**動作**:
- 不透明度が0.7〜0.9の間で変化（List.scss）
- または、背景グラデーションが左右に移動（Shop.scssのshimmerエフェクト）

**CSS実装（List.scss）**:
```scss
.skeleton {
  animation: skeleton-loading 1s linear infinite alternate;
}

@keyframes skeleton-loading {
  0% { opacity: 0.7; }
  100% { opacity: 0.9; }
}
```

**CSS実装（Shop.scss - Shimmerエフェクト）**:
```scss
.shop-image-item .skeleton {
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

**アニメーション時間**: 
- List: 1秒（無限ループ、交互）
- Shop: 1.2秒（無限ループ）

---

### 7. ローディングスピナーアニメーション

**ファイル**: `src/App/LoadingSpinner.scss`

**実装方法**:
- 複数のスピナータイプを提供（Circular, Dots, Wave, Pulse）

**動作**:

#### 7.1 Circular Spinner
- 回転アニメーション

```scss
.spinner-ring {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

#### 7.2 Dots Spinner
- 3つのドットが順番にバウンス

```scss
.dot {
  animation: bounce 1.4s ease-in-out infinite both;
  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }
  &:nth-child(3) { animation-delay: 0s; }
}

@keyframes bounce {
  0%,80%,100% { transform: scale(0); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
```

#### 7.3 Wave Spinner
- 5本のバーが順番に波打つ

```scss
.bar {
  animation: wave 1.2s ease-in-out infinite;
  &:nth-child(1) { animation-delay: 0s; }
  &:nth-child(2) { animation-delay: 0.1s; }
  // ... 5つまで
}

@keyframes wave {
  0%,40%,100% { transform: scaleY(0.4); opacity: 0.5; }
  20% { transform: scaleY(1); opacity: 1; }
}
```

#### 7.4 Pulse Spinner
- リングが拡大縮小を繰り返す

```scss
.pulse-ring {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.5; }
  100% { transform: scale(0.8); opacity: 1; }
}
```

**アニメーション時間**: 
- Circular: 1秒
- Dots: 1.4秒
- Wave: 1.2秒
- Pulse: 1.5秒

---

## ホバー・インタラクションアニメーション

### 8. カードホバーアニメーション

**ファイル**: 複数のSCSSファイル

**実装方法**:
- ホバー時に`translateY`で上に移動＋シャドウを強化

**動作例**:

#### 8.1 Eventsカード
```scss
.event-card {
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1vw);
    box-shadow: 0 4vw 12vw rgba(0, 160, 230, 0.15);
  }
}
```

#### 8.2 AboutUsカード
```scss
.usage-card {
  transition: transform .18s ease, box-shadow .18s ease;
  
  &:hover { 
    transform: translateY(-2px); 
    box-shadow: 0 8px 18px rgba(0,0,0,0.1); 
  }
}
```

#### 8.3 SearchResultItem
```scss
.search-result-item {
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
  }
}
```

**アニメーション時間**: 0.2〜0.3秒

---

### 9. ボタンホバーアニメーション

**ファイル**: 複数のSCSSファイル

**実装方法**:
- ホバー時に`translateY`で上に移動、アクティブ時に下に移動

**動作例**:

#### 9.1 PWAインストールバナーのボタン
```scss
.pwa-btn-primary {
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:active {
    transform: scale(0.95);
  }
}
```

#### 9.2 Eventsページのリンク
```scss
.event-link {
  transition: background-color 0.2s, color 0.2s, transform 0.2s;
  
  &:hover {
    transform: translateY(-0.8vw);
  }
}
```

**アニメーション時間**: 0.2秒

---

### 10. 画像ホバーアニメーション

**ファイル**: `src/App/Events.scss`

**実装方法**:
- ホバー時に画像を拡大

**動作**:
```scss
.event-card-image {
  transition: transform 0.3s ease-out;
}

.event-card:hover .event-card-image {
  transform: scale(1.05);
}
```

**アニメーション時間**: 0.3秒

---

## トースト・通知アニメーション

### 11. バージョン更新トーストアニメーション

**ファイル**: `src/index.tsx`

**実装方法**:
- トースト表示時に下から上へフェードイン、非表示時に上から下へフェードアウト

**動作**:
- **表示時**: 下20pxから上へ移動しながらフェードイン
- **非表示時**: 上から下10pxへ移動しながらフェードアウト

**CSS実装**:
```scss
.version-update-toast {
  opacity: 0;
  transform: translateX(-50%);
  transform-origin: bottom center;
  
  &.show {
    animation: toastIn 0.3s ease-out forwards;
  }
  
  &.hide {
    animation: toastOut 0.2s ease-out forwards;
  }
}

@keyframes toastIn {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes toastOut {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, 10px); }
}
```

**TypeScript実装**:
```typescript
// 表示アニメーション
requestAnimationFrame(() => toast.classList.add('show'));

// 非表示アニメーション
toast.classList.add('hide');
setTimeout(() => toast.remove(), 200);
```

**アニメーション時間**: 
- 表示: 0.3秒
- 非表示: 0.2秒

---

### 12. リップルエフェクト（トーストボタン）

**ファイル**: `src/index.tsx`

**実装方法**:
- ボタンクリック時にリップルエフェクトを表示

**動作**:
- クリック位置から円形に拡大しながらフェードアウト

**CSS実装**:
```scss
.version-update-toast .btn .ripple {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: rgba(255,255,255,0.5);
  animation: ripple 0.4s ease-out;
}

@keyframes ripple {
  from { width: 0; height: 0; opacity: 0.8; }
  to { width: 200px; height: 200px; opacity: 0; }
}
```

**TypeScript実装**:
```typescript
const addRipple = (e: MouseEvent, target: HTMLElement) => {
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${e.clientX - rect.left}px`;
  ripple.style.top = `${e.clientY - rect.top}px`;
  target.appendChild(ripple);
  setTimeout(() => ripple.remove(), 400);
};
```

**アニメーション時間**: 0.4秒

---

## 実装ファイル一覧

### TypeScript/TSXファイル

| ファイル | アニメーション種類 | 説明 |
|---------|------------------|------|
| `src/App/Shop.tsx` | スライドイン/アウト | 店舗詳細画面の表示/非表示 |
| `src/App/PWAInstallBanner.tsx` | スライドイン/フェードイン | PWAインストールバナーの表示/非表示 |
| `src/App/AboutUs.tsx` | フェードイン | ヒーロー画像の表示 |
| `src/index.tsx` | トーストアニメーション | バージョン更新通知の表示/非表示 |

### SCSSファイル

| ファイル | アニメーション種類 | 説明 |
|---------|------------------|------|
| `src/App/Shop.scss` | スライドイン/アウト、Shimmer | 店舗詳細画面、画像ローディング |
| `src/App/PWAInstallBanner.scss` | スライドイン、ホバー | PWAインストールバナー |
| `src/App/Events.scss` | フェードインアップ、ホバー | イベント詳細モーダル、カード |
| `src/App/AboutUs.scss` | フェードイン、バウンス、ホバー | ヒーロー画像、スクロールキュー、カード |
| `src/App/List.scss` | スケルトンローディング、スピン | リストローディング |
| `src/App/LoadingSpinner.scss` | スピン、バウンス、ウェーブ、パルス | ローディングスピナー各種 |
| `src/App/SearchResultItem.scss` | ホバー | 検索結果アイテム |
| `src/App/SearchFeature.scss` | ホバー | 検索機能 |

---

## アニメーション時間のまとめ

| アニメーション | 時間 | イージング |
|--------------|------|-----------|
| Shop詳細スライドイン | 0.3秒 | ease-in-out |
| Shop詳細閉じる | 0.8秒 | cubic-bezier(0,.71,.93,.45) |
| PWAバナー | 0.3秒 | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Eventsモーダル | 0.25秒 | デフォルト |
| AboutUsヒーロー | 1秒 | ease-out |
| スクロールキュー | 1.6秒 | ease-in-out（無限） |
| スケルトンローディング | 1秒 / 1.2秒 | linear / ease-in-out（無限） |
| ローディングスピナー | 1〜1.5秒 | linear / ease-in-out（無限） |
| ホバーエフェクト | 0.2〜0.3秒 | ease |
| トースト表示 | 0.3秒 | ease-out |
| トースト非表示 | 0.2秒 | ease-out |
| リップルエフェクト | 0.4秒 | ease-out |

---

## アクセシビリティ対応

### prefers-reduced-motion対応

一部のアニメーションでは、ユーザーがアニメーションを減らす設定をしている場合に無効化されます：

```scss
@media (prefers-reduced-motion: reduce) {
  .pwa-install-banner-backdrop,
  .pwa-install-banner,
  .pwa-btn {
    transition: none;
  }
  
  .version-update-toast.show, 
  .version-update-toast.hide {
    animation: none;
    opacity: 1;
  }
}
```

---

## 技術的な実装パターン

### 1. CSS Transition vs Animation

- **Transition**: 状態変化に使用（ホバー、クラス変更など）
- **Animation**: 連続的な動きに使用（ローディング、無限ループなど）

### 2. requestAnimationFrameの使用

トースト表示など、DOM操作のタイミングを最適化するために使用：

```typescript
requestAnimationFrame(() => toast.classList.add('show'));
```

### 3. setTimeoutによる遅延

アニメーション開始のタイミングを調整：

```typescript
setTimeout(() => {
  containerRef.current?.classList.add("slide-in");
}, 10);
```

### 4. クラスベースの制御

Reactの状態管理とCSSクラスを組み合わせてアニメーションを制御：

```typescript
const [isAnimating, setIsAnimating] = useState(false);

<div className={`component ${isAnimating ? 'animate' : ''}`}>
```

---

## まとめ

現在のアプリケーションでは、以下の種類のアニメーションが実装されています：

1. **ページ遷移**: スライドイン/アウト、フェードイン/アウト
2. **モーダル表示**: フェードインアップ、スライドイン
3. **ローディング**: スケルトン、スピナー（複数タイプ）
4. **インタラクション**: ホバーエフェクト、リップルエフェクト
5. **装飾**: バウンス、パルス、ウェーブ

すべてのアニメーションは、パフォーマンスを考慮した実装となっており、必要に応じて`prefers-reduced-motion`による無効化にも対応しています。

