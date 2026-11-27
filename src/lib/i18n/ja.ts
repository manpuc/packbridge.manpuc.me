import type { Translation } from "./types";

const ja: Translation = {
	title: "マイクラ リソースパック・テクスチャパック 変換ツール | PackBridge",
	heading: "PackBridge",
	description: "Minecraft のリソースパックやテクスチャパックを Java Edition と Bedrock Edition の間で相互に変換します。変換はすべてブラウザ内で行われ、ファイルがサーバーに送信されることはありません。",
	metaDescription: "マイクラ（Minecraft）のJava版と統合版（Bedrock）の間でリソースパックやテクスチャパック（テクスチャ）を相互変換できる無料オンラインツールです。ブラウザ上で安全に、素早く変換できます。",
	h1Title: "Minecraft リソースパック / テクスチャパック変換ツール",

	// SEO Content
	introTitle: "PackBridge とは？",
	introDescription: "PackBridgeは、Minecraftの異なるエディション間（Java版 ⇄ 統合版）でリソースパックやテクスチャパック（テクスチャ）を変換するための強力なオンラインツールです。複雑なファイル構造の変換を自動化し、あなたの好みのテクスチャをどのデバイスでも楽しめるようにします。",
	introFeaturesTitle: "主な特徴",
	introFeature1: "ブラウザ完結：ファイルはサーバーに送信されず、手元のブラウザで安全に処理されます。",
	introFeature2: "相互変換：Java版 ⇄ 統合版（Bedrock）でのリソースパック・テクスチャパックの双方向変換に対応。",
	introFeature3: "高速・軽量：独自の最適化アルゴリズムにより、大容量のパックもスムーズに変換可能です。",
	introFeature4: "バージョン変換：同じエディション内で古いバージョンから新しいバージョンへの更新にも対応。パックのポルティング（Porting）にも最適です。",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",
	directionVersionUpdate: "バージョン変換",
	sourceEdition: "変換元のエディション",
	targetEdition: "変換先のエディション",
	editionJava: "Java版",
	editionBedrock: "統合版 (Bedrock)",

	dropzoneTitle: "ファイルをドロップするか選択",
	dropzoneTitleMobile: "タップしてファイルを選択",
	dropzoneSubtitle: ".zip または .mcpack 形式に対応",
	dropzoneProcessing: "処理中...",
	dropzonePrivacyBadge: "100% クライアント処理 • ファイルは外部サーバーに送信されません",
	sourceVersion: "変換元のバージョン",
	targetVersion: "変換先のバージョン",
	autoDetected: "自動検出済み",
	uploadToAutoDetect: "ファイルをアップロードして自動検出",

	btnConvert: "変換を開始",
	btnDownload: "変換済みパックをダウンロード",
	inAppBrowserNotice: "アプリ内ブラウザではファイルを保存できないことがあります。",
	inAppBrowserAction: "Safari・Chromeで開いてください",
	inAppBrowserOpenExternal: "外部ブラウザで開く",
	btnReset: "別のファイルを変換",

	reportTitle: "変換レポート",
	statusConverted: "変換済み",
	statusSkipped: "スキップ",
	statusError: "エラー",
	statusWarning: "警告",
	reportSearchPlaceholder: "ファイル名・理由で絞り込み...",
	reportFilterAll: "すべて",
	reportNoMatches: "該当ファイルは見つかりませんでした",
	reportPrev: "前へ",
	reportNext: "次へ",

	summaryTitle: "変換完了！",
	countTotal: "合計ファイル数",
	countConverted: "変換成功",
	countSkipped: "スキップ",
	countErrors: "エラー",

	btnExportTxt: "TXT保存",

	unsupportedTitle: "未対応・スキップされたファイル",
	unsupportedReason: "理由",

	errorNoFile: "ファイルを選択してください。",
	errorInvalidFile: "無効なファイル形式です。.zip または .mcpack を選択してください。",
	errorConversion: "変換中にエラーが発生しました。",
	errorFileExpired: "ファイルの参照が切れました。もう一度ファイルを選択してください。",
	errorZeroConverted: "変換可能なファイルが見つかりませんでした。MinecraftリソースパックのZIPファイルであることをご確認ください。",
	warnPossibleBedrock: "選択されたファイル (.mcpack) は、すでに統合版用のリソースパック（テクスチャパック）である可能性があります。Java版から変換する場合は、通常 Java版の .zip ファイルを選択します。",
	warnPossibleJava: "選択されたファイルは、すでにJava版用のリソースパック（テクスチャパック）である可能性があります。統合版から変換する場合は、統合版用の .mcpack または .zip ファイルを選択してください。",
	warnNotMinecraftPack: "Minecraftのリソースパックではない可能性があります（pack.mcmeta や manifest.json、テクスチャフォルダが見つかりません）。",
	noticeAutoSwitchedToBedrockToJava: "統合版（Bedrock）パックを検出したため、変換方向を「Bedrock → Java」に自動で切り替えました。",
	noticeAutoSwitchedToJavaToBedrock: "Java版パックを検出したため、変換方向を「Java → Bedrock」に自動で切り替えました。",

	footer: "PackBridge | Minecraft Resource Pack & Texture Pack Converter",
	terms: "利用規約",
	keywords: "Minecraft, リソースパック, テクスチャパック, テクスチャ, 変換, リソースパック 変換, テクスチャパック 変換, テクスチャ 変換, Java, Bedrock, 統合版, PackBridge, マイクラ, 変換シミュレーター, ポルティング",
	disclaimerPerfect: "※すべてのファイルの完全な変換を保証するものではありません。変換後に手動での修正が必要になる場合があります。",
	error404Title: "ページが見つかりません",
	error404Description: "申し訳ありません。お探しのページは存在しないか、移動した可能性があります。",

	// Terms of Use
	termsLastUpdatedLabel: "最終更新",
	termsLastUpdated: "2026年11月27日",
	termsSections: [
		{
			title: "1. サービスの利用について",
			content: "本サービスは、MinecraftのリソースパックおよびテクスチャパックをJava版と統合版（Bedrock）の間で相互変換するほか、同一エディション間のバージョン変換や実験的なベータ機能（GUI変換・FFmpeg音声再エンコード・PBRシェーダーマップ変換・3Dカスタムモデル変換）を提供するツールです。変換処理はすべてユーザーのブラウザ内で行われ、パックファイルが外部サーバーに送信されることはありません。なお、変換後のメタデータ（manifest.json / pack.mcmeta / .jem）には本サービスによる変換クレジットが付記されます。",
		},
		{
			title: "2. 免責事項・第三者の権利（自己責任）",
			content: "本サービスおよび公開されているソースコードの利用は、すべてユーザー自身の責任において行われるものとします。標準機能・ベータ機能を問わず、すべてのファイルの完全な変換や動作を保証するものではなく、変換後のデータに表示崩れや不具合が生じる場合があります。本サービスの使用またはソースコードの二次利用によって生じたいかなる損害についても、開発者は一切の責任を負いません。\nまた、第三者が制作したリソースパックを変換・利用・再配布する場合は、元パック制作者の利用規約・ライセンスをユーザー自身の責任で確認し遵守してください。\n本サービスは非公式ツールであり、Mojang AB または Microsoft によって承認・関連付けられた公式の Minecraft 製品ではありません（NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.）。",
		},
		{
			title: "3. 著作権とライセンス",
			content: "本サービスのソースコードおよびデザインの著作権は manpuc に帰属します。\nソースコードの使用については自由ですが、利用の際は必ず manpuc（https://www.manpuc.me）による制作である旨を明記してください。\nまた、本サービスの完全な複製、および微細な変更のみを加えた状態での再配布・公開は固く禁止します。派生品を作成する場合は、独自のデザインや機能の追加を行ってください。",
		},
		{
			title: "4. 禁止事項",
			content: "ネットワークへの過度な負荷をかける行為、当サイトの運営を妨げる行為、第三者の知的財産権を侵害する行為、および法令または公序良俗に反する行為を禁止します。",
		},
		{
			title: "5. 規約の変更",
			content: "本規約は、開発者の判断により予告なく変更される場合があります。継続して利用される場合は、最新の規約に同意したものとみなします。",
		},
		{
			title: "6. プライバシーポリシー",
			content: "・データの処理：本サービスで変換されるすべてのパックデータは、ユーザーのデバイス上のブラウザ内でローカルに処理されます。ファイル本体や内部アセットが外部サーバーへアップロード・収集されることはありません。\n・外部ライブラリ・フォントの取得：ベータ機能「音声を再エンコード」を有効にして対象音声を変換する際、外部CDN（unpkg.com / cdn.jsdelivr.net）からSHA-256整合性検証付きでFFmpegライブラリを取得します。また、表示用フォントの読み込みに Google Fonts を利用しています。これら外部配信元へユーザーのパックデータが送信されることはありませんが、通信仕様上IPアドレス等の標準リクエスト情報が各配信元に送信されます。\n・アクセス解析：利用状況の把握と品質改善のため、Cookieを使用しない Umami を利用しています。収集されるデータは匿名の統計情報、およびファイル名・パス・URL・個人情報をマスクした技術エラー概要のみであり、個人やパック内容を特定する情報は収集しません。\n・ブラウザストレージ（localStorage / sessionStorage）：言語・テーマ・UI表示状態・ベータ機能設定の保持、個人識別子を含まない匿名の累計変換回数カウント（統計上の初回/リピート区分用）、および不具合報告補助用の一時変換ログ・連続送信防止時刻（リセット時またはタブ終了時に消去）の保存に使用します。\n・不具合報告の送信：ユーザーが任意で不具合報告フォームを送信した場合に限り、入力内容、任意の返信用メールアドレス（直接送信時のみ・返信目的限定）、ブラウザ/OS情報、およびユーザーが添付を選択したファイル名・エラーログが Formspree（formspree.io）または公開の GitHub Issues（github.com）へ送信されます。パックファイル本体が送信されることはありません。",
		},
	],
	backToHome: "トップページへ戻る",
	viewSourceCode: "GitHub でソースコードを見る",
	openSourceText: "本サービスはオープンソースとして公開されています。",
	betaFeatures: "ベータ機能",
	betaActiveCount: "{count}件有効",
	enableGuiConversion: "GUI変換",
	enableAudioReencode: '音声を再エンコード (FFmpeg, 約10MB)',
	enablePbrConversion: 'PBR・シェーダーマップ変換 (RTX ⇄ LabPBR)',
	enableModelConversion: '3Dカスタムモデル変換 (Geo ⇄ JSON/CEM)',
	betaWarningAudioReencode: '初回に約10MBのFFmpegライブラリを読み込み、.wav/.mp3や非44.1kHz/非Vorbisの.oggをモノラル/ステレオを維持したまま再エンコードします（変換時間とCPU負荷が増加します）。',
	betaWarningGuiConversion: 'icons.png / widgets.png の動的切り抜きを行うため高解像度パックではメモリ消費が増加します。また、Java版とBedrock版でGUIのレイアウト構造が異なるため、インベントリやコンテナ画面で一部表示崩れが生じる場合があります。',
	betaWarningPbrConversion: '統合版RTX/Deferred PBRマップ（_mer/_normal）とJava版シェーダー規格（LabPBR _s/_n）を相互変換します。ピクセル単位の再計算を行うため処理時間が増加し、Java版ではIrisやOptiFine等のシェーダーModが必要です。',
	betaWarningModelConversion: 'ブロック・アイテムの3Dモデルおよびエンティティジオメトリ（.geo.json ⇄ .json / OptiFine CEM .jem）を実験的に変換します。ボーン構造やアニメーションの違いにより一部形状が崩れる場合があります。',
};

export default ja;
