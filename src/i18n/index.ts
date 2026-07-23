import { ref, computed } from 'vue';
import en, { type MessageKey, type Messages } from './en';
import zh from './zh';
import ja from './ja';

export type Locale = 'en' | 'zh' | 'ja';

const localeMap: Record<Locale, Messages> = { en, zh, ja };

export const LOCALE_LABELS: Record<Locale | 'auto', string> = {
  auto: 'Auto',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

const STORAGE_KEY = 'readion:locale';

/** Detect best locale from browser navigator.languages. */
function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  for (const lang of navigator.languages ?? [navigator.language]) {
    const code = lang.toLowerCase().split('-')[0];
    if (code === 'zh') return 'zh';
    if (code === 'ja') return 'ja';
    if (code === 'en') return 'en';
  }
  return 'en';
}

/** Load persisted locale override (null means auto-detect). */
function loadLocale(): Locale | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'en' || val === 'zh' || val === 'ja') return val;
  } catch { /* SSR / privacy mode */ }
  return null;
}

const localeOverride = ref<Locale | null>(loadLocale());

/** The effective locale, accounting for auto-detect. */
const currentLocale = computed<Locale>(() => localeOverride.value ?? detectLocale());

/** Get the messages object for the current locale. */
const messages = computed(() => localeMap[currentLocale.value]);

/**
 * Translate a message key, with optional interpolation.
 * Falls back to English if key missing in current locale.
 */
function t(key: MessageKey, params?: Record<string, string | number>): string {
  let msg = messages.value[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return msg;
}

/** Set locale override. Pass null for auto-detect. */
function setLocale(locale: Locale | null): void {
  localeOverride.value = locale;
  try {
    if (locale) {
      localStorage.setItem(STORAGE_KEY, locale);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* SSR / privacy mode */ }
}

/**
 * Composable for i18n. Returns the `t()` function and locale state.
 */
export function useI18n() {
  return {
    t,
    locale: currentLocale,
    localeOverride,
    setLocale,
  };
}

export type { MessageKey };
