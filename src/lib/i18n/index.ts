import ja from "./ja";
import en from "./en";
import ko from "./ko";
import zh from "./zh";
import tl from "./tl";
import tok from "./tok";
import es from "./es";
import fr from "./fr";
import de from "./de";
import type { Translation } from "./types";
import type { Language } from "./config";

export const translations: Record<Language, Translation> = {
	ja,
	en,
	ko,
	zh,
	tl,
	tok,
	es,
	fr,
	de,
};

export function getTranslation(lang: Language): Translation {
	return translations[lang] || translations.en;
}

export * from "./types";
export * from "./config";
