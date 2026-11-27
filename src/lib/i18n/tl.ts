import type { Translation } from "./types";

const tl: Translation = {
	title: "Minecraft Resource Pack & Texture Pack Converter | PackBridge",
	heading: "PackBridge",
	description: "I-convert ang mga Minecraft resource pack at texture pack sa pagitan ng Java Edition at Bedrock Edition. Ang lahat ay nangyayari sa iyong browser; ang iyong mga file ay hindi kailanman ina-upload sa isang server.",
	metaDescription: "Libreng online na tool para i-convert ang Minecraft resource packs at texture packs sa pagitan ng Java Edition at Bedrock Edition. Ligtas at mabilis sa iyong browser.",
	h1Title: "Minecraft Resource Pack & Texture Pack Converter",

	// SEO Content
	introTitle: "Ano ang PackBridge?",
	introDescription: "Ang PackBridge ay isang mahusay na tool para i-convert ang mga Minecraft resource pack at texture pack sa pagitan ng iba't ibang edisyon (Java ⇄ Bedrock). Awtomatiko naming binabago ang mga asset para ma-enjoy mo ang iyong paboritong textures sa anumang device.",
	introFeaturesTitle: "Pangunahing Tampok",
	introFeature1: "Lokal na Pagproseso: Ang iyong mga file ay hindi umaalis sa iyong computer. Ang conversion ay nangyayari sa loob ng iyong web browser.",
	introFeature2: "Bidirectional: Madaling mag-convert ng resource pack at texture pack mula Java patungong Bedrock at Bedrock patungong Java.",
	introFeature3: "Mabilis at Magaan: Optimized para sa bilis, na nagbibigay-daan sa iyo na mag-convert ng malalaking pack sa loob ng ilang segundo.",
	introFeature4: "Conversion ng Bersyon: Sinusuportahan ang pag-update mula sa mas lumang mga bersyon patungo sa mas bagong mga bersyon sa loob ng parehong edisyon.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",
	directionVersionUpdate: "Baguhin ang Bersyon",
	sourceEdition: "Pinagmulang Edisyon",
	targetEdition: "Target na Edisyon",
	editionJava: "Java Edition",
	editionBedrock: "Bedrock Edition",

	dropzoneTitle: "I-drop ang iyong pack dito o i-click para mag-browse",
	dropzoneTitleMobile: "I-tap para pumili ng pack",
	dropzoneSubtitle: "Sinusuportahan ang mga .zip o .mcpack na file",
	dropzoneProcessing: "Pinoproseso...",
	sourceVersion: "Source Version",
	targetVersion: "Target na Bersyon",
	autoDetected: "Auto-detected",
	uploadToAutoDetect: "Mag-upload ng file para ma-auto-detect",

	btnConvert: "Simulan ang Pag-convert",
	btnDownload: "I-download ang Na-convert na Pack",
	inAppBrowserNotice: "Maaaring hindi ma-save sa in-app browser.",
	inAppBrowserAction: "Buksan sa Safari o Chrome",
	inAppBrowserOpenExternal: "Buksan sa external browser",
	btnReset: "Mag-convert ng ibang file",

	reportTitle: "Ulat ng Pag-convert",
	statusConverted: "Na-convert",
	statusSkipped: "Nilaktawan",
	statusError: "Error",
	statusWarning: "Babala",
	reportSearchPlaceholder: "I-filter ayon sa filename o dahilan...",
	reportFilterAll: "Lahat",
	reportNoMatches: "Walang nahanap na katugmang file",
	reportPrev: "Nakaraan",
	reportNext: "Susunod",

	summaryTitle: "Kumpleto na ang Conversion!",
	countTotal: "Kabuuang mga File",
	countConverted: "Na-convert",
	countSkipped: "Nilaktawan",
	countErrors: "Mga Error",

	btnExportTxt: "I-export ang TXT",

	unsupportedTitle: "Hindi Suportado / Nilaktawan na mga File",
	unsupportedReason: "Dahilan",

	errorNoFile: "Mangyaring pumili ng file.",
	errorInvalidFile: "Maling format ng file. Pumili ng .zip o .mcpack na file.",
	errorConversion: "Nagkaroon ng error habang nagko-convert.",
	errorFileExpired: "Nag-expire ang reference ng file. Pakipili muli ang file.",
	errorZeroConverted: "Walang nakitang maikokumberteng file. Pakitiyak na ito ay isang wastong Minecraft resource pack archive.",
	warnPossibleBedrock: "Maaaring ang napiling file (.mcpack) ay isa nang Bedrock Edition resource pack. Kapag nag-convert mula sa Java, karaniwan kang pumipili ng Java Edition .zip file.",
	warnPossibleJava: "Maaaring ang napiling file ay isa nang Java Edition resource pack. Kapag nag-convert mula sa Bedrock, siguraduhing pumili ng Bedrock Edition na .mcpack o .zip file.",
	warnNotMinecraftPack: "Maaaring hindi ito Minecraft resource pack (walang natagpuang pack.mcmeta, manifest.json, o folder ng texture).",
	noticeAutoSwitchedToBedrockToJava: "May natuklasang Bedrock pack — awtomatikong inilipat ang direksyon sa Bedrock → Java.",
	noticeAutoSwitchedToJavaToBedrock: "May natuklasang Java pack — awtomatikong inilipat ang direksyon sa Java → Bedrock.",

	footer: "PackBridge | Minecraft Resource Pack & Texture Pack Converter",
	terms: "Kasunduan sa Serbisyo",
	keywords: "Minecraft, Resource Pack, Texture Pack, Converter, Texture Pack Converter, Java to Bedrock, Bedrock to Java, PackBridge",
	disclaimerPerfect: "*Tandaan: Hindi garantisado ang perpektong conversion ng lahat ng file. Maaaring kailanganin ang manual na pagsasaayos pagkatapos ng conversion.",
	error404Title: "Hindi Nahanap ang Pahina",
	error404Description: "Paumanhin, ang pahinang hinahanap mo ay hindi umiiral o nailipat na.",

	// Terms of Use
	termsLastUpdatedLabel: "Huling Na-update",
	termsLastUpdated: "Nobyembre 27, 2026",
	termsSections: [
		{
			title: "1. Paggamit ng Serbisyo",
			content: "Ang serbisyong ito ay nagko-convert ng Minecraft resource packs at texture packs sa pagitan ng Java at Bedrock editions, nag-a-update ng bersyon sa loob ng parehong edisyon, at nag-aalok ng mga eksperimental na beta feature (GUI conversion, FFmpeg audio re-encoding, PBR shader maps, at 3D custom models). Ang lahat ng conversion ay ginagawa nang lokal sa browser; walang pack files na ina-upload sa server. Ang na-convert na metadata (manifest.json, pack.mcmeta, .jem) ay may kasamang PackBridge attribution credit.",
		},
		{
			title: "2. Disclaimer at Karapatan ng Third-Party",
			content: "Ang paggamit ng serbisyong ito at ng source code nito ay nasa sarili ninyong panganib. Hindi garantisado ang perpektong conversion ng lahat ng file (kabilang ang mga beta feature), at maaaring magkaroon ng isyu sa na-convert na data. Ang developer (manpuc) ay hindi mananagot sa anumang pinsala o problema.\nKapag nagko-convert, gumagamit, o muling namamahagi ng third-party resource packs, ikaw lamang ang may responsibilidad na suriin at sundin ang lisensya at tuntunin ng orihinal na gumawa.\nHINDI ITO OPISYAL NA PRODUKTO NG MINECRAFT (NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.).",
		},
		{
			title: "3. Copyright at Lisensya",
			content: "Ang copyright sa source code at disenyo ay pag-aari ni manpuc. Malaya itong gamitin basta may tamang attribution (https://www.manpuc.me). Bawal ang pag-clone o pagkopya ng buo nang walang malaking pagbabago.",
		},
		{
			title: "4. Mga Pinagbabawal",
			content: "Ipinagbabawal ang anumang gawain na nagdudulot ng labis na load sa network, nakakasira sa operasyon ng site, lumalabag sa intellectual property ng iba, o labag sa batas.",
		},
		{
			title: "5. Mga Pagbabago sa Kasunduan",
			content: "Ang mga tuntuning ito ay maaaring mabago sa anumang oras sa discretion ng developer nang walang paunang abiso. Sa pagpapatuloy ng paggamit ng serbisyo, ituturing na sumasang-ayon ka sa pinakabagong mga tuntunin.",
		},
		{
			title: "6. Privacy Policy",
			content: "• Pagproseso ng Data: Ang lahat ng pack file na kino-convert ay pinoproseso nang lokal sa iyong browser at hindi kailanman ina-upload o kinokolekta ng mga server.\n• Mga External Library at Font: Kapag ginamit ang Audio Re-encode beta, kumukuha ito ng SHA-256-verified na FFmpeg libraries mula sa external CDNs (unpkg.com / cdn.jsdelivr.net), at gumagamit ng Google Fonts para sa display. Walang pack data na ipinapadala sa kanila, ngunit ang karaniwang HTTP request metadata (tulad ng IP address) ay pinoproseso ng kanilang CDN.\n• Analytics: Gumagamit ang site ng cookie-less Umami para sa anonymous na istatistika at na-mask na buod ng teknikal na error (walang filename, path, URL, o personal na impormasyon).\n• Browser Storage (localStorage / sessionStorage): Ginagamit upang i-save ang wika, theme, UI state, beta settings, anonymous na bilang ng conversion (walang UUID), at pansamantalang log/cooldown para sa bug report (binubura sa pag-reset o pagsara ng tab).\n• Pag-uulat ng Bug: Kapag kusang-loob kang nagpadala ng bug report, ang iyong isinulat, opsyonal na email para sa tugon (sa Formspree lang at para lamang sa pagsagot), impormasyon ng browser/OS, at piniling filename/log ay ipinapadala sa Formspree (formspree.io) o pampublikong GitHub Issues (github.com). Ang mismong pack file ay hindi kailanman ina-upload.",
		},
	],
	backToHome: "Bumalik sa Home",
	viewSourceCode: "Tingnan ang Source Code sa GitHub",
	openSourceText: "Ang serbisyong ito ay open source.",
	betaFeatures: "Mga Beta Feature",
	betaActiveCount: "{count} aktibo",
	enableGuiConversion: "Conversion ng GUI",
	enableAudioReencode: 'I-re-encode ang Audio (FFmpeg, ~10MB)',
	enablePbrConversion: 'PBR / Shader Map Conversion (RTX ⇄ LabPBR)',
	enableModelConversion: '3D Custom Model Conversion (Geo ⇄ JSON/CEM)',
	betaWarningAudioReencode: 'Magda-download ng ~10MB na FFmpeg library sa unang paggamit at ire-re-encode ang .wav/.mp3 o non-44.1kHz/non-Vorbis .ogg habang pinapanatili ang mono/stereo channels (nagpapataas ng oras ng conversion at CPU load).',
	betaWarningGuiConversion: 'Dinamikong pinuputol ang icons.png at widgets.png, na maaaring magpataas ng paggamit ng memory sa mga HD pack. Dahil sa pagkakaiba ng istraktura sa pagitan ng Java at Bedrock UI, maaaring hindi perpektong mag-align ang ilang screen.',
	betaWarningPbrConversion: 'Kino-convert ang Bedrock RTX/Deferred PBR maps (_mer/_normal) at Java LabPBR shader maps (_s/_n). Maaaring magpatagal sa pagproseso at nangangailangan ng shader mod (Iris/OptiFine) sa Java.',
	betaWarningModelConversion: 'Eksperimental na kino-convert ang mga 3D model at entity geometry (.geo.json ⇄ .json / OptiFine CEM .jem). Maaaring hindi perpektong mag-align ang ilang kumplikadong modelo.',
};

export default tl;
