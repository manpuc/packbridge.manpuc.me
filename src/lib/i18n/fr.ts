import type { Translation } from "./types";

const fr: Translation = {
	title: "Convertisseur de packs de ressources et packs de textures Minecraft | PackBridge",
	heading: "PackBridge",
	description: "Convertissez vos packs de ressources et packs de textures Minecraft entre les versions Java et Bedrock. Tout se passe dans votre navigateur ; vos fichiers ne sont jamais envoyés sur un serveur.",
	metaDescription: "Outil en ligne gratuit pour convertir les packs de ressources et packs de textures Minecraft entre Java Edition et Bedrock Edition. Traitez vos fichiers localement dans votre navigateur.",
	h1Title: "Convertisseur de packs de ressources et de textures Minecraft",

	// SEO Content
	introTitle: "Qu'est-ce que PackBridge ?",
	introDescription: "PackBridge est un outil puissant conçu pour convertir les packs de ressources et packs de textures Minecraft entre différentes éditions (Java ⇄ Bedrock). Nous automatisons le processus complexe de remappage des actifs pour que vous puissiez profiter de vos textures préférées sur n'importe quel appareil.",
	introFeaturesTitle: "Caractéristiques principales",
	introFeature1: "Traitement local : Vos fichiers ne quittent jamais votre ordinateur. La conversion se fait entièrement dans votre navigateur.",
	introFeature2: "Bidirectionnel : Convertissez facilement vos packs de ressources et de textures entre les éditions Java et Bedrock.",
	introFeature3: "Rapide et léger : Optimisé pour la vitesse, vous permettant de convertir des packs volumineux en quelques secondes.",
	introFeature4: "Conversion de version : Prend en charge la mise à jour des anciennes versions vers les nouvelles versions au sein de la même édition. Idéal pour le portage de packs.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",
	directionVersionUpdate: "Changer de version",
	sourceEdition: "Édition source",
	targetEdition: "Édition cible",
	editionJava: "Java Edition",
	editionBedrock: "Bedrock Edition",

	dropzoneTitle: "Déposez votre pack ici ou cliquez pour parcourir",
	dropzoneTitleMobile: "Touchez pour sélectionner un pack",
	dropzoneSubtitle: "Prend en charge les fichiers .zip ou .mcpack",
	dropzoneProcessing: "Traitement en cours...",
	sourceVersion: "Version source",
	targetVersion: "Version cible",
	autoDetected: "Détecté automatiquement",
	uploadToAutoDetect: "Téléchargez un fichier pour autodétection",

	btnConvert: "Démarrer la conversion",
	btnDownload: "Télécharger le pack converti",
	inAppBrowserNotice: "L'enregistrement peut échouer ici.",
	inAppBrowserAction: "Ouvrez dans Safari ou Chrome",
	inAppBrowserOpenExternal: "Ouvrir dans le navigateur externe",
	btnReset: "Convertir un autre fichier",

	reportTitle: "Rapport de conversion",
	statusConverted: "Converti",
	statusSkipped: "Ignoré",
	statusError: "Erreur",

	summaryTitle: "Conversion terminée !",
	countTotal: "Total des fichiers",
	countConverted: "Réussis",
	countSkipped: "Ignorés",
	countErrors: "Erreurs",

	btnExportTxt: "Exporter en TXT",

	unsupportedTitle: "Fichiers non pris en charge / ignorés",
	unsupportedReason: "Raison",

	errorNoFile: "Veuillez sélectionner un fichier.",
	errorInvalidFile: "Format de fichier non valide. Veuillez sélectionner un fichier .zip ou .mcpack.",
	errorConversion: "Une erreur s'est produite lors de la conversion.",
	errorZeroConverted: "Aucun fichier convertible trouvé. Veuillez vous assurer qu'il s'agit d'une archive de pack de ressources Minecraft valide.",
	warnPossibleBedrock: "Le fichier sélectionné (.mcpack) est peut-être déjà un pack Bedrock. Pour une conversion depuis Java, sélectionnez un fichier .zip de la version Java.",
	warnPossibleJava: "Le fichier sélectionné est peut-être déjà un pack Java. Pour une conversion depuis Bedrock, assurez-vous de sélectionner un fichier .mcpack ou .zip de la version Bedrock.",
	warnNotMinecraftPack: "Ce fichier ne semble pas être un pack de ressources Minecraft (aucun pack.mcmeta, manifest.json ou dossier de textures trouvé).",

	footer: "PackBridge | Convertisseur de packs de ressources et de textures Minecraft",
	terms: "Conditions d'utilisation",
	keywords: "Minecraft, Pack de ressources, Pack de textures, Texture, Convertisseur, Java vers Bedrock, Bedrock vers Java, PackBridge, Portrage",
	disclaimerPerfect: "*Note : La conversion parfaite de tous les fichiers n'est pas garantie. Des ajustements manuels peuvent être nécessaires après conversion.",
	error404Title: "Page non trouvée",
	error404Description: "Désolé, la page que vous recherchez n'existe pas ou a été déplacée.",

	// Terms of Use
	termsLastUpdated: "1 novembre 2026",
	termsSections: [
		{
			title: "1. Utilisation du service",
			content: "Ce service est un outil de conversion de packs de ressources et de packs de textures Minecraft entre les éditions Java et Bedrock. Tout le traitement s'effectue localement dans le navigateur ; aucun fichier n'est envoyé à des serveurs externes.",
		},
		{
			title: "2. Clause de non-responsabilité",
			content: "L'utilisation de ce service et de son code source se fait à vos propres risques. La conversion parfaite n'est pas garantie. Le développeur ne saurait être tenu responsable des dommages ou problèmes découlant de l'utilisation de ce service.",
		},
		{
			title: "3. Droit d'auteur et licence",
			content: "Le droit d'auteur du code source et de la conception appartient à manpuc. L'utilisation est autorisée avec une attribution appropriée (https://www.manpuc.me). La redistribution de clones sans modifications significatives est interdite.",
		},
		{
			title: "4. Actions interdites",
			content: "Toute action interférant avec le fonctionnement du site ou enfreignant la loi est interdite.",
		},
		{
			title: "5. Modifications des conditions",
			content: "Ces conditions peuvent être modifiées à tout moment à la discrétion du développeur sans préavis. En continuant à utiliser le service, vous êtes réputé avoir accepté les dernières conditions.",
		},
		{
			title: "6. Politique de confidentialité",
			content: "• Traitement des données : Toutes les données sont traitées localement dans le navigateur. Le contenu n'est jamais envoyé ni collecté par des serveurs.\n• Analyse : Ce site utilise Umami pour comprendre les modèles d'utilisation. Les données collectées sont statistiques et anonymes.\n• Stockage local : Nous utilisons le localStorage du navigateur pour enregistrer vos préférences de langue et de thème.",
		},
	],
	backToHome: "Retour à l'accueil",
	viewSourceCode: "Voir le code source sur GitHub",
	openSourceText: "Ce service est open source.",
	betaFeatures: "Fonctionnalités bêta",
	betaGroupUiTextures: "Interface et textures",
	betaGroupAudioLang: "Audio et localisation",
	enableGuiConversion: "Conversion de l'interface GUI",
	enableModernGuiSprites: "Sprites GUI séparés (1.20.2+)",
	enableTgaConversion: "Convertir les textures TGA en PNG",
	enableAnimationConversion: "Conversion des animations",
	enableLanguageConversion: 'Conversion des langues et traductions',
	enableSoundConversion: 'Conversion des sons',
	enableAudioReencode: 'Ré-encoder les fichiers audio (FFmpeg, ~20 Mo)',
	enablePbrConversion: 'Conversion PBR / Shaders (RTX ⇄ LabPBR)',
	enableModelConversion: 'Conversion de modèles 3D (Geo ⇄ JSON/CEM)',
	betaCalloutActive: 'Actif',
	betaCalloutPreview: 'Impact potentiel',
	betaWarningAudioReencode: 'Télécharge ~20 Mo de bibliothèques FFmpeg lors de la première utilisation et augmente considérablement le temps de conversion et la charge CPU.',
	betaWarningModernGuiSprites: 'Découpe et recompose dynamiquement les sprites GUI ; peut augmenter l\'utilisation de la mémoire sur les packs HD et causer des décalages d\'affichage.',
	betaWarningGuiConversion: 'En raison des différences structurelles entre Java et Bedrock, certains inventaires ou conteneurs peuvent ne pas s\'aligner parfaitement.',
	betaWarningTgaConversion: 'Décode et convertit toutes les images TGA en PNG, ce qui peut rallonger le temps de traitement pour les packs contenant beaucoup de fichiers TGA.',
	betaWarningPbrConversion: 'Convertit les textures PBR Bedrock (_mer/_normal) et LabPBR Java (_s/_n). Allonge le temps de traitement et nécessite un mod de shaders (Iris/OptiFine) sur Java.',
	betaWarningModelConversion: 'Convertit expérimentalement les modèles 3D et la géométrie d\'entités (.geo.json ⇄ .json / OptiFine CEM .jem). Certaines structures complexes peuvent présenter des décalages.',
};

export default fr;
