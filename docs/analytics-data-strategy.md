# 島内住民・観光客向け GA4 分析データ設計（戦略メモ）

本ドキュメントは、佐渡島内の住民と観光客が主に利用する前提で、何を計測し、どう解釈・活用するかを整理したものです。複雑な用語は避け、運用に直結する粒度でまとめます。

## 目的
- 来訪者が「探す → 比較 → 行動（電話・地図）」へ進む流れを可視化し、導線改善につなげる。
- 島内住民・観光客の行動差を掴み、時間帯・場所・カテゴリ別に需要を理解する。
- 運用負荷を増やさず、継続的に役立つ指標とイベントだけを計測する。

## ペルソナと行動仮説（簡易）
- 島内住民
  - 目的地が明確（特定の店へ直行、電話予約が多い）。
  - 再訪が多く、特定カテゴリ（普段使い）への偏りがある。
- 観光客
  - 検索や一覧の回遊が多い。地図・ルートの起動が多い。
  - 画像拡大・共有など、比較行動が目立つ。

## 計測の基本方針
- イベント名は小文字・単語区切りはアンダースコア（snake_case）。
- “意味が同じ行動は同じイベント名”、付与する情報（パラメータ）も揃える。
- 操作したコンポーネントが持っている値だけで完結（無理に別所から取得しない）。

## 主要KPI（まずはこれだけ）
- ページビュー：`page_view`（遷移ごと）
- 店舗詳細の閲覧：`view_shop` 回数、率（一覧→詳細）
- 行動イベント：`open_map` と `reserve_phone` の回数、率（詳細→行動）
- 検索とフィルタ：`search` 実行数、`apply_filter` 実行数、結果数の分布
- カテゴリ別人気：`view_shop` / 行動イベントのカテゴリ別シェア
- 時間帯・曜日差：行動イベントの時間帯・曜日分布（需要のピーク把握）

## イベント設計（名前・パラメータ・取得場所）

### Act（行動）
- `open_map`（地図・ルートを開く）
  - params：`shop_id`, `shop_name`, `action_source`（例：`detail`/`list`）, `destination`（例：`google_maps`）, `travel_mode`（取得できれば）
  - トリガー：地図/ルートボタン押下（`src/App/Shop.tsx` など）
- `reserve_phone`（電話予約リンク）
  - params：`shop_id`, `shop_name`, `action_source`（例：`detail`/`list`）
  - トリガー：電話リンク押下（`src/App/Shop.tsx` など）

### Evaluate（比較・検討）
- `view_shop`（店舗詳細を開く）
  - params：`shop_id`, `shop_name`, `category`, `action_source`（`list`/`search`/`map`）
  - トリガー：詳細画面表示（`src/App.tsx` / `src/App/Shop.tsx`）
- `zoom_image`（画像拡大）
  - params：`shop_id`, `image_id`（取れれば）
  - トリガー：拡大UI操作（`src/App/ZoomableImage.tsx`）
- `share_shop`（共有ボタン）
  - params：`shop_id`, `shop_name`, `share_target`（例：`navigator_share`/`copy_link`）
  - トリガー：共有UI操作（`src/App/Share.tsx`）

### Discover（探す）
- `search`（検索を実行）
  - params：`query_term`（検索語）、`result_count`（直後のヒット数）
  - トリガー：検索フォーム操作（`src/App/SearchFeature.tsx`）
- `apply_filter`（カテゴリや絞り込みを変更）
  - params：`filter_type`（例：`category`）, `filter_value`
  - トリガー：フィルタUI操作（`src/App/List.tsx` など）
- `click_list_item`（一覧から店舗をタップ）
  - params：`shop_id`, `shop_name`, `action_source: 'list'`, `list_position`（取れれば）
  - トリガー：一覧アイテムクリック（`src/App/List.tsx` / `src/App/ShopListItem.tsx`）

### PWA（任意）
- `pwa_install_prompt_shown` / `pwa_install_accepted` / `pwa_install_dismissed`
  - params：`trigger`（例：`banner`/`auto`）, `outcome`（`accepted`/`dismissed`）
  - トリガー：PWAバナー表示/操作（`src/App/PWAInstallBanner.tsx`）

## セグメント設計（住民 vs 観光客の推定）
“正確な個人識別”はしません。推定のための安全な手掛かりだけを使います。
- 滞在パターン：同一端末の再訪頻度・期間（再訪が多い＝住民寄りの仮説）
- 言語・端末設定：ブラウザ言語（`ja` 強め＝住民寄りの仮説、ただし例外あり）
- 参照元：外部サイト（旅行系）からの流入は観光寄りの仮説
- 行動特徴：`open_map` が多い・画像ズームや共有が多い＝観光寄りの仮説
- 時間帯：昼ピークの電話予約は住民寄り、夜のルート起動は観光寄り…などの仮説検証

注意：正確な位置情報の“詳細な送信”は行いません（プライバシー配慮）。分析はイベントと時間帯・カテゴリの相関を基に、行動差を推定します。

## 除外ルール（一般的なもの）
- 本番のみ送信（開発・ステージング・ローカルは送信しない）
- 明示的な無効化：URLに `?no_analytics=1` があれば送信しない
- Do Not Track：`navigator.doNotTrack === '1'` の場合は送信しない
- 測定ID未設定・初期化前は送信しない

## 同意モード（Consent）
- 当面は“ONで運用”。将来の同意UI（バナー等）導入に備え、中央設定でON/OFF切替の受け口を用意。
- 同意UI導入時：初期OFF→ユーザーが許可したらONに切替えるだけのシンプル設計。

## ダッシュボード・見方（GA4）
- リアルタイム / DebugView：実装直後の挙動確認（重複送信がないか等）
- 探す→比較→行動のファネル：`search` → `click_list_item`/`view_shop` → `open_map`/`reserve_phone`
- カテゴリ別人気：`view_shop` と行動イベントのカテゴリ分布
- 時間帯・曜日別：`open_map` / `reserve_phone` のピーク（混雑/需要対策）
- 導線別の質：`action_source` 別に `view_shop` → 行動の遷移率を比較（一覧/検索/地図のどれが強いか）

## 実装への反映（主な取得場所の対応）
- `src/App.tsx` / `src/App/Shop.tsx`：`view_shop` の共通パラメータ整備（`shop_id`/`shop_name`/`category`/`action_source`）
- `src/App/Shop.tsx`：`open_map` / `reserve_phone` の共通パラメータ整備
- `src/App/SearchFeature.tsx`：`search`（`query_term`/`result_count`）
- `src/App/List.tsx` / `src/App/ShopListItem.tsx`：`click_list_item`（`list_position` 任意）
- `src/App/ZoomableImage.tsx`：`zoom_image`（任意）
- `src/App/Share.tsx`：`share_shop`（任意）
- `src/utils/analytics.ts`：除外ルール・同意切替の受け口（中央管理）

## 注意事項（プライバシー・運用）
- 個人を特定できる情報は送らない（氏名・住所・電話番号等）。
- 自由入力のテキストは送らない（検索語はOK、ただし機微語の取り扱い注意）。
- 変更は小さく段階的に。導入後は必ず DebugView で重複や欠落を確認。
- 指標は“運用で使い続けられるもの”に限定（増やしすぎない）。

## 次のアクション
- 主要イベント3種（`view_shop` / `open_map` / `reserve_phone`）のパラメータ統一。
- `search` / `apply_filter` / `click_list_item` の追加（最小構成）。
- 除外ルールと同意切替の受け口を中央ラッパーに実装。
- 初期ダッシュボード（探索）をセットして、時間帯・カテゴリ・導線別を確認可能にする。

（以上）