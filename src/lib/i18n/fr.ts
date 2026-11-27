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
	statusWarning: "Avertissement",
	reportSearchPlaceholder: "Filtrer par nom de fichier ou raison...",
	reportFilterAll: "Tous",
	reportNoMatches: "Aucun fichier correspondant trouvé",
	reportPrev: "Précédent",
	reportNext: "Suivant",

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
	errorFileExpired: "La référence du fichier a expiré. Veuillez sélectionner à nouveau le fichier.",
	errorZeroConverted: "Aucun fichier convertible trouvé. Veuillez vous assurer qu'il s'agit d'une archive de pack de ressources Minecraft valide.",
	warnPossibleBedrock: "Le fichier sélectionné (.mcpack) est peut-être déjà un pack Bedrock. Pour une conversion depuis Java, sélectionnez un fichier .zip de la version Java.",
	warnPossibleJava: "Le fichier sélectionné est peut-être déjà un pack Java. Pour une conversion depuis Bedrock, assurez-vous de sélectionner un fichier .mcpack ou .zip de la version Bedrock.",
	warnNotMinecraftPack: "Ce fichier ne semble pas être un pack de ressources Minecraft (aucun pack.mcmeta, manifest.json ou dossier de textures trouvé).",
	noticeAutoSwitchedToBedrockToJava: "Pack Bedrock détecté — direction basculée automatiquement vers Bedrock → Java.",
	noticeAutoSwitchedToJavaToBedrock: "Pack Java détecté — direction basculée automatiquement vers Java → Bedrock.",

	footer: "PackBridge | Convertisseur de packs de ressources et de textures Minecraft",
	terms: "Conditions d'utilisation",
	disclaimerPerfect: "*Note : La conversion parfaite de tous les fichiers n'est pas garantie. Des ajustements manuels peuvent être nécessaires après conversion.",
	error404Title: "Page non trouvée",
	error404Description: "Désolé, la page que vous recherchez n'existe pas ou a été déplacée.",

	// Terms of Use
	termsLastUpdatedLabel: "Dernière mise à jour",
	termsLastUpdated: "27 novembre 2026",
	termsSections: [
		{
			title: "1. Utilisation du service",
			content: "Ce service permet de convertir des packs de ressources et de textures Minecraft entre les éditions Java et Bedrock, de migrer les versions au sein d'une même édition et d'utiliser des fonctionnalités bêta expérimentales (conversion GUI, ré-encodage audio FFmpeg, textures PBR/shaders et modèles 3D personnalisés). Tout le traitement s'effectue localement dans votre navigateur ; aucun pack n'est envoyé sur un serveur externe. Les métadonnées converties (manifest.json, pack.mcmeta, .jem) incluent une mention de crédit PackBridge.",
		},
		{
			title: "2. Clause de non-responsabilité et droits des tiers",
			content: "L'utilisation de ce service et de son code source se fait à vos propres risques. La conversion parfaite de tous les fichiers (y compris les fonctionnalités bêta) n'est pas garantie et des anomalies peuvent survenir. Le développeur ne saurait être tenu responsable des dommages ou pertes liés à l'utilisation du service.\nLors de la conversion, de l'utilisation ou de la redistribution de packs créés par des tiers, il vous appartient de vérifier et de respecter la licence et les conditions de l'auteur original.\nCECI N'EST PAS UN PRODUIT OFFICIEL MINECRAFT. NON APPROUVÉ PAR OU ASSOCIÉ À MOJANG OU MICROSOFT (NOT AN OFFICIAL MINECRAFT PRODUCT).",
		},
		{
			title: "3. Droit d'auteur et licence",
			content: "Le droit d'auteur du code source et de la conception appartient à manpuc. L'utilisation est autorisée avec une attribution appropriée (https://www.manpuc.me). La redistribution de clones sans modifications significatives est interdite.",
		},
		{
			title: "4. Actions interdites",
			content: "Toute surcharge excessive du réseau, entrave au fonctionnement du site, atteinte aux droits de propriété intellectuelle de tiers ou infraction à la loi est interdite.",
		},
		{
			title: "5. Modifications des conditions",
			content: "Ces conditions peuvent être modifiées à tout moment à la discrétion du développeur sans préavis. En continuant à utiliser le service, vous êtes réputé avoir accepté les dernières conditions.",
		},
		{
			title: "6. Politique de confidentialité",
			content: "• Traitement des données : Tous les packs convertis sont traités localement dans votre navigateur. Leur contenu n'est jamais envoyé ni collecté par des serveurs.\n• Bibliothèques externes et polices : L'activation de la bêta de ré-encodage audio télécharge les bibliothèques FFmpeg vérifiées par SHA-256 depuis des CDN externes (unpkg.com / cdn.jsdelivr.net), et le site charge des polices via Google Fonts. Vos fichiers de pack ne sont jamais transmis à ces fournisseurs, bien que les métadonnées HTTP standard (telles que l'adresse IP) soient traitées par leurs CDN.\n• Analyse : Ce site utilise Umami (sans cookies) pour recueillir des statistiques anonymes ainsi que des résumés d'erreurs techniques anonymisés (noms de fichiers, chemins, URL et données personnelles masqués).\n• Stockage du navigateur (localStorage / sessionStorage) : Utilisé pour enregistrer la langue, le thème, l'état de l'interface, les préférences bêta, un compteur local anonyme de conversions (sans UUID) à des fins statistiques, et les journaux temporaires pour le signalement de bugs (effacés lors de la réinitialisation ou à la fermeture de l'onglet).\n• Signalement de bugs : Uniquement lorsque vous soumettez volontairement un rapport de bug, vos saisies, votre e-mail de réponse facultatif (envoi direct Formspree uniquement, utilisé exclusivement pour vous répondre), les informations navigateur/OS et les journaux que vous choisissez de joindre sont transmis à Formspree (formspree.io) ou à GitHub Issues public (github.com). L'archive du pack elle-même n'est jamais envoyée.",
		},
	],
	backToHome: "Retour à l'accueil",
	viewSourceCode: "Voir le code source sur GitHub",
	openSourceText: "Ce service est open source.",
	betaFeatures: "Fonctionnalités bêta",
	betaActiveCount: "{count} actif(s)",
	enableGuiConversion: "Conversion de l'interface GUI",
	enableAudioReencode: 'Ré-encoder les fichiers audio (FFmpeg, ~10 Mo)',
	enablePbrConversion: 'Conversion PBR / Shaders (RTX ⇄ LabPBR)',
	enableModelConversion: 'Conversion de modèles 3D (Geo ⇄ JSON/CEM)',
	betaWarningAudioReencode: 'Télécharge ~10 Mo de bibliothèques FFmpeg lors de la première utilisation et ré-encode les fichiers .wav/.mp3 ou .ogg non 44,1 kHz/non Vorbis tout en préservant les canaux mono/stéréo (augmente le temps de conversion et la charge CPU).',
	betaWarningGuiConversion: 'Découpe dynamiquement icons.png et widgets.png, ce qui peut augmenter l\'utilisation de la mémoire sur les packs HD. En raison des différences structurelles entre Java et Bedrock, certains inventaires ou conteneurs peuvent ne pas s\'aligner parfaitement.',
	betaWarningPbrConversion: 'Convertit les textures PBR Bedrock (_mer/_normal) et LabPBR Java (_s/_n). Allonge le temps de traitement et nécessite un mod de shaders (Iris/OptiFine) sur Java.',
	betaWarningModelConversion: 'Convertit expérimentalement les modèles 3D et la géométrie d\'entités (.geo.json ⇄ .json / OptiFine CEM .jem). Certaines structures complexes peuvent présenter des décalages.',
};

export default fr;
