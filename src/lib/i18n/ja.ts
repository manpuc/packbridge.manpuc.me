import type { Translation } from "./types";

const ja: Translation = {
	title: "マイクラ リソースパック 変換ツール | PackBridge",
	heading: "PackBridge",
	description: "Minecraft のリソースパックを Java Edition と Bedrock Edition の間で相互に変換します。変換はすべてブラウザ内で行われ、ファイルがサーバーに送信されることはありません。",
	metaDescription: "マイクラ（Minecraft）のJava版と統合版（Bedrock）の間でリソースパックを相互変換できる無料オンラインツールです。ブラウザ上で安全に、素早く変換できます。",
	h1Title: "Minecraft リソースパック変換ツール",

	// SEO Content
	introTitle: "PackBridge とは？",
	introDescription: "PackBridgeは、Minecraftの異なるエディション間（Java版 ⇄ 統合版）でリソースパックを変換するための強力なツールです。複雑なファイル構造の変換を自動化し、あなたの好みのテクスチャをどのデバイスでも楽しめるようにします。",
	introFeaturesTitle: "主な特徴",
	introFeature1: "ブラウザ完結：ファイルはサーバーに送信されず、手元のブラウザで安全に処理されます。",
	introFeature2: "相互変換：Java版から統合版へ、また統合版からJava版への双方向の変換をサポート。",
	introFeature3: "高速・軽量：独自の最適化アルゴリズムにより、大容量のパックもスムーズに変換可能です。",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",

	dropzoneTitle: "ファイルをドロップするか選択",
	dropzoneSubtitle: ".zip または .mcpack 形式に対応",
	dropzoneProcessing: "処理中...",
	targetVersion: "変換先のバージョン",

	btnConvert: "変換を開始",
	btnDownload: "変換済みパックをダウンロード",
	btnReset: "別のファイルを変換",

	reportTitle: "変換レポート",
	statusConverted: "変換済み",
	statusSkipped: "スキップ",
	statusError: "エラー",

	summaryTitle: "サマリー",
	countTotal: "合計ファイル数",
	countConverted: "変換成功",
	countSkipped: "スキップ",
	countErrors: "エラー",

	unsupportedTitle: "未対応・スキップされたファイル",
	unsupportedReason: "理由",

	errorNoFile: "ファイルを選択してください。",
	errorInvalidFile: "無効なファイル形式です。.zip または .mcpack を選択してください。",
	errorConversion: "変換中にエラーが発生しました。",
	warnPossibleBedrock: "選択されたファイル (.mcpack) は、すでに統合版用のリソースパックである可能性があります。Java版から変換する場合は、通常 Java版の .zip ファイルを選択します。",
	warnPossibleJava: "選択されたファイルは、すでにJava版用のリソースパックである可能性があります。統合版から変換する場合は、統合版用の .mcpack または .zip ファイルを選択してください。",

	footer: "PackBridge | Minecraft Resource Pack Converter",
	terms: "利用規約",
	keywords: "Minecraft, リソースパック, テクスチャパック, 変換, Java, Bedrock, 統合版, PackBridge, マイクラ, 変換シミュレーター, ポルティング",
	disclaimerPerfect: "※すべてのファイルの完全な変換を保証するものではありません。変換後に手動での修正が必要になる場合があります。",
	error404Title: "ページが見つかりません",
	error404Description: "申し訳ありません。お探しのページは存在しないか、移動した可能性があります。",

	// Terms of Use
	termsLastUpdated: "2024年4月22日",
	termsSections: [
		{
			title: "1. サービスの利用について",
			content: "本サービスは、MinecraftのレソースパックをJava版と統合版（Bedrock）の間で変換するためのツールです。全ての処理はユーザーのブラウザ内で行われ、ファイルが外部サーバーに送信されることはありません。",
		},
		{
			title: "2. 免責事項（自己責任）",
			content: "本サービス、および公開されているソースコードの利用は、全てユーザー自身の責任において行われるものとします。本サービスはすべてのファイルの完全な変換を保証するものではなく、変換後のデータに不具合が生じる可能性があります。本サービスの使用、またはソースコードの二次利用によって生じたいかなる損害についても、開発者は一切の責任を負いません。",
		},
		{
			title: "3. 著作権とライセンス",
			content: "本サービスのソースコードおよびデザインの著作権は manpuc に帰属します。\nソースコードの使用については自由ですが、利用の際は必ず manpuc（https://www.manpuc.me）による制作である旨を明記してください。\nまた、本サービスの完全な複製、および微細な変更のみを加えた状態での再配布・公開は固く禁止します。派生品を作成する場合は、独自のデザインや機能の追加を行ってください。",
		},
		{
			title: "4. 禁止事項",
			content: "ネットワークへの過度な負荷をかける行為、当サイトの運営を妨げる行為、および法令または公序良俗に反する行為を禁止します。",
		},
		{
			title: "5. 規約の変更",
			content: "本規約は、開発者の判断により予告なく変更される場合があります。継続して利用される場合は、最新の規約に同意したものとみなします。",
		},
		{
			title: "6. プライバシーポリシー",
			content: "・データの処理：本サービスで変換される全てのデータは、ユーザーのデバイス上のブラウザ内でローカルに処理されます。ファイルの内容が外部サーバーに送信されたり、収集されたりすることはありません。\n・アクセス解析：当サイトでは、利用状況把握のために Cloudflare Web Analytics を使用しています。これは統計的な情報を匿名で収集するもので、個人を特定する情報は収集しません。\n・ローカルストレージ：言語設定やテーマ（ダークモード）の保存のために、ブラウザの localStorage を使用します。",
		},
	],
	backToHome: "トップページへ戻る",
	viewSourceCode: "GitHub でソースコードを見る",
	openSourceText: "本サービスはオープンソースとして公開されています。",
};

export default ja;
