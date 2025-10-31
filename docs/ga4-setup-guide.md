# GA4 導入手順（React × TypeScript SPA／HashRouter 対応）

目的: Google Analytics 4（GA4）で「HashRouter の論理URL（例 `/#/list`）をページビューとして正しく集計」し、主要イベントを計測できる状態にする。環境は Netlify ホスティング、React + TypeScript の SPA 前提。

---

## ゴールと受け入れ条件
- HashRouter のページ遷移を手動 `page_view` で正しく記録（`/#/list` 等が GA4 上で意図通り表示）。
- 主要イベント（店舗選択・検索・共有・外部リンク）を GA4 に送信、レポートで可視化。
- 同意（Consent）・プライバシー設定を反映し、CSP/AdBlock 下でも最低限の計測が成立。
- 本番 24–48 時間の連続観測で欠損がないことを確認。

---

## 1. 事前準備（Google 側）
1) Google アカウントで [Google Analytics](https://analytics.google.com/) にログイン。
2) プロパティを作成 → データストリームで「Web」を選択。
3) 「測定 ID（`G-XXXXXXXXXX`）」を控える。
4) 「拡張計測（Enhanced measurement）」は SPA の二重計測防止のため、後述の手動運用を採用するなら無効化を検討（プロパティ設定 > データストリーム > 詳細設定）。

---

## 2. トラッカースニペット（`gtag.js`）の設置
Netlify の `public/index.html` の `<head>` に以下を追加（`G-XXXXXXXXXX` を差し替え）。初期ページビューの自動送信を止めるため `send_page_view: false` を設定します。

```html
<!-- GA4 gtag.js: head 直下推奨 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);} 
  gtag('js', new Date());

  // 初期PVの自動送信を無効化（SPAは手動で送る）
  gtag('config', 'G-XXXXXXXXXX', {
    send_page_view: false
  });
</script>
```

備考:
- スニペットはできる限り早く読み込む（`head`）。
- ステージング/本番で測定IDを切り替える場合は、`index.html` を環境変数で差し替えるか、ビルド時に `html` を加工する運用とする。

---

## 3. HashRouter のページビュー送信（手動）
SPA のルート変更時に、論理URL（`/#/...`）を `page_view` として手動送信します。React Router v6 前提の概念設計です。

- `page_path`: `/#/list` のようにハッシュを含む論理パスを渡す。
- `page_location`: 実URL（`https://example.com/#/list`）を渡す。
- `page_title`: `document.title` を渡す（タイトル変更運用がある場合は併せて設定）。

コード構成の推奨（ドキュメント用サンプル）:

```ts
// src/analytics/ga.ts （ラッパー設計の例）
export const sendPageView = (path: string) => {
  const pagePath = path.startsWith('/#') ? path : `/#${path}`;
  const pageLocation = `${window.location.origin}${pagePath}`;
  // Debug: console.log('[GA4] page_view', { page_path: pagePath });
  // GA4 推奨の手動PV送信
  (window as any).gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: pageLocation,
    page_path: pagePath,
  });
};
```

```ts
// ルート変更フックの例（react-router-dom v6）
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sendPageView } from './analytics/ga';

export const GA4PageViewReporter: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    // HashRouter の論理パスを組み立て
    const path = `/#${location.pathname}${location.search ?? ''}`;
    sendPageView(path);
  }, [location.key]);
  return null;
};
```

設置位置:
- `HashRouter` 直下（アプリ全体で一箇所）に `GA4PageViewReporter` をレンダリングすると、ルート変更ごとに一度だけ発火できます。

---

## 4. 主要イベントの計測（推奨マッピング）
GA4 は「推奨イベント」スキーマがあります。以下はこのアプリの代表イベントへの割当例です。

- 店舗選択: `select_item`
  - 推奨パラメータ: `items: [{ item_id, item_name, item_category }]`
- 検索実行: `search`
  - `search_term`, `results`（結果件数）
- 共有アクション: `share`
  - `method`（"copy_link" | "web_share" など）, `content_type`
- 外部リンク: カスタムイベント `outbound_click`
  - `link_url`, `link_domain`

送信例:
```ts
(window as any).gtag?.('event', 'search', {
  search_term: keyword,
  results: resultCount,
});
```

---

## 5. 同意（Consent Mode）とプライバシー設定
ユーザー同意に応じてストレージ利用を制御します（最低限の例）。

```html
<script>
  // 初期値: 広告関連は拒否、分析は暫定許可（要件に合わせて調整）
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'granted',
  });
  // UIで同意を変更したら update を送る
  // gtag('consent', 'update', { analytics_storage: 'granted' | 'denied' });
