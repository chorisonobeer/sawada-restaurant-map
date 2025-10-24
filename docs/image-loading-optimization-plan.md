# 画像読み込み高速化計画（実装前計画）

本ドキュメントは「一覧→詳細ページで画像表示までが遅い」課題に対して、原因の整理と、高速化施策の具体的な実装計画をまとめたものです。まず計画を確認いただき、OKであれば段階的に実装します（この段階ではコード変更しません）。

---

## 背景 / 現状
- データ取り込み時（`src/App.tsx`）に「画像」列のみ `transformImageUrl` によるプロキシ変換を実施。
- 詳細ページ（`src/App/Shop.tsx`）では「画像・画像2〜画像5」を表示するが、`http`で始まるURLはそのまま表示、ファイル名のみは`public`相対パスに補完するロジック。
- Google Drive系リンク（`open?id=...`、`file/d/...` など）は直リンクでは最適でなく、場合によっては読み込みが遅い／失敗する。
- 一覧・検索・写真一覧は主に「画像」列を使うため、詳細に比べて遅延の顕在化が少ない。

## ボトルネック仮説
1. 画像サイズ過大（オリジナル大画像をそのまま取得）。
2. Google Drive直リンクは遅く、不安定。プロキシ未適用の「画像2以降」で顕著。
3. 詳細ページの画像群に `loading="lazy"` や `fetchpriority` の適切な指定が不足（ユーザーが見るまで前もって取ってしまう）。
4. キャッシュ戦略不足（Service Worker・HTTPキャッシュ・永続キャッシュの活用が限定的）。
5. レスポンシブ対応不足（`srcset`/`sizes` 未利用で端末に過大画像を渡してしまう）。

## 高速化施策一覧（優先順・段階的）

### フェーズA（フロントのみ・即効性）
- A1: 詳細ページの画像要素に `loading="lazy"` と `decoding="async"` を付与。最初のヒーロー画像には `fetchpriority="high"` を付与。
- A2: 画像要素に `width`/`height` を適切に指定（レイアウト安定・描画開始を前倒し）。
- A3: IntersectionObserverでビューポートに入る直前に画像をプリロード（一覧・詳細のグリッド）。
- A4: スケルトン/プレースホルダー（LQIP）表示で知覚速度改善。

### フェーズB（プロキシ最適化・本質対応）
- B1: Netlify Functionsの `netlify/functions/image-proxy.js` を拡張（`id`/`url`入力許可、`w`/`q`/`format` パラメータでリサイズ・圧縮・WebP/AVIF変換）。
- B2: `Cache-Control: public, max-age=31536000, immutable` 等の強いキャッシュ＋ETag設定。
- B3: `src/App.tsx` の `transformImageUrl` を拡張して「画像〜画像5」に対して一律プロキシ変換＋サイズ指定（一覧/詳細で使う想定サイズに合わせる）。
- B4: 環境別の `config.image_proxy_url` を活用（開発＝ローカル、 本番＝Netlify）。

### フェーズC（レスポンシブ・UX）
- C1: `srcset`/`sizes` を付与して端末・DPRに応じた最適サイズを選択。
- C2: `picture`要素で `type="image/avif"`/`image/webp` を優先し、フォールバックにJPEG。
- C3: ぼかしプレビュー（blur-up）をCSS/LQIPで適用。

### フェーズD（キャッシュ強化）
- D1: Service Workerに画像用のランタイムキャッシュ（Stale-While-Revalidate）。
- D2: IndexedDBへ「変換済みURL」と軽量サムネイルのキャッシュ（再起動後も高速）。
- D3: 重要画像の事前プリフェッチ（詳細遷移時に最初の1枚を先行）。

## 実装計画（ステップと対象ファイル）

1) 画像URL正規化を全列へ適用（B3）
- 対象: `src/App.tsx`
- 内容: CSV取り込み時に「画像〜画像5」の各値に `transformImageUrl` を適用し、Drive系は必ずプロキシ化。
- 期待効果: 詳細ページでの失敗/遅さ低減、プロキシのサイズ・圧縮の恩恵を全画像で受ける。

2) プロキシ拡張（B1/B2）
- 対象: `netlify/functions/image-proxy.js`
- 内容: `w`（幅）, `q`（品質）, `format`（webp/avif/jpeg）を受け取り、Sharp等で変換。HTTPキャッシュヘッダ付与。
- 期待効果: 転送量大幅削減、再訪時の即時表示。

