import type { Translation } from "./types";

const zh: Translation = {
	title: "我的世界资源包与材质包转换器 | PackBridge",
	heading: "PackBridge",
	description: "在 Java 版和基岩版之间转换我的世界资源包与材质包。所有操作都在您的浏览器中完成；您的文件绝不会上传到服务器。",
	metaDescription: "免费在线我的世界（Minecraft）资源包与材质包转换器。在 Java 版和基岩版（Bedrock）之间轻松转换，在浏览器本地处理，安全且快速。",
	h1Title: "我的世界资源包 / 材质包转换器",

	// SEO Content
	introTitle: "什么是 PackBridge？",
	introDescription: "PackBridge 是一款功能强大的在线工具，旨在不同版本的我的世界（Java ⇄ 基岩版）之间转换资源包与材质包。我们自动化了复杂的资源映射过程，让您可以在任何设备上享受喜爱的材质。",
	introFeaturesTitle: "主要功能",
	introFeature1: "本地处理：您的文件绝不会离开您的计算机。转换完全在您的网络浏览器中进行。",
	introFeature2: "双向转换：支持 Java 版与基岩版之间资源包和材质包的双向无缝转换。",
	introFeature3: "快速轻量：针对速度进行了优化，让您在几秒钟内完成大容量资源包的转换。",
	introFeature4: "版本转换：支持在同一版本内从旧版本更新到新版本。非常适合资源包移植（Porting）。",

	directionJavaToBedrock: "Java → 基岩",
	directionBedrockToJava: "基岩 → Java",
	directionVersionUpdate: "更改版本",
	sourceEdition: "源版本",
	targetEdition: "目标版本",
	editionJava: "Java版",
	editionBedrock: "基岩版",
	dropzoneTitle: "将文件拖放到此处，或点击浏览",
	dropzoneTitleMobile: "点击选择文件",
	dropzoneSubtitle: "支持 .zip 或 .mcpack 文件",
	dropzoneProcessing: "处理中...",
	sourceVersion: "源版本",
	targetVersion: "目标版本",
	autoDetected: "已自动检测",
	uploadToAutoDetect: "上传文件以自动检测",

	btnConvert: "开始转换",
	btnDownload: "下载转换后的包",
	inAppBrowserNotice: "应用内浏览器可能无法保存。",
	inAppBrowserAction: "请用 Safari 或 Chrome 打开",
	inAppBrowserOpenExternal: "在外部浏览器中打开",
	btnReset: "转换另一个文件",

	reportTitle: "转换报告",
	statusConverted: "已转换",
	statusSkipped: "已跳过",
	statusError: "错误",
	statusWarning: "警告",
	reportSearchPlaceholder: "按文件名或原因筛选...",
	reportFilterAll: "全部",
	reportNoMatches: "未找到匹配的文件",
	reportPrev: "上一页",
	reportNext: "下一页",

	summaryTitle: "转换完成！",
	countTotal: "总文件数",
	countConverted: "转换成功",
	countSkipped: "已跳过",
	countErrors: "错误",

	btnExportTxt: "导出 TXT",

	unsupportedTitle: "不支持/已跳过的文件",
	unsupportedReason: "原因",

	errorNoFile: "请选择一个文件。",
	errorInvalidFile: "无效的文件格式。请选择 .zip 或 .mcpack 文件。",
	errorConversion: "转换过程中发生错误。",
	errorFileExpired: "文件引用已失效，请重新选择文件。",
	errorZeroConverted: "未找到可转换的文件。请确保这是有效的 Minecraft 材质包压缩包。",
	warnPossibleBedrock: "所选文件 (.mcpack) 可能已经是基岩版资源包。从 Java 版转换时，通常应选择 Java 版的 .zip 文件。",
	warnPossibleJava: "所选文件可能已经是 Java 版资源包。从基岩版转换时，请确保选择基岩版的 .mcpack 或 .zip 文件。",
	warnNotMinecraftPack: "可能不是 Minecraft 材质包（未找到 pack.mcmeta、manifest.json 或材质文件夹）。",
	noticeAutoSwitchedToBedrockToJava: "检测到基岩版资源包，已自动将转换方向切换为 Bedrock → Java。",
	noticeAutoSwitchedToJavaToBedrock: "检测到 Java 版资源包，已自动将转换方向切换为 Java → Bedrock。",

	footer: "PackBridge | Minecraft Resource Pack & Texture Pack Converter",
	terms: "服务条款",
	keywords: "我的世界, 资源包, 材质包, 材质包转换, 资源包转换, 转换器, Java, 基岩版, PackBridge, 移植",
	disclaimerPerfect: "*注意：不保证所有文件的完美转换识别。转换后可能需要手动调整。",
	error404Title: "未找到页面",
	error404Description: "抱歉，您访问的页面不存在或已被移动。",

	// Terms of Use
	termsLastUpdatedLabel: "最后更新",
	termsLastUpdated: "2026年11月27日",
	termsSections: [
		{
			title: "1. 服务使用",
			content: "本服务提供我的世界（Minecraft）资源包与材质包在 Java 版与基岩版之间的互转、同一版本体系内的版本迁移，以及实验性测试版功能（GUI 转换、FFmpeg 音频重编码、PBR 光影贴图转换、3D 自定义模型转换）。所有转换均在您的浏览器本地完成，资源包文件不会上传至外部服务器。转换后的元数据（manifest.json、pack.mcmeta、.jem）会附带 PackBridge 转换署名。",
		},
		{
			title: "2. 免责声明与第三方权利 (责任自负)",
			content: "使用本服务及其源代码的风险完全由您自行承担。本服务不保证所有文件（包括测试版功能）均能完美转换，转换后的数据可能存在显示异常或兼容性问题，开发者 (manpuc) 对由此产生的任何损失或问题概不负责。\n在转换、使用或重新分发第三方制作的资源包时，请务必自行确认并遵守原作者的许可协议与使用条款。\n本服务为非官方工具，并非官方 Minecraft 产品，未获得 Mojang AB 或 Microsoft 的批准或关联（NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.）。",
		},
		{
			title: "3. 版权与许可",
			content: "源代码及设计版权归 manpuc 所有。在使用时必须标明出处 (https://www.manpuc.me)。严禁完全复制或仅作微小改动后重新发布。",
		},
		{
			title: "4. 禁止行为",
			content: "禁止任何导致网络负荷过重、干扰网站运行、侵犯第三方知识产权或违反法律法规的行为。",
		},
		{
			title: "5. 条款变更",
			content: "本条款可能由开发者自行决定更改，恕不另行通知。继续使用本服务即视为您已同意最新条款。",
		},
		{
			title: "6. 隐私政策",
			content: "• 数据处理：通过本服务转换的所有资源包文件均在您的浏览器本地处理，压缩包及内部资产绝不会上传或被服务器收集。\n• 外部库与字体：启用“音频重新编码”测试功能并处理目标音频时，浏览器会从外部 CDN（unpkg.com / cdn.jsdelivr.net）加载经 SHA-256 校验的 FFmpeg 库；页面字体加载自 Google Fonts。您的资源包数据不会发送给上述服务商，但标准 HTTP 请求信息（如 IP 地址）将由对应 CDN 处理。\n• 网站分析：本网站使用无 Cookie 的 Umami 收集匿名统计数据，以及已脱敏处理（隐去文件名、路径、URL 和个人信息）的技术错误摘要，不会识别个人身份或收集包内容。\n• 浏览器存储（localStorage / sessionStorage）：用于保存语言、主题、界面状态与测试功能开关、不含 UUID 的匿名本地转换次数统计，以及用于问题反馈的临时日志和防刷冷却时间（重置或关闭标签页后清除）。\n• 问题报告：仅当您主动提交问题报告时，您填写的描述、可选回复邮箱（仅限 Formspree 直接提交且仅用于回复）、浏览器/系统信息以及您勾选附加的文件名与错误日志会发送至 Formspree（formspree.io）或公开的 GitHub Issues（github.com）。资源包文件本体绝不会上传。",
		},
	],
	backToHome: "回到首页",
	viewSourceCode: "在 GitHub 上查看源代码",
	openSourceText: "本服务已作为开源项目公开。",
	betaFeatures: "测试版功能",
	betaActiveCount: "已启用 {count} 项",
	enableGuiConversion: "GUI 界面转换",
	enableAudioReencode: '音频重新编码 (FFmpeg, ~10MB)',
	enablePbrConversion: 'PBR / 光影贴图转换 (RTX ⇄ LabPBR)',
	enableModelConversion: '3D 自定义模型转换 (Geo ⇄ JSON/CEM)',
	betaWarningAudioReencode: '首次使用时加载约 10MB 的 FFmpeg 库，在保留单声道/立体声的同时将 .wav/.mp3 及非 44.1kHz/非 Vorbis 的 .ogg 重新编码（会增加转换时间与 CPU 占用）。',
	betaWarningGuiConversion: '会动态裁剪 icons.png 和 widgets.png，高清包可能会消耗更多内存。此外由于 Java 版与基岩版 GUI 结构差异，部分物品栏或容器界面可能无法完全对齐。',
	betaWarningPbrConversion: '在基岩版 RTX/Deferred PBR 贴图 (_mer/_normal) 与 Java 版 LabPBR 光影贴图 (_s/_n) 之间相互转换。逐像素重映射会增加处理时间，且 Java 版需配合 Iris/OptiFine 等光影模组使用。',
	betaWarningModelConversion: '实验性转换 3D 方块/物品模型与实体几何 (.geo.json ⇄ .json / OptiFine CEM .jem)。复杂骨骼或动画可能会出现偏移。',
};

export default zh;
