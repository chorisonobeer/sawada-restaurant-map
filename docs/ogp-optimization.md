# OGP最適化レポート

## 現状把握（2025-10-27時点）

- 設定ファイル: `public/index.html`
  - `twitter:card`: `summary_large_image`
  - `twitter:site`: `@your_twitter_handle`（プレースホルダー）
  - `twitter:title`: 佐渡佐和田飲食店マップ
  - `twitter:description`: 新潟県佐渡市佐和田町料飲店組合加盟店のMAPです
  - `twitter:image`: `https://sawada-restaurant-map.netlify.app/ogp-2025.jpg`
  - `og:url`: `https://sawada-restaurant-map.netlify.app/`
  - `og:title`: 佐渡佐和田飲食店マップ
  - `og:image`: `https://sawada-restaurant-map.netlify.app/ogp-2025.jpg`
  - `og:image:width`: `1200`
  - `og:image:height`: `630`
  - `og:image:type`: `image/jpeg`
  - `og:type`: `website`
  - `og:description`: 佐渡島のグルメマップ。地元の美味しいお店を探そう！
  - `og:site_name`: 佐渡グルメマップ
  - `og:locale`: `ja_JP`
- 画像資産: `public/ogp-2025.jpg`, `public/ogp.jpg`, `public/ogp-image.svg`
- キャッシュ設定: `public/_headers`
  - `/ogp.jpg` のみ `Cache-Control: public, max-age=3600, must-revalidate`
  - `ogp-2025.jpg` への明示設定なし
- robots設定: `public/robots.txt`
  - Facebook/Twitter/LinkedInのクローラー許可あり
  - Sitemapが別ドメイン: `https://niigata-craftbeer-map.netlify.app/sitemap.xml`（誤りの可能性）

## 課題・不整合

- 文言不整合
  - `meta name="description"`: 佐和田料飲店組合の説明
  - `og:description`: 佐渡島のグルメマップの説明
  - `og:site_name`: 「佐渡グルメマップ」だが、タイトルは「佐和田料飲店マップ」
- 画像キャッシュ設定の不統一
  - `_headers` は `/ogp.jpg` のみ対象。実際に参照しているのは `ogp-2025.jpg`
- Twitter設定のプレースホルダー
  - `twitter:site` が `@your_twitter_handle` のまま
- カノニカルURL未設定
  - 重複URL・共有時のURL判定で不利（`og:url`と一致させるのが望ましい）
- SPAのため経路別OGPは固定
  - ルート（例: `/shop/:id`）で個別OGPを出したい場合、現状のCSRでは難しい（SSR/プリレンダが必要）
- robotsのSitemapドメイン不一致
  - プロジェクト名と異なる別サイトのSitemapを指している可能性

## 推奨改善案（即時対応）

1. 文言整合性の統一
   - `meta[name=description]`/`og:description`/`twitter:description` を同一の説明文へ統一
   - `og:site_name` を「佐渡佐和田飲食店マップ」に統一
2. Twitter設定の実運用化
   - `twitter:site` を実際のハンドルへ更新（例: `@sawada_map`）。未定なら一旦削除
3. 画像メタの拡充
   - 追加: `meta property="og:image:secure_url" content="https://sawada-restaurant-map.netlify.app/ogp-2025.jpg"`
   - 追加: `meta property="og:image:alt" content="佐渡佐和田飲食店マップのOGP画像"`
   - 追加: `meta name="twitter:image:alt" content="佐渡佐和田飲食店マップのOGP画像"`
4. カノニカルURL追加
   - `<link rel="canonical" href="https://sawada-restaurant-map.netlify.app/" />`
5. `_headers` のキャッシュ設定追加
   - `ogp-2025.jpg` と `ogp-image.svg` を対象に追加
6. 画像最適化
   - `ogp-2025.jpg` を 1200×630（既存）/ 300〜600KB程度のプログレッシブJPEGへリコンプレス
   - 重要情報は周辺トリミング耐性を考慮（中央配置・余白確保）

## 推奨改善案（拡張）

- 経路別OGP（店舗詳細やイベントページ）
  - 選択肢A: Netlify Edge Functions でパスに応じて `index.html` を動的書き換え（`<head>`のOGPタグをインジェクト）
  - 選択肢B: ビルド時プリレンダ（`react-snap` 等）で主要ルートの静的HTMLを生成
  - 選択肢C: ルーティングごとに静的エクスポート（SSG）へ移行