3) 詳細ページ画像の読み込み制御（A1/A2/A3）
- 対象: `src/App/Shop.tsx`
- 内容: `loading="lazy"`, `decoding="async"`, `fetchpriority` の付与。`width`/`height` 設定。IntersectionObserverで近接時プリロード。
- 期待効果: 初回描画の混雑緩和、知覚速度向上。

4) レスポンシブ画像対応（C1/C2）
- 対象: `src/App/Shop.tsx`
- 内容: `srcset`/`sizes` の追加、`picture` で WebP/AVIF 優先。
- 期待効果: 端末に最適サイズを配信、無駄な帯域を削減。

5) プレースホルダー＆LQIP（A4/C3）
- 対象: `src/App/Shop.scss`, `src/App/Shop.tsx`
- 内容: ブラーのCSS、低解像度サムネイルから高解像度へ差し替え。
- 期待効果: 表示までの「待ち」を心理的に軽減。

6) 画像キャッシュ強化（D1/D2/D3）
- 対象: `src/service-worker.ts`（またはSW登録箇所）, `src/utils/idbStore.ts`
- 内容: 画像のSWキャッシュ、IndexedDBのキー設計、詳細遷移時の重要画像プリフェッチ。
- 期待効果: 二回目以降の体感高速化、オフライン耐性。

## 設計詳細（抜粋・実装時に使用する指針）

- `transformImageUrl(url, { w, q, format })` のような拡張を検討。
- 一覧カード/検索結果：幅約 `160–320px`、詳細グリッド：`480–800px` を目安に `srcset` を用意（例：`320 480 800`）。
- `fetchpriority="high"` は詳細の最初の1枚に限定、他は通常/低。
- `IntersectionObserver` は `rootMargin: '200px'` 程度で早めに読み込み開始。
- Service Workerの戦略は「Stale-While-Revalidate（画像）」＋「NetworkFirst（JSON/CSV）」。

## 計測 / 検証方法

- Lighthouse / Web Vitalsで以下を比較：
  - LCP（詳細ページヒーロー画像）
  - TTI/TBT、CLS（画像の`width`/`height`指定で改善）
  - 画像転送量（Networkタブで合計）
- 手順（例）：
  1. 変更前のメトリクス記録（2–3店舗で詳細ページを開く）。
  2. フェーズA→Bと段階導入し、各フェーズごとに再計測。
  3. 3G/Slow 4G のネットワークスロットリングで体感比較。

## 変更点一覧（予定）
- `src/App.tsx`：データ取り込み時の全画像列プロキシ適用（関数拡張）。
- `src/App/Shop.tsx`：画像タグ属性とレスポンシブ対応、IOベースのプリロード。
- `src/App/Shop.scss`：スケルトン/ブラーのスタイル。
- `netlify/functions/image-proxy.js`：Sharp等導入、サイズ/品質/形式パラメータ対応、強キャッシュ。
- `src/service-worker.ts`：画像キャッシュポリシー追加。
- `src/utils/idbStore.ts`：変換済みURLやサムネイルのキャッシュ保管。

## リスク / ロールバック
- 画像変換失敗時のフォールバック（元URLに戻す）。
- WebP/AVIF非対応ブラウザではJPEGへ。
- プロキシ障害時は直リンクに切り替える。SW・IDBクリア手順を用意。

## 想定タイムライン
- Day 1: フェーズA（フロントのみ）導入＋計測
- Day 2–3: フェーズB（プロキシ拡張）導入＋回帰
- Day 4: フェーズC（レスポンシブ/UX）
- Day 5: フェーズD（キャッシュ）＋最終計測

## 承認後の具体的変更（サンプル断片・イメージ）
※ 今は実装しません。承認後に以下の方向で進めます。

- 詳細ページの画像例：
```tsx
<img
  src={heroUrl}
  srcSet={`${url320} 320w, ${url480} 480w, ${url800} 800w`}
  sizes="(max-width: 480px) 100vw, 50vw"
  alt={spotName}
  loading="eager"
  decoding="async"
  fetchpriority="high"
  width={800}
  height={600}
/>
```

- IntersectionObserverのプリロード例：
```ts
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const img = e.target as HTMLImageElement;
      img.src = img.dataset.src!; // 遅延読み込み
      io.unobserve(img);
    }
  });
}, { rootMargin: '200px' });
```

---

## 結論
- まずフロント側（フェーズA）で即効性のある改善を入れ、その上でプロキシ拡張（フェーズB）を行うことで本質的な速度低下要因（サイズ・形式）を解消します。最終的にレスポンシブ対応とキャッシュ強化で「初回も再訪も速い」状態を目指します。

承認いただければ、この計画に沿って段階的に実装を開始します。