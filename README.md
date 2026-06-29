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
