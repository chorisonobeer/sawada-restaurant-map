# Umamiアナリティクス実装プラン（無料運用）

このドキュメントは、現在のPWA（React + HashRouter + Service Worker）に **Umami** を用いて無料運用で導入するための、現実的な構成・手順・コード方針をまとめた実装計画です。

---

## 方針（要約）

- 無料運用は **セルフホスト**が前提です（SaaS有償は不使用）。
- 推奨構成（無料枠の例、変更の可能性あり）
  - アプリ: **Vercel**（無料）に Umami をデプロイ
  - DB: **Neon（PostgreSQL）** か **Railway/Postgres** の無料枠を利用
  - 代替: **Fly.io / Render** の無料枠でも可（待機復帰遅延に留意）
- HashRouterはページ遷移を **ハッシュ変更**とみなすため、Umamiの自動追跡に加えて、必要なら手動ページビュー送信を用意します。
- イベントは `window.umami?.track(name, payload)` をラッパー経由で送信します。

---

## ゴールと計測範囲

- 計測ゴール
  - 利用者数、ページビュー、流入チャネル、国（地域）、OS/ブラウザ、主要イベント（電話予約、地図起動、店舗詳細表示、検索）
- ページビュー
  - 初回ロード + ルート変更（Hash変更）
- イベント
  - `reserve_phone`（電話ボタン）
  - `open_map`（地図アプリ起動）
  - `view_shop`（店舗詳細表示）
  - `search_submit`（検索実行）

---

## インフラ構成（無料枠）

- Umami本体（Node.js）をホスト
  - 例: Vercel の Hobby（無料）
- データベース（PostgreSQL推奨）
  - 例: Neon の Free Tier（PostgreSQL互換）
- ドメイン
  - 例: `analytics.example.com` を Umami に割り当て（必須ではないが推奨）

注意: 無料枠は提供条件の変更やスリープがあり得ます。安定運用が必要なら低額有料枠を検討してください。

---

## セットアップ手順（概要）

1) Umamiのデプロイ
- 公式リポジトリをデプロイ（PostgreSQLを選択）。
- `DATABASE_URL`（Neon/Railwayの接続文字列）、`HASH_SALT`（十分長いランダム文字列）を設定。
- 初期管理ユーザーを作成。

2) Webサイト登録（Umamiダッシュボード）
- PWA本番ドメインをサイトとして登録。
- `websiteId`（UUID）を控える。

3) トラッキングスクリプトの設置
- `public/index.html` にスクリプトタグを追加:

```html
<!-- public/index.html -->
<script defer src="https://analytics.example.com/script.js" data-website-id="YOUR-UMAMI-WEBSITE-ID"></script>
```

- 必要に応じて `data-domains="pwa.example.com"` のようにドメイン制限を付与。
- 開発環境では読み込まない運用も可能（`NODE_ENV` で条件分岐）。

4) HashRouterページビューの担保
- Umamiは通常、自動でページビューを追跡します（ルート変更を検知）。
- 念のため、`useLocation()` 監視で手動送信のフックを用意します（下記「コード方針」参照）。

5) 主要イベントの組み込み
- 既存ハンドラー内で `Analytics.track('event-name', payload)` を呼び出し。

---

## コード方針（このリポジトリに合わせた最小差分）

- ルーターは `HashRouter`（`src/index.tsx`）。
- ルート直下は `src/Container.tsx` → `About` + `App`。
- 監視フックは `Container.tsx` に一箇所だけ追加するのが影響最小。

### 1) 送信ラッパーの追加

- 追加ファイル: `src/utils/analytics.ts`
- 役割: `window.umami?.track(name, payload)` を安全に呼ぶ薄いラッパー。

