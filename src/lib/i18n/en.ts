import type { Translation } from "./types";

const en: Translation = {
	title: "Minecraft Resource Pack & Texture Pack Converter | PackBridge",
	heading: "PackBridge",
	description: "Convert Minecraft resource packs and texture packs between Java Edition and Bedrock Edition. Everything happens in your browser; your files are never uploaded to a server.",
	metaDescription: "Free online tool to convert Minecraft resource packs and texture packs between Java Edition and Bedrock Edition. Process files locally in your browser for maximum speed and privacy.",
	h1Title: "Minecraft Resource Pack & Texture Pack Converter",

	// SEO Content
	introTitle: "What is PackBridge?",
	introDescription: "PackBridge is a powerful tool designed to convert Minecraft resource packs and texture packs between different editions (Java ⇄ Bedrock). We automate the complex process of remapping assets so you can enjoy your favorite textures on any device.",
	introFeaturesTitle: "Key Features",
	introFeature1: "Local Processing: Your files never leave your computer. Conversion happens entirely within your web browser.",
	introFeature2: "Bidirectional: Seamlessly convert resource packs and texture packs between Java and Bedrock editions.",
	introFeature3: "Fast & Lightweight: Optimized for speed, allowing you to convert large resource packs in seconds.",
	introFeature4: "Version Conversion: Supports updating from older versions to newer versions within the same edition. Perfect for pack porting.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",
	directionVersionUpdate: "Change Version",
	sourceEdition: "Source Edition",
	targetEdition: "Target Edition",
	editionJava: "Java Edition",
	editionBedrock: "Bedrock Edition",

	dropzoneTitle: "Drop your pack here or click to browse",
	dropzoneTitleMobile: "Tap to select your pack",
	dropzoneSubtitle: "Supports .zip or .mcpack files",
	dropzoneProcessing: "Processing...",
	dropzonePrivacyBadge: "100% Client-Side • Files never leave your browser",
	sourceVersion: "Source Version",
	targetVersion: "Target Version",
	autoDetected: "Auto-detected",
	uploadToAutoDetect: "Upload a file to auto-detect",

	btnConvert: "Start Conversion",
	btnDownload: "Download Converted Pack",
	inAppBrowserNotice: "Saving may fail in in-app browsers.",
	inAppBrowserAction: "Open in Safari or Chrome",
	inAppBrowserOpenExternal: "Open in external browser",
	btnReset: "Convert another file",

	reportTitle: "Conversion Report",
	statusConverted: "Converted",
	statusSkipped: "Skipped",
	statusError: "Error",

	summaryTitle: "Conversion Complete!",
	countTotal: "Total Files",
	countConverted: "Converted",
	countSkipped: "Skipped",
	countErrors: "Errors",

	btnExportTxt: "Export TXT",

	unsupportedTitle: "Unsupported / Skipped Files",
	unsupportedReason: "Reason",

	errorNoFile: "Please select a file.",
	errorInvalidFile: "Invalid file format. Please select a .zip or .mcpack file.",
	errorConversion: "An error occurred during conversion.",
	errorZeroConverted: "No convertible files found. Please ensure this is a valid Minecraft resource pack archive.",
	warnPossibleBedrock: "The selected file (.mcpack) may already be a Bedrock Edition resource pack. When converting from Java, you usually select a Java Edition .zip file.",
	warnPossibleJava: "The selected file may already be a Java Edition resource pack. When converting from Bedrock, please ensure you select a Bedrock Edition .mcpack or .zip file.",
	warnNotMinecraftPack: "This archive might not be a Minecraft resource pack (no pack.mcmeta, manifest.json, or texture folders found).",

	footer: "PackBridge | Minecraft Resource Pack & Texture Pack Converter",
	terms: "Terms of Service",
	keywords: "Minecraft, Resource Pack, Texture Pack, Texture, Converter, Texture Pack Converter, Java to Bedrock, Bedrock to Java, PackBridge, Porting, Assets",
	disclaimerPerfect: "*Note: Perfect conversion of all files is not guaranteed. Manual adjustments may be required after conversion.",
	error404Title: "Page Not Found",
	error404Description: "We're sorry, the page you're looking for doesn't exist or has been moved.",

	// Terms of Use
	termsLastUpdated: "November 1, 2026",
	termsSections: [
		{
			title: "1. Service Usage",
			content: "This service is a tool for converting Minecraft resource packs and texture packs between Java and Bedrock editions. All processing occurs locally within the browser; no files are sent to external servers.",
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
			content: "• Data Processing: All data converted via this service is processed locally within the user's browser. Content is never sent to or collected by servers.\n• Analytics: This site uses Umami to understand usage patterns. It collects statistical data and does not identify individual users.\n• Local Storage: We use browser localStorage to save your language and theme (dark mode) preferences.",
		},
	],
	backToHome: "Back to Home",
	viewSourceCode: "View Source Code on GitHub",
	openSourceText: "This service is open source.",
	betaFeatures: "Beta Features",
	betaGroupUiTextures: "UI & Textures",
	betaGroupAudioLang: "Audio & Localization",
	enableGuiConversion: "GUI Conversion",
	enableModernGuiSprites: "1.20.2+ Split GUI Sprites",
	enableTgaConversion: "Convert TGA to PNG",
	enableAnimationConversion: "Animation Conversion",
	enableLanguageConversion: 'Language & Translation',
	enableSoundConversion: 'Sound Definitions',
	enableAudioReencode: 'Re-encode Audio (FFmpeg, ~20MB)',
	enablePbrConversion: 'PBR / Shader Map Conversion (RTX ⇄ LabPBR)',
	enableModelConversion: '3D Custom Model Conversion (Geo ⇄ JSON/CEM)',
	betaCalloutActive: 'Active',
	betaCalloutPreview: 'Potential Impact',
	betaWarningAudioReencode: 'Downloads ~20MB of FFmpeg libraries on first use and significantly increases conversion time and CPU load.',
	betaWarningModernGuiSprites: 'Dynamically crops and reassembles GUI sprites; may increase memory usage on HD packs and cause minor layout issues in custom GUIs.',
	betaWarningGuiConversion: 'Due to structural differences between Java and Bedrock UI, some inventory or container screens may not align perfectly.',
	betaWarningTgaConversion: 'Decodes and converts all TGA images to PNG, which may extend processing time for packs with many TGA files.',
	betaWarningPbrConversion: 'Converts between Bedrock RTX/Deferred PBR maps (_mer/_normal) and Java LabPBR shader maps (_s/_n). Increases processing time due to per-pixel channel remapping and requires a shader mod (Iris/OptiFine) on Java.',
	betaWarningModelConversion: 'Experimentally converts 3D block/item models and entity geometry (.geo.json ⇄ .json / OptiFine CEM .jem). Complex bone hierarchies or animations may not align perfectly.',
};

export default en;
