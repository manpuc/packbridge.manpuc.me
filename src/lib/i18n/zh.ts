import type { Translation } from "./types";

const zh: Translation = {
	title: "我的世界资源包转换器 | PackBridge",
	heading: "PackBridge",
	description: "在 Java 版和基岩版之间转换我的世界资源包。所有操作都在您的浏览器中完成；您的文件绝不会上传到服务器。",
	metaDescription: "免费在线我的世界（Minecraft）资源包转换器。在 Java 版和基岩版（Bedrock）之间轻松转换，在浏览器本地处理，安全且快速。",
	h1Title: "我的世界资源包转换器",

	// SEO Content
	introTitle: "什么是 PackBridge？",
	introDescription: "PackBridge 是一款功能强大的工具，旨在不同版本的我的世界（Java ⇄ 基岩版）之间转换资源包。我们自动化了复杂的资源映射过程，让您可以在任何设备上享受喜爱的材质。",
	introFeaturesTitle: "主要功能",
	introFeature1: "本地处理：您的文件绝不会离开您的计算机。转换完全在您的网络浏览器中进行。",
	introFeature2: "双向转换：在 Java 版到基岩版以及基岩版到 Java 版之间无缝转换。",
	introFeature3: "快速轻量：针对速度进行了优化，让您在几秒钟内完成大容量资源包的转换。",

	directionJavaToBedrock: "Java → 基岩",
	directionBedrockToJava: "基岩 → Java",

	dropzoneTitle: "拖放文件或点击浏览",
	dropzoneSubtitle: "支持 .zip 或 .mcpack 文件",
	dropzoneProcessing: "处理中...",
	targetVersion: "目标版本",

	btnConvert: "开始转换",
	btnDownload: "下载转换后的包",
	btnReset: "转换另一个文件",

	reportTitle: "转换报告",
	statusConverted: "已转换",
	statusSkipped: "已跳过",
	statusError: "错误",

	summaryTitle: "摘要",
	countTotal: "总文件数",
	countConverted: "转换成功",
	countSkipped: "已跳过",
	countErrors: "错误",

	unsupportedTitle: "不支持/已跳过的文件",
	unsupportedReason: "原因",

	errorNoFile: "请选择一个文件。",
	errorInvalidFile: "无效的文件格式。请选择 .zip 或 .mcpack 文件。",
	errorConversion: "转换过程中发生错误。",
	warnPossibleBedrock: "所选文件 (.mcpack) 可能已经是基岩版资源包。从 Java 版转换时，通常应选择 Java 版的 .zip 文件。",
	warnPossibleJava: "所选文件可能已经是 Java 版资源包。从基岩版转换时，请确保选择基岩版的 .mcpack 或 .zip 文件。",

	footer: "PackBridge | Minecraft Resource Pack Converter",
	terms: "服务条款",
	keywords: "我的世界, 资源包, 材质包, 转换器, Java, 基岩版, PackBridge, 移植",
	disclaimerPerfect: "*注意：不保证所有文件的完美转换识别。转换后可能需要手动调整。",
	error404Title: "未找到页面",
	error404Description: "抱歉，您访问的页面不存在或已被移动。",

	// Terms of Use
	termsLastUpdated: "2024年4月22日",
	termsSections: [
		{
			title: "1. 服务使用",
			content: "本服务是用于在 Java 版和基岩版之间转换我的世界资源包的工具。所有处理均在浏览器中进行，文件不会上传。",
		},
		{
			title: "2. 免责声明 (责任自负)",
			content: "使用本服务及其源代码的风险由您自行承担。开发者 (manpuc) 对由此产生的任何损害或问题不承担任何责任。",
		},
		{
			title: "3. 版权与许可",
			content: "源代码及设计版权归 manpuc 所有。在使用时必须标明出处 (https://www.manpuc.me)。严禁完全复制或仅作微小改动后重新发布。",
		},
		{
			title: "4. 禁止行为",
			content: "禁止任何导致网络负荷过重、干扰运行或违反法律法规的行为。",
		},
		{
			title: "5. 条款变更",
			content: "本条款可能由开发者自行决定更改，恕不另行通知。继续使用本服务即视为您已同意最新条款。",
		},
		{
			title: "6. 隐私政策",
			content: "• 数据处理：通过本服务转换的所有数据均在用户的浏览器本地处理。文件内容绝不会发送到服务器或被服务器收集。\n• 网站分析：本网站使用 Cloudflare Web Analytics 来了解使用情况。这仅收集统计数据，不会识别个人身份。\n• 本地存储：我们使用浏览器的 localStorage 来保存您的语言和主题（深色模式）首选项。",
		},
	],
	backToHome: "回到首页",
	viewSourceCode: "在 GitHub 上查看源代码",
	openSourceText: "本服务已作为开源项目公开。",
};

export default zh;
