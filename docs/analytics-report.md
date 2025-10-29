# PWAアプリ向けアナリティクス導入レポート

本ドキュメントは、現在のPWA（React + HashRouter + Service Worker）における利用者数や流入地域の計測について、可能性と推奨システム、組み込み方法をまとめたものです。

---

## 結論（要約）

- 計測は可能です。ユーザー数・セッション・ページビュー・流入チャネル・国/地域・デバイスなどを取得できます。
- ルーティングが `HashRouter` のため、ページ遷移は「ハッシュ変更」として扱われます。計測は「初回ロード + ハッシュ変更」に対して手動でページビューを送る構成が最適です。
- 推奨は次のいずれか（用途別）：
  - マーケティング連携・標準的な可視化が必要 → **Google Analytics 4 (GA4)**
  - プライバシー重視・軽量・簡単 → **Plausible**（または **Umami**）
  - ゼロコードで概況を掴みたい → **Netlify Analytics**（SPA内の遷移は非対応・初回ロードのみ）
- 実運用では「GA4 + Netlify Analytics（概況）」または「Plausible（軽量）単独」のいずれかが使いやすいです。

---

## 計測で分かること

- 人数・セッション・ページビュー（ハッシュ遷移含む）
- 国/地域（国は全サービスで可。市区町村はサービスにより制限あり）
- 参照元（流入チャネル：検索、SNS、メール、QR経由など）
- OS/ブラウザ/デバイス種別
- イベント（電話ボタンタップ、地図アプリ起動、店舗詳細表示、検索回数など）

---

## 推奨システム比較と選定ガイド

### 1) Google Analytics 4 (GA4)

- 特徴: 無料、充実したレポート、流入分析が強い、広告連携可。
- SPA対応: 自動計測はHistory API中心。`HashRouter` は手動ページビュー送信が確実。
- 地域: 国は標準。都市レベルは推定・閾値あり。プライバシー対応でIPは匿名化（GA4標準）。
- メリット: マーケ・既存知見が多い、拡張性高い。
- デメリット: UI/学習コストあり。細かいイベント設計が必要。

### 2) Plausible（または Umami）

- 特徴: 軽量・プライバシー重視、UIがシンプル。Plausibleはクラウド/セルフホスト、UmamiはOSSセルフホスト中心。
- SPA対応: HashRouterは手動でページビュー送信（`hashchange`や `useLocation` に合わせて）。
- 地域: 国は標準。都市は非対応または限定的。
- メリット: 実装が簡単、パフォーマンス良好、Cookie不要運用がしやすい。
- デメリット: 高度なマーケ連携は弱め。詳細分析は最小限。

### 3) Netlify Analytics

- 特徴: サーバーログベース。設定を有効化するだけのゼロコード。
- SPA対応: 初回ロードのみ。ハッシュ遷移はページビューとしては計上されない。
- 地域: 国レベルの集計（概況把握に有用）。
- メリット: 導入が最も簡単、管理画面に統合。
- デメリット: 詳細なイベントやSPA内の遷移の把握は不向き。

### 選定の目安

- マーケ施策や広告連携、流入分析を深くやりたい → GA4
- プライバシー優先・軽量・最小構成 → Plausible（または Umami）
- とりあえず概況だけ手早く → Netlify Analytics（必要に応じて後からGA/Plausibleを追加）

---

## 組み込み方法（実装ガイド）

以下は「React + HashRouter（現在の構成）」に最適化した実装例です。

### 共通: ルート変更でページビュー送信

- HashRouterでは、`#/path` のハッシュ変更を遷移とみなし、`useLocation()` で変更検知し、計測にページビュー（またはイベント）を送ります。
- 推奨: `src/utils/analytics.ts` に送信ラッパーを用意し、`src/Container.tsx` などルート直下で一度だけフックを仕込む。

#### 例: 送信ラッパー（GA4 + Plausible両対応）

```ts
// src/utils/analytics.ts
export const Analytics = {
  ga4Enabled: !!(window as any).gtag,
  plausibleEnabled: !!(window as any).plausible,

  pageview: (path?: string) => {
    const url = path || location.pathname + location.search + location.hash;

    // GA4
    if ((window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_location: location.href,
        page_path: url,
        page_title: document.title,
      });
    }

    // Plausible
    if ((window as any).plausible) {
      (window as any).plausible('pageview', { u: location.href });
    }
  },

  event: (name: string, params: Record<string, any> = {}) => {
    if ((window as any).gtag) {
      (window as any).gtag('event', name, params);
    }
    if ((window as any).plausible) {
      (window as any).plausible(name, { props: params });
    }
  },
};
```

