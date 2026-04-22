import type { Translation } from "./types";

const fr: Translation = {
	title: "PackBridge - Convertisseur de packs de ressources Minecraft",
	heading: "PackBridge",
	description: "Convertissez vos packs de ressources Minecraft entre les versions Java et Bedrock. Tout se passe dans votre navigateur ; vos fichiers ne sont jamais envoyés sur un serveur.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",

	dropzoneTitle: "Déposez votre pack ici ou cliquez pour parcourir",
	dropzoneSubtitle: "Prend en charge les fichiers .zip ou .mcpack",
	dropzoneProcessing: "Traitement en cours...",
	targetVersion: "Version cible",

	btnConvert: "Démarrer la conversion",
	btnDownload: "Télécharger le pack converti",
	btnReset: "Convertir un autre fichier",

	reportTitle: "Rapport de conversion",
	statusConverted: "Converti",
	statusSkipped: "Ignoré",
	statusError: "Erreur",

	summaryTitle: "Résumé",
	countTotal: "Total des fichiers",
	countConverted: "Réussis",
	countSkipped: "Ignorés",
	countErrors: "Erreurs",

	unsupportedTitle: "Fichiers non pris en charge / ignorés",
	unsupportedReason: "Raison",

	errorNoFile: "Veuillez sélectionner un fichier.",
	errorInvalidFile: "Format de fichier non valide. Veuillez sélectionner un fichier .zip ou .mcpack.",
	errorConversion: "Une erreur s'est produite lors de la conversion.",
	warnPossibleBedrock: "Le fichier sélectionné (.mcpack) est peut-être déjà un pack Bedrock. Pour une conversion depuis Java, sélectionnez un fichier .zip de la version Java.",
	warnPossibleJava: "Le fichier sélectionné est peut-être déjà un pack Java. Pour une conversion depuis Bedrock, assurez-vous de sélectionner un fichier .mcpack ou .zip de la version Bedrock.",

	footer: "PackBridge | Convertisseur de packs de ressources Minecraft",
	terms: "Conditions d'utilisation",
	keywords: "Minecraft, Pack de ressources, Texture, Convertisseur, Java vers Bedrock, Bedrock vers Java, PackBridge, Portrage",
	disclaimerPerfect: "*Note : La conversion parfaite de tous les fichiers n'est pas garantie. Des ajustements manuels peuvent être nécessaires après conversion.",
	error404Title: "Page non trouvée",
	error404Description: "Désolé, la page que vous recherchez n'existe pas ou a été déplacée.",

	// Terms of Use
	termsLastUpdated: "22 avril 2024",
	termsSections: [
		{
			title: "1. Utilisation du service",
			content: "Ce service est un outil de conversion de packs de ressources Minecraft entre les éditions Java et Bedrock. Tout le traitement s'effectue localement dans le navigateur ; aucun fichier n'est envoyé à des serveurs externes.",
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
			content: "• Traitement des données : Toutes les données sont traitées localement dans le navigateur. Le contenu n'est jamais envoyé ni collecté par des serveurs.\n• Analyse : Ce site utilise Cloudflare Web Analytics pour comprendre les modèles d'utilisation. Les données collectées sont statistiques et anonymes.\n• Stockage local : Nous utilisons le localStorage du navigateur pour enregistrer vos préférences de langue et de thème.",
		},
	],
	backToHome: "Retour à l'accueil",
	viewSourceCode: "Voir le code source sur GitHub",
	openSourceText: "Ce service est open source.",
};

export default fr;
