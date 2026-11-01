# PackBridge | Minecraft Resource Pack & Texture Pack Converter

PackBridge は、Minecraft のリソースパック・テクスチャパックを Java Edition と Bedrock Edition の間で相互変換する Web アプリケーションです。
すべての変換処理はブラウザ内（Web Worker）で完結し、ファイルが外部サーバーに送信されることはありません。

---

## 主な機能

- **相互変換**: Java Edition と Bedrock Edition 間の双方向変換に対応。
- **バージョン更新**: 同一エディション内での旧バージョンから新バージョンへの変換に対応。
- **ブラウザ完結**: クライアントサイドで処理を実行。サーバーへのアップロード不要。
- **高精度マッピング**: GeyserMC（サウンド定義）および PrismarineJS（言語・アイテム定義）のデータを取り込んだマッピングを搭載。
- **多言語対応**: 日本語、英語、韓国語、中国語、タガログ語、トキポナ、スペイン語、フランス語、ドイツ語をサポート。

---

## 技術スタック

- **フレームワーク**: Astro
- **UI / ロジック**: React, TypeScript, Framer Motion
- **アーカイブ処理**: fflate, JSZip
- **音声処理**: ffmpeg.wasm, FSB5 パーサー
- **データソース**: GeyserMC mappings, PrismarineJS (minecraft-data)

---

## コマンド一覧

### 依存関係のインストール

```bash
pnpm install
```

### 開発サーバーの起動

```bash
pnpm dev
```

ローカル環境（`http://localhost:4321`）で開発サーバーが起動します。

### 本番ビルド

```bash
pnpm build
```

`dist/` ディレクトリに本番用静的アセットが生成されます。

### ビルド成果物のプレビュー

```bash
pnpm preview
```

`pnpm build` で生成された静的ファイルをローカルで配信・確認します。

### マッピングデータの自動更新

```bash
pnpm run update-mappings
```

GeyserMC の最新サウンド定義および PrismarineJS の言語・アイテム定義を取得し、`src/lib/pack/mappings/` 配下の各バージョン別マッピングファイルおよびフォールバック用の `mappings.json` を一括更新します。

---

## プロジェクト構造

```text
scripts/
└── generate_mappings.ts  # マッピング自動取得・更新スクリプト
src/
├── components/           # React コンポーネント (Converter, Toggle など)
├── layouts/              # Astro レイアウト
├── lib/
│   ├── i18n/             # 多言語翻訳定義
│   └── pack/             # 変換コアロジック
│       ├── mappings/     # バージョン別マッピング定義 (JSON)
│       ├── processors/   # 各アセット処理 (音声, 言語, アニメーション, GUI など)
│       ├── converter.worker.ts  # Web Worker による並列変換処理
│       └── rules.ts      # パス変換ルール
├── pages/                # Astro ページルーティング
└── styles/               # グローバルスタイル
```

---

## デプロイについて

Vercel や Cloudflare Pages にデプロイする際、`pnpm run update-mappings` をビルド時に実行する必要はありません。
ローカルで更新済みのマッピングファイル（`src/lib/pack/mappings/`）をそのまま Git にコミットしてプッシュすることで反映されます。

---

## ライセンスと著作権

このプロジェクトは **MIT License (with Brand Protection)** のもとで公開されています。

- **コード・ロジックの利用**: ソースコードや変換ロジックを他のプロジェクトやサービスで利用・派生させる場合は、原作者（[manpuc.me](https://www.manpuc.me)）および PackBridge への明確な帰属（クレジット表記・リンク）が**必須**です。
- **ブランド・デザインの保護**: 「PackBridge」の名称・ロゴ、および独自デザイン（UI/見た目）をそのまま複製したクローンサイトの公開や商用利用は禁止されています。

詳細は [LICENSE](./LICENSE) ファイルをご確認ください。

Developed by [manpuc](https://www.manpuc.me)
