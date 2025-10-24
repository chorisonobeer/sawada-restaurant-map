# 不要実装監査レポート

作成日: 2025-10-24
対象: 佐和田料飲店マップ（sawada-restaurant-map）

## 目的
本レポートは、現在のコードベースに存在する不要（または効果が薄い／重複している）実装を洗い出し、現状の影響と是正提案をまとめたものです。

## 結論（要約）
- CSV更新検知ロジックのうち「先頭行タイムスタンプ比較」を撤去し、常にネットワーク取得結果で`shopList`とキャッシュを更新するよう修正済み。
- バージョン管理まわりに重複・不一致が存在。`public/version-check.js`（手動同期・非破壊）と`src/utils/versionManager.ts`（自動チェック・環境変数依存）が併存するが、後者は必要な環境変数が未注入のため実質無効。前者は手動更新依存かつ非破壊で、目的（自動更新通知／キャッシュ明示更新）を満たしていない。
- `src/utils/version.ts`は未使用であり、バンドルに不要な`package.json`参照を含む可能性があるため削除候補。
- ドキュメント（VERSION_MANAGEMENT.md）の記述が実装と乖離。キャッシュクリアや自動リロードの説明は`version-check.js`の現実装（非破壊）と一致しない。

## 詳細分析

### 1. CSV更新検知ロジック（修正済み）
- 対象: `src/App.tsx`
- 問題点: 先頭行の`タイムスタンプ`のみ比較する`isShopListChanged`により、先頭行以外の変更（例: 画像URL更新）が反映されない。
- 修正内容:
  - `isShopListChanged`関数を削除。
  - キャッシュが存在する場合でも、ネットワークから取得したCSVのパース・ソート結果で常に`shopList`と`IndexedDB`キャッシュを上書き。
  - `useEffect`の依存から`isShopListChanged`を削除。
- 期待効果: 先頭行以外のデータ変更（画像URL・カテゴリ・住所など）が即座に反映される。反映遅延の主因を解消。

### 2. バージョン管理の重複と不一致
- 対象: `public/version-check.js` / `src/utils/versionManager.ts` / `src/index.tsx` / `bin/version-inject.js` / `netlify.toml`
- 現状:
  - `public/version-check.js`: 固定文字列の`currentVersion`（手動更新）がローカルストレージ値と異なる場合のみ記録。キャッシュクリアやリロードは行わない（非破壊）。
  - `src/utils/versionManager.ts`: `version.json`を`NetworkFirst`で取得し、`REACT_APP_BUILD_VERSION`等の環境変数から現在バージョンを読み出して比較・更新処理を行う設計。ただし、環境変数はどこからも注入されていないため`currentVersion`が`null`になり、`isUpdateAvailable`が常に`false`（実質的に無効）。
  - `bin/version-inject.js`: `public/manifest.json`にビルド時のバージョン・タイムスタンプを挿入するが、`REACT_APP_BUILD_*`環境変数は設定しない。
  - `src/index.tsx`: VersionManagerの初期化・定期チェック・手動チェックフックを登録しているが、上記理由で効果が出ない。
  - `netlify.toml`: `version-check.js`や`manifest.json`へ`no-cache`ヘッダ付与は妥当だが、現状の`version-check.js`は非破壊ロギングのみ。
- 影響:
  - 「自動で新バージョン検知→必要時に更新を促す／キャッシュの整合性を保つ」といった目的が満たされていない。
  - 手動同期（`version-check.js`）と自動同期（`versionManager.ts`）が併存しているが、後者が動作していないため二重管理のコストのみ発生。
- 是正提案（いずれか）:
  1) 簡素化案: `versionManager.ts`の一式を撤去し、`version-check.js`も撤去。バンドルの変更は不要、更新は通常のデプロイに委ねる。
  2) 実運用案: `bin/version-inject.js`で`REACT_APP_BUILD_VERSION`/`REACT_APP_BUILD_TIMESTAMP`/`REACT_APP_BUILD_DATE`を`.env`に書き込み、`versionManager`が確実に現在バージョンをロードできるようにする。`version-check.js`は削除。
  3) 受動監視案: `versionManager`の`isUpdateAvailable`を`currentVersion`が`null`でも`version.json`の`timestamp`のみで更新判定するよう緩和し、更新時に軽量通知（UIトースト等）を行う。`version-check.js`は削除。

### 3. 未使用ユーティリティ
- 対象: `src/utils/version.ts`
- 状態: 参照箇所なし（`AboutUs.tsx`等で未使用）。
- 影響: 不要なバンドルサイズ増加と`package.json`参照によるクライアントバンドルの複雑化。
- 提案: 削除。バージョン表示が必要なら`manifest.json`または`version.json`から取得するUI専用コードを後日追加。

### 4. ドキュメントの記述不一致
- 対象: `VERSION_MANAGEMENT.md`
- 問題: `version-check.js`が「キャッシュクリアとリロードを行う」と記述されているが、現実装は非破壊記録のみ。
- 提案: ドキュメントを現実装に合わせて更新、または実装をドキュメント方針（キャッシュクリア＋リロード）に合わせて修正。バージョン検知を止める場合は該当章を削除。

## 今後の推奨対応（優先度順）
1. バージョン検知の一本化（`versionManager.ts`を活かす場合は環境変数注入を追加、活かさない場合は両方撤去）
2. 未使用ファイル `src/utils/version.ts` の削除
3. ドキュメントの整合性維持（実装と運用手順の同期）
4. 必要なら軽量な「新データ反映済み」通知UI（任意）

## 参考（証跡）
- `App.tsx`の修正: `isShopListChanged`削除、常時上書きへ変更
- `index.tsx` → `versionManager.initialize()` と `checkForUpdates()` の呼び出しあり
- `versionManager.ts` → `REACT_APP_BUILD_*`未設定時は `currentVersion=null` のまま
- `bin/config.js` → `REACT_APP_*`は`config.yml`のキーのみ注入
- `bin/version-inject.js` → `manifest.json`へバージョン埋め込み（`.env`未出力）
- `public/version-check.js` → 非破壊ロギングのみ、手動同期

---
本レポートに関する質問・方針決定がありましたら、次の対応（撤去／修正）を進めます。