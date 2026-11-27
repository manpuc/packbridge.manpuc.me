import type { Translation } from "./types";

const es: Translation = {
	title: "Convertidor de paquetes de recursos y texturas de Minecraft | PackBridge",
	heading: "PackBridge",
	description: "Convierte paquetes de recursos y paquetes de texturas de Minecraft entre Java Edition y Bedrock Edition. Todo sucede en tu navegador; tus archivos nunca se suben a un servidor.",
	metaDescription: "Convertidor gratuito en línea de paquetes de recursos y paquetes de texturas de Minecraft. Convierte entre Java y Bedrock Edition de forma segura y rápida en tu navegador.",
	h1Title: "Convertidor de paquetes de recursos y texturas de Minecraft",

	// SEO Content
	introTitle: "¿Qué es PackBridge?",
	introDescription: "PackBridge es una herramienta potente diseñada para convertir paquetes de recursos y paquetes de texturas de Minecraft entre diferentes ediciones (Java ⇄ Bedrock). Automatizamos el complejo proceso de remapeo de activos para que puedas disfrutar de tus texturas favoritas en cualquier dispositivo.",
	introFeaturesTitle: "Características principales",
	introFeature1: "Procesamiento local: Tus archivos nunca salen de tu ordenador. La conversión ocurre totalmente en tu navegador.",
	introFeature2: "Bidireccional: Convierte paquetes de recursos y texturas sin problemas entre las ediciones Java y Bedrock.",
	introFeature3: "Rápido y Ligero: Optimizado para velocidad, permitiéndote convertir paquetes de recursos grandes en segundos.",
	introFeature4: "Conversión de Versión: Soporta la actualización de versiones antiguas a versiones más nuevas dentro de la misma edición. Perfecto para portar paquetes.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",
	directionVersionUpdate: "Cambiar Versión",
	sourceEdition: "Edición de Origen",
	targetEdition: "Edición de Destino",
	editionJava: "Java Edition",
	editionBedrock: "Bedrock Edition",

	dropzoneTitle: "Suelta tu paquete aquí o haz clic para buscar",
	dropzoneTitleMobile: "Toca para seleccionar tu paquete",
	dropzoneSubtitle: "Soporta archivos .zip o .mcpack",
	dropzoneProcessing: "Procesando...",
	sourceVersion: "Versión de origen",
	targetVersion: "Versión de destino",
	autoDetected: "Autodetectado",
	uploadToAutoDetect: "Sube un archivo para autodetectar",

	btnConvert: "Iniciar conversión",
	btnDownload: "Descargar paquete convertido",
	inAppBrowserNotice: "Puede que no se guarde en el navegador de la app.",
	inAppBrowserAction: "Abre en Safari o Chrome",
	inAppBrowserOpenExternal: "Abrir en navegador externo",
	btnReset: "Convertir otro archivo",

	reportTitle: "Informe de conversión",
	statusConverted: "Convertido",
	statusSkipped: "Omitido",
	statusError: "Error",
	statusWarning: "Aviso",
	reportSearchPlaceholder: "Filtrar por archivo o motivo...",
	reportFilterAll: "Todos",
	reportNoMatches: "No se encontraron archivos coincidentes",
	reportPrev: "Anterior",
	reportNext: "Siguiente",

	summaryTitle: "¡Conversión completada!",
	countTotal: "Total de archivos",
	countConverted: "Convertidos",
	countSkipped: "Omitidos",
	countErrors: "Errores",

	btnExportTxt: "Exportar TXT",

	unsupportedTitle: "Archivos no compatibles / omitidos",
	unsupportedReason: "Razón",

	errorNoFile: "Por favor, selecciona un archivo.",
	errorInvalidFile: "Formato de archivo no válido. Por favor, selecciona un archivo .zip o .mcpack.",
	errorConversion: "Ocurrió un error durante la conversión.",
	errorFileExpired: "La referencia del archivo expiró. Por favor, vuelve a seleccionar el archivo.",
	errorZeroConverted: "No se encontraron archivos convertibles. Asegúrate de que sea un archivo de resource pack de Minecraft válido.",
	warnPossibleBedrock: "El archivo seleccionado (.mcpack) puede que ya sea un paquete de recursos de Bedrock Edition. Al convertir desde Java, normalmente se selecciona un archivo .zip de Java Edition.",
	warnPossibleJava: "El archivo seleccionado puede que ya sea un paquete de recursos de Java Edition. Al convertir desde Bedrock, asegúrate de seleccionar un archivo .mcpack o .zip de Bedrock Edition.",
	warnNotMinecraftPack: "Es posible que no sea un pack de recursos de Minecraft (no se encontró pack.mcmeta, manifest.json ni carpetas de texturas).",
	noticeAutoSwitchedToBedrockToJava: "Se detectó un pack de Bedrock; la dirección cambió automáticamente a Bedrock → Java.",
	noticeAutoSwitchedToJavaToBedrock: "Se detectó un pack de Java; la dirección cambió automáticamente a Java → Bedrock.",

	footer: "PackBridge | Convertidor de paquetes de recursos y texturas de Minecraft",
	terms: "Términos de servicio",
	disclaimerPerfect: "*Nota: No se garantiza la conversión perfecta de todos los archivos. Pueden ser necesarios ajustes manuales después de la conversión.",
	error404Title: "Página no encontrada",
	error404Description: "Lo sentimos, la página que buscas no existe o ha sido movida.",

	// Terms of Use
	termsLastUpdatedLabel: "Última actualización",
	termsLastUpdated: "27 de noviembre de 2026",
	termsSections: [
		{
			title: "1. Uso del servicio",
			content: "Este servicio convierte paquetes de recursos y texturas de Minecraft entre Java y Bedrock Edition, actualiza versiones dentro de la misma edición y ofrece funciones beta experimentales (conversión GUI, recodificación de audio FFmpeg, mapas PBR/shaders y modelos 3D personalizados). Todo el procesamiento ocurre localmente en su navegador; ningún paquete se sube a servidores externos. Los metadatos convertidos (manifest.json, pack.mcmeta, .jem) incluyen una atribución de PackBridge.",
		},
		{
			title: "2. Descargo de responsabilidad y derechos de terceros",
			content: "El uso de este servicio y su código fuente es bajo su propio riesgo. No se garantiza la conversión perfecta de todos los archivos (incluidas las funciones beta) y pueden producirse fallos visuales o de compatibilidad. El desarrollador no será responsable de ningún daño o pérdida derivada del uso del servicio.\nAl convertir, usar o redistribuir paquetes creados por terceros, usted es el único responsable de verificar y cumplir con la licencia y condiciones del autor original.\nNO ES UN PRODUCTO OFICIAL DE MINECRAFT. NO ESTÁ APROBADO NI ASOCIADO CON MOJANG NI MICROSOFT (NOT AN OFFICIAL MINECRAFT PRODUCT).",
		},
		{
			title: "3. Derechos de autor y licencia",
			content: "Los derechos de autor del código fuente y el diseño pertenecen a manpuc. Se permite su uso con la atribución correspondiente (https://www.manpuc.me), pero se prohíbe la redistribución de clones sin cambios significativos.",
		},
		{
			title: "4. Acciones prohibidas",
			content: "Se prohíbe generar carga excesiva en la red, interferir con el funcionamiento del sitio, infringir derechos de propiedad intelectual de terceros o infringir la ley.",
		},
		{
			title: "5. Cambios en los términos",
			content: "Estos términos pueden ser modificados en cualquier momento a discreción del desarrollador sin previo aviso. Al continuar utilizando el servicio, se considera que ha aceptado los términos más recientes.",
		},
		{
			title: "6. Política de privacidad",
			content: "• Procesamiento de datos: Todos los paquetes convertidos se procesan localmente en su navegador. El contenido nunca se sube ni se recopila en servidores.\n• Bibliotecas externas y fuentes: La función beta de recodificación de audio descarga bibliotecas FFmpeg verificadas con SHA-256 desde CDN externos (unpkg.com / cdn.jsdelivr.net), y el sitio carga fuentes desde Google Fonts. Sus paquetes nunca se envían a estos proveedores, aunque sus CDN procesan metadatos HTTP estándar (como la dirección IP).\n• Análisis: Este sitio utiliza Umami (sin cookies) para recopilar estadísticas anónimas y resúmenes de errores técnicos enmascarados (sin nombres de archivo, rutas, URL ni datos personales).\n• Almacenamiento del navegador (localStorage / sessionStorage): Se utiliza para guardar idioma, tema, estado de interfaz, opciones beta, un contador local anónimo de conversiones (sin UUID) para estadísticas agregadas y registros temporales/enfriamiento para informes de errores (eliminados al reiniciar o cerrar la pestaña).\n• Informes de errores: Solo cuando usted envía voluntariamente un informe, la descripción ingresada, el correo opcional de respuesta (solo en envíos directos por Formspree y únicamente para responder), datos del navegador/SO y los registros que elija adjuntar se envían a Formspree (formspree.io) o a GitHub Issues público (github.com). El archivo del paquete nunca se sube.",
		},
	],
	backToHome: "Volver al inicio",
	viewSourceCode: "Ver código fuente en GitHub",
	openSourceText: "Este servicio es de código abierto.",
	betaFeatures: "Funciones beta",
	betaActiveCount: "{count} en uso",
	enableGuiConversion: "Conversión de interfaz GUI",
	enableAudioReencode: 'Re-codificar audio (FFmpeg, ~10MB)',
	enablePbrConversion: 'Conversión de mapas PBR / Shaders (RTX ⇄ LabPBR)',
	enableModelConversion: 'Conversión de modelos 3D (Geo ⇄ JSON/CEM)',
	betaWarningAudioReencode: 'Descarga ~10 MB de bibliotecas FFmpeg la primera vez y recodifica archivos .wav/.mp3 o .ogg no 44.1 kHz/no Vorbis conservando canales mono/estéreo (aumenta el tiempo de conversión y el uso de CPU).',
	betaWarningGuiConversion: 'Recorta dinámicamente icons.png y widgets.png, lo que puede aumentar el uso de memoria en paquetes HD. Debido a diferencias de interfaz entre Java y Bedrock, algunas pantallas de inventario pueden no alinearse a la perfección.',
	betaWarningPbrConversion: 'Convierte mapas PBR de Bedrock (_mer/_normal) y LabPBR de Java (_s/_n). Aumenta el tiempo de procesamiento y requiere mods de shaders (Iris/OptiFine) en Java.',
	betaWarningModelConversion: 'Convierte experimentalmente modelos 3D y geometría de entidades (.geo.json ⇄ .json / OptiFine CEM .jem). Algunas estructuras complejas pueden desalinearse.',
};

export default es;
