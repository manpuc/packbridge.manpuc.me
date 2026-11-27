import type { Translation } from "./types";

const de: Translation = {
	title: "Minecraft Resource Pack & Texturenpack Konverter | PackBridge",
	heading: "PackBridge",
	description: "Konvertieren Sie Minecraft Ressourcenpakete und Texturenpakete zwischen Java und Bedrock Edition. Alles passiert in Ihrem Browser; Ihre Dateien werden nie auf einen Server hochgeladen.",
	metaDescription: "Kostenloses Online-Tool zum Konvertieren von Minecraft Resource Packs und Texturenpaketen zwischen Java Edition und Bedrock Edition. Verarbeiten Sie Dateien lokal in Ihrem Browser.",
	h1Title: "Minecraft Resource Pack & Texturenpack Konverter",

	// SEO Content
	introTitle: "Was ist PackBridge?",
	introDescription: "PackBridge ist ein leistungsstarkes Tool zum Konvertieren von Minecraft Resource Packs und Texturenpaketen zwischen verschiedenen Editionen (Java ⇄ Bedrock). Wir automatisieren den komplexen Prozess der Neuordnung von Assets.",
	introFeaturesTitle: "Hauptmerkmale",
	introFeature1: "Lokale Verarbeitung: Ihre Dateien verlassen nie Ihren Computer. Die Konvertierung findet vollständig in Ihrem Browser statt.",
	introFeature2: "Bidirektional: Konvertieren Sie Ressourcenpakete und Texturenpakete nahtlos zwischen Java und Bedrock Editionen.",
	introFeature3: "Schnell & Leichtgewicht: Auf Geschwindigkeit optimiert, sodass Sie große Packs in Sekundenschnelle konvertieren können.",
	introFeature4: "Versionskonvertierung: Unterstützt das Aktualisieren von älteren Versionen auf neuere Versionen innerhalb derselben Edition. Perfekt für das Portieren von Packs.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",
	directionVersionUpdate: "Version ändern",
	sourceEdition: "Quell-Edition",
	targetEdition: "Ziel-Edition",
	editionJava: "Java Edition",
	editionBedrock: "Bedrock Edition",

	dropzoneTitle: "Datei hier ablegen oder zum Durchsuchen klicken",
	dropzoneTitleMobile: "Tippen, um Datei auszuwählen",
	dropzoneSubtitle: "Unterstützt .zip oder .mcpack Dateien",
	dropzoneProcessing: "Wird bearbeitet...",
	sourceVersion: "Quellversion",
	targetVersion: "Zielversion",
	autoDetected: "Automatisch erkannt",
	uploadToAutoDetect: "Datei hochladen zur automatischen Erkennung",

	btnConvert: "Konvertierung starten",
	btnDownload: "Konvertiertes Paket herunterladen",
	inAppBrowserNotice: "Speichern klappt im In-App-Browser evtl. nicht.",
	inAppBrowserAction: "Öffne in Safari oder Chrome",
	inAppBrowserOpenExternal: "Im externen Browser öffnen",
	btnReset: "Andere Datei konvertieren",

	reportTitle: "Konvertierungsbericht",
	statusConverted: "Konvertiert",
	statusSkipped: "Übersprungen",
	statusError: "Fehler",
	statusWarning: "Warnung",
	reportSearchPlaceholder: "Nach Dateiname oder Grund filtern...",
	reportFilterAll: "Alle",
	reportNoMatches: "Keine passenden Dateien gefunden",
	reportPrev: "Zurück",
	reportNext: "Weiter",

	summaryTitle: "Konvertierung abgeschlossen!",
	countTotal: "Dateien insgesamt",
	countConverted: "Erfolgreich",
	countSkipped: "Übersprungen",
	countErrors: "Fehler",

	btnExportTxt: "TXT exportieren",

	unsupportedTitle: "Nicht unterstützte / übersprungene Dateien",
	unsupportedReason: "Grund",

	errorNoFile: "Bitte wählen Sie eine Datei aus.",
	errorInvalidFile: "Ungültiges Dateiformat. Bitte wählen Sie eine .zip oder .mcpack Datei.",
	errorConversion: "Bei der Konvertierung ist ein Fehler aufgetreten.",
	errorFileExpired: "Die Dateireferenz ist abgelaufen. Bitte wählen Sie die Datei erneut aus.",
	errorZeroConverted: "Keine konvertierbaren Dateien gefunden. Bitte stellen Sie sicher, dass es sich um ein gültiges Minecraft-Ressourcenpaket-Archiv handelt.",
	warnPossibleBedrock: "Die gewählte Datei (.mcpack) ist möglicherweise bereits ein Bedrock-Paket. Für eine Konvertierung von Java wählen Sie normalerweise eine .zip-Datei der Java Edition.",
	warnPossibleJava: "Die gewählte Datei ist möglicherweise bereits ein Java-Paket. Für eine Konvertierung von Bedrock stellen Sie sicher, dass Sie eine .mcpack oder .zip der Bedrock Edition wählen.",
	warnNotMinecraftPack: "Dies ist möglicherweise kein Minecraft-Ressourcenpaket (keine pack.mcmeta, manifest.json oder Texturordner gefunden).",
	noticeAutoSwitchedToBedrockToJava: "Bedrock-Paket erkannt — Richtung automatisch auf Bedrock → Java umgestellt.",
	noticeAutoSwitchedToJavaToBedrock: "Java-Paket erkannt — Richtung automatisch auf Java → Bedrock umgestellt.",

	footer: "PackBridge | Minecraft Ressourcenpaket- & Texturenpaket-Konverter",
	terms: "Nutzungsbedingungen",
	keywords: "Minecraft, Ressourcenpaket, Texturenpaket, Texturenpack, Konverter, Java zu Bedrock, Bedrock zu Java, PackBridge, Portierung",
	disclaimerPerfect: "*Hinweis: Eine perfekte Konvertierung aller Dateien kann nicht garantiert werden. Manuelle Anpassungen können nach der Konvertierung erforderlich sein.",
	error404Title: "Seite nicht gefunden",
	error404Description: "Entschuldigung, die gesuchte Seite existiert nicht oder wurde verschoben.",

	// Terms of Use
	termsLastUpdatedLabel: "Zuletzt aktualisiert",
	termsLastUpdated: "27. November 2026",
	termsSections: [
		{
			title: "1. Dienstnutzung",
			content: "Dieser Dienst konvertiert Minecraft-Ressourcen- und Texturenpakete zwischen Java- und Bedrock-Editionen, aktualisiert Versionen innerhalb derselben Edition und bietet experimentelle Beta-Funktionen (GUI-Konvertierung, FFmpeg-Audio-Neukodierung, PBR-/Shader-Maps und benutzerdefinierte 3D-Modelle). Die gesamte Konvertierung erfolgt lokal im Browser; Paketdateien werden niemals an externe Server gesendet. Konvertierte Metadaten (manifest.json, pack.mcmeta, .jem) enthalten einen PackBridge-Hinweis.",
		},
		{
			title: "2. Haftungsausschluss & Rechte Dritter",
			content: "Die Nutzung dieses Dienstes und seines Quellcodes erfolgt auf eigene Gefahr. Eine fehlerfreie Konvertierung aller Dateien (einschließlich experimenteller Beta-Funktionen) wird nicht garantiert. Der Entwickler haftet nicht für Schäden oder Datenprobleme, die aus der Nutzung entstehen.\nBeim Konvertieren, Verwenden oder Weitergeben von Paketen Dritter sind Sie allein dafür verantwortlich, die Lizenz- und Nutzungsbedingungen der ursprünglichen Ersteller zu prüfen und einzuhalten.\nKEIN OFFIZIELLES MINECRAFT-PRODUKT. NICHT VON MOJANG ODER MICROSOFT GENEHMIGT ODER MIT IHNEN VERBUNDEN (NOT AN OFFICIAL MINECRAFT PRODUCT).",
		},
		{
			title: "3. Urheberrecht und Lizenz",
			content: "Das Urheberrecht für den Quellcode und das Design liegt bei manpuc. Die Nutzung ist mit angemessener Namensnennung (https://www.manpuc.me) gestattet. Die Weiterverbreitung von Klonen ohne wesentliche Änderungen ist untersagt.",
		},
		{
			title: "4. Verbotene Handlungen",
			content: "Übermäßige Netzwerkbelastung, Störungen des Website-Betriebs, Verletzungen von Schutzrechten Dritter sowie rechtswidrige Handlungen sind untersagt.",
		},
		{
			title: "5. Änderungen der Bedingungen",
			content: "Diese Bedingungen können jederzeit nach Ermessen des Entwicklers ohne vorherige Ankündigung geändert werden. Durch die weitere Nutzung des Dienstes erklären Sie sich mit den neuesten Bedingungen einverstanden.",
		},
		{
			title: "6. Datenschutzrichtlinie",
			content: "• Datenverarbeitung: Alle konvertierten Paketdateien werden ausschließlich lokal in Ihrem Browser verarbeitet und niemals auf Server hochgeladen oder dort gespeichert.\n• Externe Bibliotheken & Schriftarten: Bei Aktivierung der Audio-Neukodierungs-Beta werden SHA-256-geprüfte FFmpeg-Bibliotheken von externen CDNs (unpkg.com / cdn.jsdelivr.net) geladen; zudem nutzt die Seite Google Fonts. Ihre Paketdateien werden dabei nicht übertragen, jedoch verarbeiten diese CDNs technisch bedingte HTTP-Anfragedaten (wie die IP-Adresse).\n• Analyse: Diese Website nutzt das cookielose Umami zur Erfassung anonymer Nutzungsstatistiken sowie maskierter technischer Fehlerzusammenfassungen (ohne Dateinamen, Pfade, URLs oder personenbezogene Daten).\n• Browser-Speicher (localStorage / sessionStorage): Dient zum Speichern von Sprache, Design, UI-Status, Beta-Einstellungen, einem anonymen lokalen Konvertierungszähler (ohne UUID) für aggregierte Statistiken sowie temporären Fehlerprotokollen/Abklingzeiten für Fehlermeldungen (werden beim Zurücksetzen oder Schließen des Tabs gelöscht).\n• Fehlermeldungen: Nur wenn Sie freiwillig einen Fehlerbericht absenden, werden Ihre Eingaben, eine optionale Antwort-E-Mail-Adresse (nur bei direktem Formspree-Versand und ausschließlich zur Beantwortung), Browser-/OS-Daten sowie von Ihnen ausgewählte Dateinamen/Fehlerprotokolle an Formspree (formspree.io) oder öffentlich an GitHub Issues (github.com) übermittelt. Die Paketdatei selbst wird niemals hochgeladen.",
		},
	],
	backToHome: "Zurück zur Startseite",
	viewSourceCode: "Quellcode auf GitHub ansehen",
	openSourceText: "Dieser Dienst ist Open Source.",
	betaFeatures: "Beta-Funktionen",
	betaActiveCount: "{count} aktiv",
	enableGuiConversion: "GUI-Konvertierung",
	enableAudioReencode: 'Audio neu kodieren (FFmpeg, ~10MB)',
	enablePbrConversion: 'PBR- / Shader-Map-Konvertierung (RTX ⇄ LabPBR)',
	enableModelConversion: '3D-Modell-Konvertierung (Geo ⇄ JSON/CEM)',
	betaWarningAudioReencode: 'Lädt beim ersten Mal ca. 10 MB FFmpeg-Bibliotheken herunter und kodiert .wav/.mp3 sowie Nicht-44,1-kHz-/Nicht-Vorbis-.ogg unter Beibehaltung von Mono-/Stereokanälen neu (erhöht Verarbeitungszeit und CPU-Last).',
	betaWarningGuiConversion: 'Schneidet icons.png und widgets.png dynamisch zu, was bei HD-Packs den Speicherverbrauch erhöhen kann. Aufgrund struktureller Unterschiede zwischen Java und Bedrock UI passen einige Inventare möglicherweise nicht perfekt.',
	betaWarningPbrConversion: 'Konvertiert zwischen Bedrock RTX/Deferred PBR-Maps (_mer/_normal) und Java LabPBR-Shader-Maps (_s/_n). Erhöht die Verarbeitungszeit und erfordert eine Shader-Mod (Iris/OptiFine) in Java.',
	betaWarningModelConversion: 'Konvertiert experimentell 3D-Block-/Item-Modelle und Entitätsgeometrie (.geo.json ⇄ .json / OptiFine CEM .jem). Komplexe Knochenstrukturen können leicht abweichen.',
};

export default de;
