export const SUPPORTED_LANGUAGES = ["ja", "en", "ko", "zh", "tl", "tok", "es", "fr", "de"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANG_NAMES: Record<Language, string> = {
	ja: "日本語",
	en: "English",
	ko: "한국어",
	zh: "中文",
	tl: "Tagalog",
	tok: "toki pona",
	es: "Español",
	fr: "Français",
	de: "Deutsch",
};

export const DEFAULT_LANGUAGE: Language = "ja";
