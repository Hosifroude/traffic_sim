# 交通シナリオエディタ Prototype

React + TypeScript + Vite で作成した、スマホ対応の見下ろし型「交通シナリオエディタ」プロトタイプです。外部の画像・アイコン・車両素材は使わず、道路・車両・ゴースト軌跡を SVG と CSS で仮実装しています。

## 実装内容

- 十字路マップと 2 台の車両表示
- 0.1 秒単位の時間送り、戻し、再生、停止、リセット
- 車両クリック/タップによる選択
- 選択車両への運転操作追加
  - 目標速度 km/h
  - 所要時間 秒
  - 進行方向（直進 / 左折 / 右折 / 停止）
  - ブレーキ強度（なし / 通常 / 強め / 急制動）
- 操作追加後の軌跡再計算
- 1 秒ごとのゴースト位置と走行軌跡表示
- 車両同士の簡易矩形衝突判定と衝突時刻表示
- Scenario JSON 表示とクリップボードコピー
- 描画、シミュレーション、衝突判定、UI を分離

## 起動方法

```bash
npm install
npm run dev
```

本番ビルド:

```bash
npm run build
```

GitHub Pages で扱いやすいよう、Vite の `base` は相対パス `./` にしています。


## GitHub Pages への公開

`main` ブランチへマージまたは直接 push されると、GitHub Actions の `Deploy Pages` ワークフローが Vite の本番ビルドを作成し、生成された `dist/` を GitHub Pages へ自動デプロイします。

公開 URL は通常、リポジトリ名に応じて次の形式になります。

```text
https://<OWNER>.github.io/<REPOSITORY>/
```

カスタムドメインを設定している場合は GitHub Pages の設定画面に表示される URL が優先されます。デプロイ完了後の正確な URL は、`Deploy Pages` ワークフローの `github-pages` environment URL から確認できます。

### GitHub 側で必要な設定

1. GitHub リポジトリの **Settings > Pages** を開きます。
2. **Build and deployment** の **Source** で **GitHub Actions** を選択します。
3. `main` ブランチへ変更をマージすると、`Deploy Pages` ワークフローが `dist/` を Pages artifact としてアップロードし、GitHub Pages へ公開します。

### ローカルでの確認方法

```bash
npm install
npm run build
npm run preview
```

GitHub Pages のプロジェクトサイト、ユーザー/Organization サイト、将来的な Capacitor などの WebView 配信でも同じ成果物を扱いやすいよう、Vite の `base` は相対パス `./` にしています。アプリ本体は `src/` 以下に閉じ、Pages 用の設定は GitHub Actions に分離しているため、今後 PWA や Capacitor を追加する場合も既存の UI・シミュレーション層を保ったまま拡張できます。

## ファイル構成

```text
src/
  types.ts                    # Scenario / Vehicle / Event などの型定義
  sampleScenario.ts           # 初期シナリオデータ
  simulation/
    engine.ts                 # 時間ごとの車両状態計算
    collision.ts              # 簡易矩形衝突判定
  components/
    Stage.tsx                 # SVG による道路・車両・ゴースト描画
    Controls.tsx              # 時間操作 UI
    VehiclePanel.tsx          # 車両操作パネル
  App.tsx                     # 全体状態管理
  main.tsx                    # React エントリポイント
  styles.css                  # 通常 CSS
```

## 依存ライブラリとライセンス

最小限のフロントエンド依存のみを使用しています。いずれも商用利用しやすい MIT ライセンスです。

- React: MIT License
- React DOM: MIT License
- Vite: MIT License
- TypeScript: Apache License 2.0

## 次に追加すべき改善点

- 回転矩形ベースのより正確な衝突判定
- 車線、停止線、信号、横断歩道などのマップ要素
- タイムライン上でのイベント編集・削除・ドラッグ移動
- JSON インポート、保存、複数シナリオ管理
- 曲率や加速度を考慮したより自然な車両運動
- PixiJS などへの描画レイヤー差し替え
- Capacitor による Android アプリ化
- Playwright などによる UI 回帰テスト

## ビルド検証について

Codex 実行環境では `npm install` が npm registry への HTTP 403 で失敗するため、依存関係のインストール後に実行する `npm run build` は未確認です。npm registry にアクセスできる GitHub Actions 上で `npm install` と `npm run build` を実行し、ビルドを検証します。
