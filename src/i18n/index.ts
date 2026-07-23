import { ref, computed } from 'vue';
import en, { type MessageKey, type Messages } from './en';
import zh from './zh';
import zhTW from './zh-tw';
import ja from './ja';

export type Locale = 'en' | 'zh' | 'zh-tw' | 'ja';

const localeMap: Record<Locale, Messages> = { en, zh, 'zh-tw': zhTW, ja };

export const LOCALE_LABELS: Record<Locale | 'auto', string> = {
  auto: 'Auto',
  en: 'English',
  zh: '简体中文',
  'zh-tw': '繁體中文',
  ja: '日本語',
};

const STORAGE_KEY = 'readion:locale';

/** Detect best locale from browser navigator.languages. */
function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  for (const lang of navigator.languages ?? [navigator.language]) {
    const lower = lang.toLowerCase();
    // Check full tag first for regional variants
    if (lower === 'zh-tw' || lower === 'zh-hant' || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-tw';
    const code = lower.split('-')[0];
    if (code === 'zh') return 'zh';
    if (code === 'ja') return 'ja';
    if (code === 'en') return 'en';
  }
  return 'en';
}

const VALID_LOCALES = new Set<string>(['en', 'zh', 'zh-tw', 'ja']);

/** Load persisted locale override (null means auto-detect). */
function loadLocale(): Locale | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val && VALID_LOCALES.has(val)) return val as Locale;
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
