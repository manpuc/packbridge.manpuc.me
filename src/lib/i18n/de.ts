import type { Translation } from "./types";

const de: Translation = {
	title: "PackBridge - Minecraft Ressourcenpaket-Konverter",
	heading: "PackBridge",
	description: "Konvertieren Sie Minecraft Ressourcenpakete zwischen Java und Bedrock Edition. Alles passiert in Ihrem Browser; Ihre Dateien werden nie auf einen Server hochgeladen.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",

	dropzoneTitle: "Datei hier ablegen oder zum Durchsuchen klicken",
	dropzoneSubtitle: "Unterstützt .zip oder .mcpack Dateien",
	dropzoneProcessing: "Verarbeitung...",
	targetVersion: "Zielversion",

	btnConvert: "Konvertierung starten",
	btnDownload: "Konvertiertes Paket herunterladen",
	btnReset: "Andere Datei konvertieren",

	reportTitle: "Konvertierungsbericht",
	statusConverted: "Konvertiert",
	statusSkipped: "Übersprungen",
	statusError: "Fehler",

	summaryTitle: "Zusammenfassung",
	countTotal: "Dateien insgesamt",
	countConverted: "Erfolgreich",
	countSkipped: "Übersprungen",
	countErrors: "Fehler",

	unsupportedTitle: "Nicht unterstützte / übersprungene Dateien",
	unsupportedReason: "Grund",

	errorNoFile: "Bitte wählen Sie eine Datei aus.",
	errorInvalidFile: "Ungültiges Dateiformat. Bitte wählen Sie eine .zip oder .mcpack Datei.",
	errorConversion: "Bei der Konvertierung ist ein Fehler aufgetreten.",
	warnPossibleBedrock: "Die gewählte Datei (.mcpack) ist möglicherweise bereits ein Bedrock-Paket. Für eine Konvertierung von Java wählen Sie normalerweise eine .zip-Datei der Java Edition.",
	warnPossibleJava: "Die gewählte Datei ist möglicherweise bereits ein Java-Paket. Für eine Konvertierung von Bedrock stellen Sie sicher, dass Sie eine .mcpack oder .zip der Bedrock Edition wählen.",

	footer: "PackBridge | Minecraft Ressourcenpaket-Konverter",
	terms: "Nutzungsbedingungen",
	keywords: "Minecraft, Ressourcenpaket, Texturenpaket, Konverter, Java zu Bedrock, Bedrock zu Java, PackBridge, Portierung",
	disclaimerPerfect: "*Hinweis: Eine perfekte Konvertierung aller Dateien kann nicht garantiert werden. Manuelle Anpassungen können nach der Konvertierung erforderlich sein.",
	error404Title: "Seite nicht gefunden",
	error404Description: "Entschuldigung, die gesuchte Seite existiert nicht oder wurde verschoben.",

	// Terms of Use
	termsLastUpdated: "22. April 2024",
	termsSections: [
		{
			title: "1. Dienstnutzung",
			content: "Dieser Dienst ist ein Werkzeug zur Konvertierung von Minecraft-Ressourcenpaketen zwischen Java- und Bedrock-Editionen. Die gesamte Verarbeitung erfolgt lokal im Browser; es werden keine Dateien an externe Server gesendet.",
		},
		{
			title: "2. Haftungsausschluss",
			content: "Die Nutzung dieses Dienstes und seines Quellcodes erfolgt auf eigene Gefahr. Eine perfekte Konvertierung wird nicht garantiert. Der Entwickler haftet nicht für Schäden oder Probleme, die aus der Nutzung dieses Dienstes entstehen.",
		},
		{
			title: "3. Urheberrecht und Lizenz",
			content: "Das Urheberrecht für den Quellcode und das Design liegt bei manpuc. Die Nutzung ist mit angemessener Namensnennung (https://www.manpuc.me) gestattet. Die Weiterverbreitung von Klonen ohne wesentliche Änderungen ist untersagt.",
		},
		{
			title: "4. Verbotene Handlungen",
			content: "Jegliche Handlungen, die den Betrieb der Website stören oder gegen geltendes Recht verstoßen, sind untersagt.",
		},
		{
			title: "5. Änderungen der Bedingungen",
			content: "Diese Bedingungen können jederzeit nach Ermessen des Entwicklers ohne vorherige Ankündigung geändert werden. Durch die weitere Nutzung des Dienstes erklären Sie sich mit den neuesten Bedingungen einverstanden.",
		},
		{
			title: "6. Datenschutzrichtlinie",
			content: "• Datenverarbeitung: Alle Daten werden lokal im Browser verarbeitet. Inhalte werden niemals an Server gesendet oder dort gespeichert.\n• Analyse: Diese Website nutzt Cloudflare Web Analytics, um Nutzungsmuster zu verstehen. Die gesammelten Daten sind statistisch und anonym.\n• Lokale Speicherung: Wir verwenden den localStorage des Browsers, um Ihre Sprach- und Designeinstellungen zu speichern.",
		},
	],
	backToHome: "Zurück zur Startseite",
	viewSourceCode: "Quellcode auf GitHub ansehen",
	openSourceText: "Dieser Dienst ist Open Source.",
};

export default de;
