export interface TermItem {
	title: string;
	content: string;
}

export interface Translation {
	title: string;
	heading: string;
	description: string;
	metaDescription: string;
	h1Title: string;

	// SEO Content
	introTitle: string;
	introDescription: string;
	introFeaturesTitle: string;
	introFeature1: string;
	introFeature2: string;
	introFeature3: string;
	introFeature4: string;

	directionJavaToBedrock: string;
	directionBedrockToJava: string;
	directionVersionUpdate: string;
	sourceEdition: string;
	targetEdition: string;
	editionJava: string;
	editionBedrock: string;

	dropzoneTitle: string;
	dropzoneTitleMobile: string;
	dropzoneSubtitle: string;
	dropzoneProcessing: string;
	dropzonePrivacyBadge?: string;
	sourceVersion: string;
	targetVersion: string;
	autoDetected: string;
	uploadToAutoDetect: string;

	btnConvert: string;
	btnDownload: string;
	inAppBrowserNotice: string;
	inAppBrowserAction: string;
	inAppBrowserOpenExternal: string;
	btnReset: string;

	reportTitle: string;
	statusConverted: string;
	statusSkipped: string;
	statusError: string;

	summaryTitle: string;
	countTotal: string;
	countConverted: string;
	countSkipped: string;
	countErrors: string;

	btnExportTxt: string;

	unsupportedTitle: string;
	unsupportedReason: string;

	errorNoFile: string;
	errorInvalidFile: string;
	errorConversion: string;
	errorZeroConverted: string;
	warnPossibleBedrock: string;
	warnPossibleJava: string;
	warnNotMinecraftPack: string;

	footer: string;
	terms: string;
	keywords: string;
	disclaimerPerfect: string;

	error404Title: string;
	error404Description: string;

	// Terms of Use specific
	termsLastUpdated: string;
	termsSections: TermItem[];
	backToHome: string;
	viewSourceCode: string;
	openSourceText: string;

	// Beta Features
	betaFeatures: string;
	betaGroupUiTextures?: string;
	betaGroupAudioLang?: string;
	enableGuiConversion: string;
	enableModernGuiSprites?: string;
	enableTgaConversion?: string;
	enableAnimationConversion: string;
	enableLanguageConversion: string;
	enableSoundConversion: string;
	enableAudioReencode?: string;
	enablePbrConversion?: string;
	enableModelConversion?: string;
	betaCalloutActive?: string;
	betaCalloutPreview?: string;
	betaWarningAudioReencode?: string;
	betaWarningModernGuiSprites?: string;
	betaWarningGuiConversion?: string;
	betaWarningTgaConversion?: string;
	betaWarningPbrConversion?: string;
	betaWarningModelConversion?: string;
}
