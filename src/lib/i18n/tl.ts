import type { Translation } from "./types";

const tl: Translation = {
	title: "PackBridge - Minecraft Resource Pack Converter",
	heading: "PackBridge",
	description: "I-convert ang mga Minecraft resource pack sa pagitan ng Java Edition at Bedrock Edition. Ang lahat ay nangyayari sa iyong browser; ang iyong mga file ay hindi kailanman ina-upload sa isang server.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",

	dropzoneTitle: "I-drop ang iyong pack dito o i-click para mag-browse",
	dropzoneSubtitle: "Sinusuportahan ang mga .zip o .mcpack na file",
	dropzoneProcessing: "Pinoproseso...",
	targetVersion: "Target na Bersyon",

	btnConvert: "Simulan ang Pag-convert",
	btnDownload: "I-download ang Na-convert na Pack",
	btnReset: "Mag-convert ng ibang file",

	reportTitle: "Ulat ng Pag-convert",
	statusConverted: "Na-convert",
	statusSkipped: "Nilaktawan",
	statusError: "Error",

	summaryTitle: "Buod",
	countTotal: "Kabuuang mga File",
	countConverted: "Na-convert",
	countSkipped: "Nilaktawan",
	countErrors: "Mga Error",

	unsupportedTitle: "Hindi Suportado / Nilaktawan na mga File",
	unsupportedReason: "Dahilan",

	errorNoFile: "Mangyaring pumili ng file.",
	errorInvalidFile: "Maling format ng file. Pumili ng .zip o .mcpack na file.",
	errorConversion: "Nagkaroon ng error habang nagko-convert.",
	warnPossibleBedrock: "Maaaring ang napiling file (.mcpack) ay isa nang Bedrock Edition resource pack. Kapag nag-convert mula sa Java, karaniwan kang pumipili ng Java Edition .zip file.",
	warnPossibleJava: "Maaaring ang napiling file ay isa nang Java Edition resource pack. Kapag nag-convert mula sa Bedrock, siguraduhing pumili ng Bedrock Edition na .mcpack o .zip file.",

	footer: "PackBridge | Minecraft Resource Pack Converter",
	terms: "Kasunduan sa Serbisyo",
	keywords: "Minecraft, Resource Pack, Texture Pack, Converter, Java to Bedrock, Bedrock to Java, PackBridge",
	disclaimerPerfect: "*Tandaan: Hindi garantisado ang perpektong conversion ng lahat ng file. Maaaring kailanganin ang manual na pagsasaayos pagkatapos ng conversion.",
	error404Title: "Hindi Nahanap ang Pahina",
	error404Description: "Paumanhin, ang pahinang hinahanap mo ay hindi umiiral o nailipat na.",

	// Terms of Use
	termsLastUpdated: "Abril 22, 2024",
	termsSections: [
		{
			title: "1. Paggamit ng Serbisyo",
			content: "Ang serbisyong ito ay isang tool para sa conversion ng Minecraft resource packs sa pagitan ng Java at Bedrock. Ang lahat ng processing ay ginagawa sa browser; walang files na ina-upload.",
		},
		{
			title: "2. Disclaimer (Sariling Pananagutan)",
			content: "Ang paggamit ng serbisyong ito ay nasa sarili ninyong panganib. Ang developer (manpuc) ay hindi mananagot sa anumang pinsala o problema.",
		},
		{
			title: "3. Copyright at Lisensya",
			content: "Ang copyright sa source code at disenyo ay pag-aari ni manpuc. Malaya itong gamitin basta may tamang attribution (https://www.manpuc.me). Bawal ang pag-clone o pagkopya ng buo nang walang malaking pagbabago.",
		},
		{
			title: "4. Mga Pinagbabawal",
			content: "Ipinagbabawal ang anumang gawain na makakasira sa operasyon ng site o labag sa batas.",
		},
		{
			title: "5. Mga Pagbabago sa Kasunduan",
			content: "Ang mga tuntuning ito ay maaaring mabago sa anumang oras sa discretion ng developer nang walang paunang abiso. Sa pagpapatuloy ng paggamit ng serbisyo, ituturing na sumasang-ayon ka sa pinakabagong mga tuntunin.",
		},
		{
			title: "6. Privacy Policy",
			content: "• Pagproseso ng Data: Ang lahat ng data na kino-convert gamit ang serbisyong ito ay pinoproseso nang lokal sa browser ng user. Ang mga content ay hindi kailanman ipinapadala o kinokolekta ng mga server.\n• Analytics: Ang site na ito ay gumagamit ng Cloudflare Web Analytics upang maunawaan ang paggamit ng site. Ito ay nangongolekta ng statistical data at hindi tumutukoy sa mga indibidwal na user.\n• Local Storage: Ginagamit namin ang browser localStorage upang i-save ang iyong mga kagustuhan sa wika at theme (dark mode).",
		},
	],
	backToHome: "Bumalik sa Home",
	viewSourceCode: "Tingnan ang Source Code sa GitHub",
	openSourceText: "Ang serbisyong ito ay open source.",
};

export default tl;
