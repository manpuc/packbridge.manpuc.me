import type { Translation } from "./types";

const en: Translation = {
	title: "PackBridge - Minecraft Resource Pack Converter",
	heading: "PackBridge",
	description: "Convert Minecraft resource packs between Java Edition and Bedrock Edition. Everything happens in your browser; your files are never uploaded to a server.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",

	dropzoneTitle: "Drop your pack here or click to browse",
	dropzoneSubtitle: "Supports .zip or .mcpack files",
	dropzoneProcessing: "Processing...",
	targetVersion: "Target Version",

	btnConvert: "Start Conversion",
	btnDownload: "Download Converted Pack",
	btnReset: "Convert another file",

	reportTitle: "Conversion Report",
	statusConverted: "Converted",
	statusSkipped: "Skipped",
	statusError: "Error",

	summaryTitle: "Summary",
	countTotal: "Total Files",
	countConverted: "Converted",
	countSkipped: "Skipped",
	countErrors: "Errors",

	unsupportedTitle: "Unsupported / Skipped Files",
	unsupportedReason: "Reason",

	errorNoFile: "Please select a file.",
	errorInvalidFile: "Invalid file format. Please select a .zip or .mcpack file.",
	errorConversion: "An error occurred during conversion.",
	warnPossibleBedrock: "The selected file (.mcpack) may already be a Bedrock Edition resource pack. When converting from Java, you usually select a Java Edition .zip file.",
	warnPossibleJava: "The selected file may already be a Java Edition resource pack. When converting from Bedrock, please ensure you select a Bedrock Edition .mcpack or .zip file.",

	footer: "PackBridge | Minecraft Resource Pack Converter",
	terms: "Terms of Service",
	keywords: "Minecraft, Resource Pack, Texture Pack, Converter, Java to Bedrock, Bedrock to Java, PackBridge, Porting, Assets",
	disclaimerPerfect: "*Note: Perfect conversion of all files is not guaranteed. Manual adjustments may be required after conversion.",
	error404Title: "Page Not Found",
	error404Description: "We're sorry, the page you're looking for doesn't exist or has been moved.",

	// Terms of Use
	termsLastUpdated: "April 22, 2024",
	termsSections: [
		{
			title: "1. Service Usage",
			content: "This service is a tool for converting Minecraft resource packs between Java and Bedrock editions. All processing occurs locally within the browser; no files are sent to external servers.",
		},
		{
			title: "2. Disclaimer (Self-Responsibility)",
			content: "Use of this service and its source code is strictly at your own risk. Perfect conversion of all files is not guaranteed, and issues may occur in the converted data. The developer shall not be held liable for any damages, data loss, or issues arising from the use of this service or derived code.",
		},
		{
			title: "3. Copyright and License",
			content: "Copyright for this service's source code and design belongs to manpuc. Use of the code is permitted provided that clear attribution to manpuc (https://www.manpuc.me) is included. Complete replication or minimal-modification clones for redistribution are strictly prohibited.",
		},
		{
			title: "4. Prohibited Actions",
			content: "Excessive load on the network, interference with site operation, and illegal or immoral activities are prohibited.",
		},
		{
			title: "5. Changes to Terms",
			content: "These terms may be changed at any time at the developer's discretion without prior notice. By continuing to use the service, you are deemed to have agreed to the latest terms.",
		},
		{
			title: "6. Privacy Policy",
			content: "• Data Processing: All data converted via this service is processed locally within the user's browser. Content is never sent to or collected by servers.\n• Analytics: This site uses Cloudflare Web Analytics to understand usage patterns. This collects statistical data and does not identify individual users.\n• Local Storage: We use browser localStorage to save your language and theme (dark mode) preferences.",
		},
	],
	backToHome: "Back to Home",
	viewSourceCode: "View Source Code on GitHub",
	openSourceText: "This service is open source.",
};

export default en;
