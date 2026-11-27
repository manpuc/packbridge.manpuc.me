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
	statusWarning: "Warning",
	reportSearchPlaceholder: "Filter by filename or reason...",
	reportFilterAll: "All",
	reportNoMatches: "No matching files found",
	reportPrev: "Prev",
	reportNext: "Next",

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
	errorFileExpired: "The file reference expired. Please select the file again.",
	errorZeroConverted: "No convertible files found. Please ensure this is a valid Minecraft resource pack archive.",
	warnPossibleBedrock: "The selected file (.mcpack) may already be a Bedrock Edition resource pack. When converting from Java, you usually select a Java Edition .zip file.",
	warnPossibleJava: "The selected file may already be a Java Edition resource pack. When converting from Bedrock, please ensure you select a Bedrock Edition .mcpack or .zip file.",
	warnNotMinecraftPack: "This archive might not be a Minecraft resource pack (no pack.mcmeta, manifest.json, or texture folders found).",
	noticeAutoSwitchedToBedrockToJava: "Bedrock pack detected — automatically switched direction to Bedrock → Java.",
	noticeAutoSwitchedToJavaToBedrock: "Java pack detected — automatically switched direction to Java → Bedrock.",

	footer: "PackBridge | Minecraft Resource Pack & Texture Pack Converter",
	terms: "Terms of Service",
	keywords: "Minecraft, Resource Pack, Texture Pack, Texture, Converter, Texture Pack Converter, Java to Bedrock, Bedrock to Java, PackBridge, Porting, Assets",
	disclaimerPerfect: "*Note: Perfect conversion of all files is not guaranteed. Manual adjustments may be required after conversion.",
	error404Title: "Page Not Found",
	error404Description: "We're sorry, the page you're looking for doesn't exist or has been moved.",

	// Terms of Use
	termsLastUpdatedLabel: "Last Updated",
	termsLastUpdated: "November 27, 2026",
	termsSections: [
		{
			title: "1. Service Usage",
			content: "This service converts Minecraft resource packs and texture packs between Java and Bedrock editions, updates pack versions within the same edition, and offers experimental beta features (GUI conversion, FFmpeg audio re-encoding, PBR shader maps, and 3D custom models). All conversion processing occurs locally within your browser; pack files are never uploaded to external servers. Converted pack metadata (manifest.json, pack.mcmeta, .jem) includes a PackBridge attribution credit.",
		},
		{
			title: "2. Disclaimer & Third-Party Rights",
			content: "Use of this service and its source code is strictly at your own risk. Perfect conversion of all files (including experimental beta features) is not guaranteed, and visual or functional issues may occur in converted data. The developer shall not be held liable for any damages, data loss, or issues arising from the use of this service or derived code.\nWhen converting, using, or redistributing third-party resource packs, you are solely responsible for verifying and complying with the original creator's license and terms.\nNOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.",
		},
		{
			title: "3. Copyright and License",
			content: "Copyright for this service's source code and design belongs to manpuc. Use of the code is permitted provided that clear attribution to manpuc (https://www.manpuc.me) is included. Complete replication or minimal-modification clones for redistribution are strictly prohibited.",
		},
		{
			title: "4. Prohibited Actions",
			content: "Excessive load on the network, interference with site operation, infringement of third-party intellectual property rights, and illegal or abusive activities are prohibited.",
		},
		{
			title: "5. Changes to Terms",
			content: "These terms may be changed at any time at the developer's discretion without prior notice. By continuing to use the service, you are deemed to have agreed to the latest terms.",
		},
		{
			title: "6. Privacy Policy",
			content: "• Data Processing: All pack files converted via this service are processed locally within your browser. Pack archives and internal assets are never uploaded to or collected by servers.\n• External Libraries & Fonts: Enabling the Audio Re-encode beta downloads SHA-256-verified FFmpeg libraries from external CDNs (unpkg.com / cdn.jsdelivr.net) when needed, and pages load web fonts from Google Fonts. Your pack files are never sent to these providers, though standard HTTP request metadata (such as IP address) is processed by their CDNs.\n• Analytics: This site uses cookie-less Umami to collect anonymous usage statistics and sanitized technical error summaries (with filenames, paths, URLs, and personal data masked). No personally identifiable information or pack content is collected.\n• Browser Storage (localStorage / sessionStorage): Used to save language, theme, UI state, and beta feature preferences, an anonymous local conversion count (without any UUID) for aggregate first-time/repeat statistics, and temporary conversion logs/cooldown timestamps for bug reporting (cleared on reset or when the tab closes).\n• Bug Reports: Only if you voluntarily submit a bug report, your form inputs, optional reply email (Formspree direct reports only, used solely to reply), browser/OS info, and any filename/error logs you choose to attach are sent to Formspree (formspree.io) or public GitHub Issues (github.com). Pack archive files themselves are never uploaded.",
		},
	],
	backToHome: "Back to Home",
	viewSourceCode: "View Source Code on GitHub",
	openSourceText: "This service is open source.",
	betaFeatures: "Beta Features",
	betaActiveCount: "{count} active",
	enableGuiConversion: "GUI Conversion",
	enableAudioReencode: 'Re-encode Audio (FFmpeg, ~10MB)',
	enablePbrConversion: 'PBR / Shader Map Conversion (RTX ⇄ LabPBR)',
	enableModelConversion: '3D Custom Model Conversion (Geo ⇄ JSON/CEM)',
	betaWarningAudioReencode: 'Downloads ~10MB of FFmpeg libraries on first use and re-encodes .wav/.mp3 or non-44.1kHz/non-Vorbis .ogg while preserving mono/stereo channels (increases conversion time and CPU load).',
	betaWarningGuiConversion: 'Dynamically crops icons.png and widgets.png, which may increase memory usage on HD packs. Due to structural differences between Java and Bedrock UI, some inventory or container screens may not align perfectly.',
	betaWarningPbrConversion: 'Converts between Bedrock RTX/Deferred PBR maps (_mer/_normal) and Java LabPBR shader maps (_s/_n). Increases processing time due to per-pixel channel remapping and requires a shader mod (Iris/OptiFine) on Java.',
	betaWarningModelConversion: 'Experimentally converts 3D block/item models and entity geometry (.geo.json ⇄ .json / OptiFine CEM .jem). Complex bone hierarchies or animations may not align perfectly.',
};

export default en;
