# 🌉 PackBridge | Minecraft Resource Pack Converter

**PackBridge** は、Minecraft のリソースパックを Java Edition と Bedrock Edition の間で相互に変換するための、高速でプライバシーを重視した Web アプリケーションです。

すべての変換処理はユーザーのブラウザ内で行われるため、ファイルがサーバーにアップロードされることはありません。大容量のファイルでも安心して変換できます。

> [!IMPORTANT]
> **免責事項**: 本ツールはすべてのファイルの完全な変換を保証するものではありません。リソースパックの構造やバージョンによっては、変換後に手動での修正が必要になる場合があります。

---

## ✨ 主な機能

- **相互変換**: Java Edition ✨ Bedrock Edition の双方向変換に対応。
- **ブラウザ完結**: クライアントサイドですべての処理を実行。サーバーへのアップロード不要。
- **多言語対応 (i18n)**: 日本語、英語、韓国語、中国語、タガログ語、トキポナをサポート。
- **テクニカルSEO**: 言語別のメタタグ、`hreflang`、構造化データにより検索エンジンに最適化。
- **モダンなUI**: ガラスモーフィズムを採用した、美しくレスポンシブなデザイン。

## 🛠 テクニカルスタック

- **Framework**: [Astro](https://astro.build/)
- **Logic**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Archive Handling**: [JSZip](https://stuk.github.io/jszip/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Static Analysis**: [Astro sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/) (推奨)

## 🚀 はじめかた

### 1. 依存関係のインストール

プロジェクトをクローンした後、パッケージをインストールします。

```bash
pnpm install
```

### 2. 開発サーバーの起動

```bash
pnpm dev
```

ローカル環境（デフォルトは `http://localhost:4321`）でプロジェクトが立ち上がります。

### 3. ビルド

```bash
pnpm build
```

`dist/` ディレクトリに静的ファイルが生成されます。

---

## 📂 プロジェクト構造

```text
src/
├── components/   # React コンポーネント (Converter, Toggle etc.)
├── layouts/      # Astro レイアウト (SEO ロジックを含む)
├── lib/          # 変換ロジック、i18n 設定、定数
│   └── pack/     # リソースパック変換のコアロジック
├── pages/        # Astro ページ (動的ルーティングによる多言語化)
└── styles/       # グローバルスタイル
```

## 📄 ライセンスと著作権

このプロジェクトのソースコードおよびデザインの著作権は **manpuc** に帰属します。

- ソースコードの使用は自由ですが、利用の際は [manpuc.me](https://www.manpuc.me) への帰属を明記してください。
- デザインの完全な複製、および微細な変更のみを加えた状態での再配布は禁止されています。

---

Developed by [manpuc](https://www.manpuc.me)
