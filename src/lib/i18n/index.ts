import enMessages from "./messages/en.json";
import hiMessages from "./messages/hi.json";
import guMessages from "./messages/gu.json";

export type Locale = "en" | "hi" | "gu";

const messagesMap: Record<Locale, Record<string, unknown>> = {
  en: enMessages,
  hi: hiMessages,
  gu: guMessages,
};

export function getNestedMessage(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }

  return typeof current === "string" ? current : path;
}

export function translate(key: string, locale: Locale = "en"): string {
  const dict = messagesMap[locale] || messagesMap.en;
  const result = getNestedMessage(dict, key);
  if (result === key && locale !== "en") {
    // Fallback to English
    return getNestedMessage(messagesMap.en, key);
  }
  return result;
}

export function useI18n(locale: Locale = "en") {
  return {
    t: (key: string) => translate(key, locale),
    locale,
  };
}