#### 例: ルート変更時にページビュー送信

```tsx
// src/Container.tsx（一例）
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Analytics } from './utils/analytics';

export default function Container() {
  const location = useLocation();

  useEffect(() => {
    // 初回＋ハッシュ変更を都度送信
    Analytics.pageview();
  }, [location]);

  // 既存のレイアウトを返す
  // ...
}
```

---

### GA4 導入手順

1. GA4プロパティを作成し、測定ID（`G-XXXXXXX`）を取得。
2. `public/index.html` に `gtag.js` を追加（`send_page_view: false` で自動ページビューを抑止）。

```html
<!-- public/index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX', {
    send_page_view: false,
    // 必要に応じてカスタム:
    // debug_mode: true,
  });
</script>
```

3. ルート変更時に `Analytics.pageview()` を送る（上記の共通パターン）。
4. 推奨イベント例：
   - 電話で予約ボタン: `gtag('event','reserve_phone',{shop_name,...})`
   - 地図アプリ起動: `gtag('event','open_map',{shop_name,...})`
   - 店舗詳細表示: `gtag('event','view_shop',{shop_name,...})`

```ts
// 例: 電話ボタン押下
Analytics.event('reserve_phone', { shop_name: name, spot_id: id });
```

5. 検証: GA4の DebugView を用いてリアルタイムにイベント到達を確認。

---

### Plausible 導入手順

1. Plausibleでサイトを作成（ドメイン登録）。
2. `public/index.html` にスクリプトを追加。

```html
<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>
```

3. ルート変更時に `Analytics.pageview()` を送る（HashRouterは手動が確実）。
4. イベント送信は名前自由（例: `reserve_phone`, `open_map`, `view_shop`）。

```ts
Analytics.event('reserve_phone', { shop_name: name, spot_id: id });
```

5. 検証: Plausibleのリアルタイムビューで到達確認。

---

### Netlify Analytics 導入手順（ゼロコード）

1. Netlifyのサイト設定で Analytics を有効化。
2. 初回ページロード（`/index.html`）のアクセス・国・トップページ等がレポートされます。
3. 注意: SPA内のハッシュ遷移はページビューとしては集計されません。詳細分析が必要なら GA4 または Plausible を併用してください。

---

## PWA特有の注意点

- Service Workerにより、リソースがキャッシュされますが、ルート変更計測はクライアント側で行うため問題ありません。
- オフライン時のイベントはキュー不可のため、オンライン前提の重要イベントは重複送信防止と到達保証設計が必要です（簡易には送信失敗時は握りつぶし）。
- iOS Safariでは制限が多く、バックグラウンド時の到達に揺らぎがあるため重要イベントはユーザー操作直後に送るのが安全です。

---

## 追加で計測すると有益なイベント例

- `reserve_phone`（電話ボタン押下）
- `open_map`（地図アプリ起動）
- `view_shop`（店舗詳細表示）
- `search_submit`（検索キーワード送信）
- `image_preview`（画像拡大表示）

これらを `Shop.tsx` や検索コンポーネント内のハンドラで、送信ラッパー `Analytics.event(...)` 経由で記録します。

---

## プライバシー・法令対応

- クッキー同意（必要に応じて）。PlausibleはCookieレス運用が容易。
- GA4はIP匿名化が標準。ユーザー識別子を送信しない設計を推奨。
- プライバシーポリシーに計測の目的・内容を明記。

---

## 導入チェックリスト

- [ ] 本番ドメインで計測タグを埋め込み済み
- [ ] ハッシュ遷移でページビューが増加することを検証
- [ ] 主要イベント（電話・地図・詳細・検索）を送信・到達確認
- [ ] 開発環境では計測を無効化（または別プロパティで分離）
- [ ] プライバシーポリシー更新

---

## 参考: 実装断片（このリポジトリ構成に合わせた例）

- ルーターは `HashRouter`（`src/index.tsx`）。
- ページコンポーネントは `src/App.tsx` の `<Routes>` 配下。
- 一度だけ `useLocation()` を監視するフックをレイアウト直下（`Container`）で差し込み、`Analytics.pageview()` を送るのが最小変更。

---

## 今後の拡張案

- 端末別・OS別のエラーイベント収集（API失敗・画像ロード失敗等）。
- オフライン利用の把握（SWインストール、`appinstalled` イベント）。
- 参照元ごとのキャンペーン計測（`utm_source`等をランディング時に保持・イベントに付与）。

---

最終更新: 2025-10-28