```ts
// src/utils/analytics.ts
export const Analytics = {
  enabled: () => typeof window !== 'undefined' && !!(window as any).umami && process.env.NODE_ENV === 'production',

  pageview: () => {
    // 通常は自動追跡されるため、必要時のみ呼ぶ（保険）。
    try {
      // Umami v2では自動PVが標準。明示送信が必要なら track で記録名統一。
      (window as any).umami?.track('pageview', { url: location.href });
    } catch {}
  },

  track: (name: string, payload: Record<string, any> = {}) => {
    try {
      if (Analytics.enabled()) {
        (window as any).umami?.track(name, payload);
      }
    } catch {}
  },
};
```

備考: Umami側のAPIはバージョンで微細に変わる場合があるため、`track` のみ使用して命名を統一します（pageviewもイベント扱いで記録）。

### 2) ルート変更でのページビュー送信（保険）

- 変更ファイル: `src/Container.tsx`
- 追加: `useLocation()` を監視し `Analytics.pageview()` を呼ぶ。

疑似コード:

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Analytics } from './utils/analytics';

function Content() {
  const location = useLocation();

  useEffect(() => {
    // 初回 + ハッシュ変更ごとにPV送信（自動検知の補完）
    Analytics.pageview();
  }, [location]);

  // 既存のレイアウトを返す
}
```

### 3) 主要イベントの送信ポイント

- 変更ファイル（一例）:
  - `src/App/Shop.tsx`: 電話予約ボタン、地図起動ボタン
  - `src/App/SearchFeature.tsx`: 検索実行
  - `src/App.tsx`: 店舗選択（詳細表示）

例:

```ts
// 電話予約ボタン押下時
Analytics.track('reserve_phone', { shop_name: name, spot_id: id });

// 地図アプリ起動
Analytics.track('open_map', { shop_name: name, address });

// 店舗詳細表示
Analytics.track('view_shop', { shop_name: name, spot_id: id });

// 検索実行
Analytics.track('search_submit', { query });
```

- 送信タイミングは「ユーザー操作直後」を基本にし、オフライン時の未送信は許容。

---

## 動作確認（QA）

- 本番ドメインで `script.js` が正しくロードされることを確認。
- ダッシュボードでリアルタイムに PV が増えるか（初回ロード + タブバー遷移）を確認。
- 主要イベントの到達確認（電話・地図・詳細・検索）。
- 開発環境では到達しない/別サイトIDで隔離されることを確認。

---

## プライバシーと法令対応

- Umamiはプライバシー重視でCookieレス設計が可能。
- 個人情報・識別子は送信しない方針（`shop_name` や `spot_id` 程度）。
- プライバシーポリシーへ計測目的・項目を明記。

---

## リスクと回避策

- 無料枠のスリープ/制限 → 復帰遅延や欠測の可能性。必要なら低額有料枠へ移行。
- HashRouterでの遷移検知差異 → 自動追跡に加え、保険で手動PV送信を併用。
- オフライン時のイベント欠測 → 重要イベントは操作直後に送信、失敗時は再送なし（複雑なキューは非採用）。

---

## 導入チェックリスト

- [ ] Umami本体のデプロイ（Vercel等）
- [ ] DB（Neon/Railway）接続設定（`DATABASE_URL`、`HASH_SALT`）
- [ ] サイト登録と `websiteId` 取得
- [ ] `public/index.html` に `script.js` を設置
- [ ] `src/utils/analytics.ts` 追加
- [ ] `src/Container.tsx` に PV送信フック（保険）
- [ ] 主要イベント送信（電話/地図/詳細/検索）
- [ ] 本番で動作検証（ダッシュボード）
- [ ] プライポリ更新

---

## 実装工数の目安

- インフラ（Umami+DBデプロイ）: 1.5〜3.0時間
- アプリ改修（スクリプト設置＋ラッパー＋イベント送信）: 0.5〜1.5時間
- QA（本番確認）: 0.5時間

---

## ロールバック方針

- `index.html` のスクリプトタグを削除/コメントアウトで計測停止。
- コードの `Analytics.*` 呼び出しは残置しても副作用なし（`enabled()` ガードで無効化）。

---

最終更新: 2025-10-29