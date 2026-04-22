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

	directionJavaToBedrock: string;
	directionBedrockToJava: string;

	dropzoneTitle: string;
	dropzoneSubtitle: string;
	dropzoneProcessing: string;
	targetVersion: string;

	btnConvert: string;
	btnDownload: string;
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

	unsupportedTitle: string;
	unsupportedReason: string;

	errorNoFile: string;
	errorInvalidFile: string;
	errorConversion: string;
	warnPossibleBedrock: string;
	warnPossibleJava: string;

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
}