</script>
```

- IP 匿名化・データ保持期間などは GA4 管理画面側の設定を確認。
- EU 向け配信がある場合は、同意取得UI（CMP）との連携を検討。

---

## 6. Netlify のヘッダ/CSP 設定（例）
`public/_headers` に GA4 通信を許可する CSP を設定します（アプリの既存CSPに合わせて調整）。

```
/ 
  Content-Security-Policy: \
    default-src 'self'; \
    script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; \
    connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; \
    img-src 'self' data: https://www.google-analytics.com; \
    style-src 'self' 'unsafe-inline'; \
    frame-src 'self';
```

- `script-src` に `https://www.googletagmanager.com` を含める。
- `connect-src` に `https://www.google-analytics.com`（および `region1`）を含める。
- 既存のヘッダと衝突しないように一体管理する。

---

## 7. デバッグと検証手順
- ブラウザで `window.gtag` の存在を確認、`send_page_view: false` になっていることを HTML から目視。
- Network タブで `collect?v=2&...` へのリクエスト発火を確認。`page_view` 送信時に `ep.page_path`（またはパラメータ名）と `page_location` が論理URL/実URLに一致しているかを見る。
- GA4 管理画面の「DebugView」で開発環境からのイベントがリアルタイム表示されるか確認（Chrome 拡張の GA Debugger を使うと楽）。
- 初期ロード時の二重計測が起きていないか（`config` の `send_page_view: false` とルート変更フックの実装を再確認）。
- 本番反映後は 24–48 時間の連続観測で欠損が無いことを確認。

---

## 8. よくある躓きポイント（回避策）
- 二重PV: `send_page_view: false` 未設定や、ルート変更フックの重複レンダリングに注意。
- Hash の扱い: `page_path` に `/#/...` を含めないと論理URL表示が崩れる。
- AdBlock/CSP: GA のドメインがブロックされると送信不可。CSP許可とサブドメイン分離は有効（必要に応じて GTM も検討）。
- 環境切替: 測定IDの取り違え（ステージング/本番）に注意。プロパティ別運用が安全。

---

## 9. 導入スケジュールの目安（最短 3 日）
- Day 1: プロパティ作成、スニペット設置、CSP反映、開発環境で DebugView 確認。
- Day 2: ルート変更フック設計（手動PV）、主要イベント送信のラッパー定義、UI連携。
- Day 3: 同意モード適用、QA（ネットワーク・二重PV・AdBlock下）、本番リリース。
- 以降: 24–48 時間の安定観測、ダッシュボード/探索レポートの整備。

---

## 10. 導入後の運用小技
- 探索レポートで `page_path` をディメンションに追加し、`/#/...` の集計を確認。
- イベント命名は GA4 推奨に寄せつつ、必要に応じてカスタム（`outbound_click` 等）。
- BigQuery 連携が必要になったら、プロパティ設定からいつでも拡張可能。

---

## 付録: 実装断片の再掲（参考）
ドキュメント内のコードは「実装の参考例」です。実際のリポジトリでは、既存の `PageViewReporter` やユーティリティ構成に合わせて「重複なく一箇所で発火」するように統合してください。

```ts
// 例: HashRouter 直下でレンダリング
<HashRouter>
  <GA4PageViewReporter />
  <App />
</HashRouter>
```

以上です。必要ならこのドキュメントに沿って WBS とチェックリストを詳細化し、導入を進めます。