- 構造化データ（JSON-LD）
  - `WebSite`/`LocalBusiness` スキーマの追加で検索でのリッチリザルトを狙う

## 変更例（`public/index.html`）

```html
<!-- 統一されたメタ -->
<meta name="description" content="佐和田料飲店組合加盟店のグルメ情報を網羅した公式マップです。現在地から探す・写真から探す・検索で簡単に見つかります。">
<meta property="og:description" content="佐和田料飲店組合加盟店のグルメ情報を網羅した公式マップです。現在地から探す・写真から探す・検索で簡単に見つかります。">
<meta name="twitter:description" content="佐和田料飲店組合加盟店のグルメ情報を網羅した公式マップです。">
<meta property="og:site_name" content="佐和田料飲店マップ">

<!-- OGP画像の拡張 -->
<meta property="og:image" content="https://sawada-restaurant-map.netlify.app/ogp-2025.jpg">
<meta property="og:image:secure_url" content="https://sawada-restaurant-map.netlify.app/ogp-2025.jpg">
<meta property="og:image:alt" content="佐和田料飲店マップのOGP画像">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@実際のハンドル"> <!-- ない場合は削除 -->
<meta name="twitter:image" content="https://sawada-restaurant-map.netlify.app/ogp-2025.jpg">
<meta name="twitter:image:alt" content="佐和田料飲店マップのOGP画像">

<!-- カノニカル -->
<link rel="canonical" href="https://sawada-restaurant-map.netlify.app/" />
```

## 変更例（`public/_headers`）

```txt
# OGP画像のキャッシュ制御
/ogp.jpg
  Cache-Control: public, max-age=3600, must-revalidate
  X-Content-Type-Options: nosniff

/ogp-2025.jpg
  Cache-Control: public, max-age=3600, must-revalidate
  X-Content-Type-Options: nosniff

/ogp-image.svg
  Cache-Control: public, max-age=3600, must-revalidate
  X-Content-Type-Options: nosniff
```

## 変更例（`public/robots.txt`）

```txt
# Sitemap を自サイトに更新
Sitemap: https://sawada-restaurant-map.netlify.app/sitemap.xml
```

## 実施ステップ

1. `public/index.html` のOGP/Twitter/CANONICALのタグ整備（上記例）
2. `public/_headers` に `ogp-2025.jpg`/`ogp-image.svg` のキャッシュ設定追加
3. `public/robots.txt` の `Sitemap:` を自サイトへ修正
4. `ogp-2025.jpg` の画像圧縮・品質調整（1200×630、300〜600KB目安）
5. 実際のTwitterハンドルを運用している場合は設定反映（なければ削除）
6. 共有テスト（Twitter Card Validator, Facebook Sharing Debugger）で表示確認

## メモ

- サイズ比：Facebookは 1200×630、Twitterの`summary_large_image`は 1200×628 推奨（ほぼ同等）。
- 重要要素はセンター周辺に寄せ、プラットフォームごとのクロップに耐える余白を持たせると安全。
- ルート別OGPが必要な場合は、Edge Functionsかプリレンダへの投資が最も効果的。

## 用意・修正すべきファイルまとめ

- `public/index.html`: OGP/Twitterのメタタグ、`<link rel="canonical">`の追加・整備。
- `public/_headers`: `ogp-2025.jpg`や`ogp.jpg`、`ogp-image.svg`にキャッシュ制御を付与。
- `public/robots.txt`: クローラー許可と`Sitemap:`の自サイトURLへの更新。
- `public/ogp-2025.jpg`（または`public/ogp.jpg`）: 1200×630のJPEG、中央にロゴ・タイトル、「佐渡佐和田飲食店マップ」表記でリサイズ・圧縮。
- `public/sitemap.xml`（新規推奨）: 主要ページのURLを記載。`robots.txt`から参照。
- `netlify.toml`（任意）: `_headers`未使用の場合のヘッダー付与、将来のEdge Functions導入時の設定。
- `netlify/edge-functions/` または `netlify/functions/`（任意・拡張）: ルート別OGPを実現する動的タグ挿入のスクリプト。
- `docs/ogp-optimization.md`: 方針をドキュメント化し、プロジェクト内で共有。