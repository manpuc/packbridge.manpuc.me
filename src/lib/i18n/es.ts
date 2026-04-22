import type { Translation } from "./types";

const es: Translation = {
	title: "PackBridge - Convertidor de paquetes de recursos de Minecraft",
	heading: "PackBridge",
	description: "Convierte paquetes de recursos de Minecraft entre Java Edition y Bedrock Edition. Todo sucede en tu navegador; tus archivos nunca se suben a un servidor.",

	directionJavaToBedrock: "Java → Bedrock",
	directionBedrockToJava: "Bedrock → Java",

	dropzoneTitle: "Suelta tu paquete aquí o haz clic para buscar",
	dropzoneSubtitle: "Soporta archivos .zip o .mcpack",
	dropzoneProcessing: "Procesando...",
	targetVersion: "Versión de destino",

	btnConvert: "Iniciar conversión",
	btnDownload: "Descargar paquete convertido",
	btnReset: "Convertir otro archivo",

	reportTitle: "Informe de conversión",
	statusConverted: "Convertido",
	statusSkipped: "Omitido",
	statusError: "Error",

	summaryTitle: "Resumen",
	countTotal: "Total de archivos",
	countConverted: "Convertidos",
	countSkipped: "Omitidos",
	countErrors: "Errores",

	unsupportedTitle: "Archivos no compatibles / omitidos",
	unsupportedReason: "Razón",

	errorNoFile: "Por favor, selecciona un archivo.",
	errorInvalidFile: "Formato de archivo no válido. Por favor, selecciona un archivo .zip o .mcpack.",
	errorConversion: "Ocurrió un error durante la conversión.",
	warnPossibleBedrock: "El archivo seleccionado (.mcpack) puede que ya sea un paquete de recursos de Bedrock Edition. Al convertir desde Java, normalmente se selecciona un archivo .zip de Java Edition.",
	warnPossibleJava: "El archivo seleccionado puede que ya sea un paquete de recursos de Java Edition. Al convertir desde Bedrock, asegúrate de seleccionar un archivo .mcpack o .zip de Bedrock Edition.",

	footer: "PackBridge | Convertidor de paquetes de recursos de Minecraft",
	terms: "Términos de servicio",
	keywords: "Minecraft, Paquete de recursos, Paquete de texturas, Convertidor, Java a Bedrock, Bedrock a Java, PackBridge, Portar, Activos",
	disclaimerPerfect: "*Nota: No se garantiza la conversión perfecta de todos los archivos. Pueden ser necesarios ajustes manuales después de la conversión.",
	error404Title: "Página no encontrada",
	error404Description: "Lo sentimos, la página que buscas no existe o ha sido movida.",

	// Terms of Use
	termsLastUpdated: "22 de abril de 2024",
	termsSections: [
		{
			title: "1. Uso del servicio",
			content: "Este servicio es una herramienta para convertir paquetes de recursos de Minecraft entre las ediciones Java y Bedrock. Todo el procesamiento ocurre localmente en el navegador; no se envían archivos a servidores externos.",
		},
		{
			title: "2. Descargo de responsabilidad (Responsabilidad propia)",
			content: "El uso de este servicio y su código fuente es bajo su propio riesgo. No se garantiza la conversión perfecta de todos los archivos y pueden ocurrir problemas en los datos convertidos. El desarrollador no será responsable de ningún daño o problema derivado del uso de este servicio.",
		},
		{
			title: "3. Derechos de autor y licencia",
			content: "Los derechos de autor del código fuente y el diseño pertenecen a manpuc. Se permite su uso con la atribución correspondiente (https://www.manpuc.me), pero se prohíbe la redistribución de clones sin cambios significativos.",
		},
		{
			title: "4. Acciones prohibidas",
			content: "Se prohíbe cualquier acción que interfiera con el funcionamiento del sitio o que infrinja la ley.",
		},
		{
			title: "5. Cambios en los términos",
			content: "Estos términos pueden ser modificados en cualquier momento a discreción del desarrollador sin previo aviso. Al continuar utilizando el servicio, se considera que ha aceptado los términos más recientes.",
		},
		{
			title: "6. Política de privacidad",
			content: "• Procesamiento de datos: Todos los datos convertidos a través de este servicio se procesan localmente en el navegador del usuario. El contenido nunca se envía ni se recopila en servidores.\n• Análisis: Este sitio utiliza Cloudflare Web Analytics para comprender los patrones de uso. Esto recopila datos estadísticos y no identifica a usuarios individuales.\n• Almacenamiento local: Utilizamos el localStorage del navegador para guardar sus preferencias de idioma y tema (modo oscuro).",
		},
	],
	backToHome: "Volver al inicio",
	viewSourceCode: "Ver código fuente en GitHub",
	openSourceText: "Este servicio es de código abierto.",
};

export default es;
