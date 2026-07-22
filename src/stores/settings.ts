import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';
import { UPOS_TAGS, type UPos } from '../core/upos';
import lightPreset from '../themes/light.json';
import darkPreset from '../themes/dark.json';
import focusPreset from '../themes/focus.json';
import colorblindPreset from '../themes/colorblind.json';

export interface TagStyle {
  color: string;
  enabled: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface Theme {
  name: string;
  version: 1;
  light: Record<UPos, TagStyle>;
  dark: Record<UPos, TagStyle>;
}

const STORAGE_KEY = 'readion:settings:v1';

export const PRESETS: Theme[] = [
  focusPreset as Theme,
  lightPreset as Theme,
  darkPreset as Theme,
  colorblindPreset as Theme,
];

function getDefaultTheme(): Theme {
  return structuredClone(focusPreset) as Theme;
}

/** Read dark-mode preference from OS. */
function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<Theme>(getDefaultTheme());
  const activePreset = ref<string>('Focus');
  const font = ref<'sans' | 'serif' | 'system'>('sans');
  const fontSize = ref(16);
  const lineHeight = ref(1.6);
  const columnWidth = ref(68);
  const darkMode = ref<'auto' | 'light' | 'dark'>('auto');

  const isDark = computed(() => {
    if (darkMode.value === 'auto') return prefersDark();
    return darkMode.value === 'dark';
  });

  const currentPalette = computed(() => {
    return isDark.value ? theme.value.dark : theme.value.light;
  });

  /** Apply theme as CSS custom properties on :root */
  function applyTheme(): void {
    const root = document.documentElement;
    const palette = currentPalette.value;

    // Dark mode class
    root.classList.toggle('dark', isDark.value);

    // Set POS color variables
    for (const tag of UPOS_TAGS) {
      const style = palette[tag];
      const varName = `--pos-${tag.toLowerCase()}`;

      if (style && style.enabled) {
        root.style.setProperty(varName, style.color);
        root.style.setProperty(`${varName}-fw`, style.bold ? 'bold' : 'inherit');
        root.style.setProperty(`${varName}-fs`, style.italic ? 'italic' : 'inherit');
        root.style.setProperty(`${varName}-td`, style.underline ? 'underline' : 'inherit');
      } else {
        root.style.setProperty(varName, 'inherit');
        root.style.setProperty(`${varName}-fw`, 'inherit');
        root.style.setProperty(`${varName}-fs`, 'inherit');
        root.style.setProperty(`${varName}-td`, 'inherit');
      }
    }

    // Reading preferences
    const fontFamily = font.value === 'serif'
      ? 'var(--font-serif)'
      : font.value === 'system'
        ? 'system-ui, sans-serif'
        : 'var(--font-sans)';

    root.style.setProperty('--font-body', fontFamily);
    root.style.setProperty('--font-size', `${fontSize.value}px`);
    root.style.setProperty('--line-height', `${lineHeight.value}`);
    root.style.setProperty('--column-width', `${columnWidth.value}ch`);
  }

  /** Save settings to localStorage. */
  function save(): void {
    const data = {
      theme: theme.value,
      activePreset: activePreset.value,
      font: font.value,
      fontSize: fontSize.value,
      lineHeight: lineHeight.value,
      columnWidth: columnWidth.value,
      darkMode: darkMode.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Load settings from localStorage. */
  function load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw) as Record<string, unknown>;

      if (data['theme'] && typeof data['theme'] === 'object') {
        const t = data['theme'] as Theme;
        if (t.version === 1 && t.light && t.dark) {
          theme.value = t;
        }
      }
      if (typeof data['activePreset'] === 'string') activePreset.value = data['activePreset'];
      if (data['font'] === 'sans' || data['font'] === 'serif' || data['font'] === 'system') font.value = data['font'];
      if (typeof data['fontSize'] === 'number') fontSize.value = data['fontSize'];
      if (typeof data['lineHeight'] === 'number') lineHeight.value = data['lineHeight'];
      if (typeof data['columnWidth'] === 'number') columnWidth.value = data['columnWidth'];
      if (data['darkMode'] === 'auto' || data['darkMode'] === 'light' || data['darkMode'] === 'dark') darkMode.value = data['darkMode'];
    } catch (err) {
      console.warn('Failed to load settings, using defaults:', err);
    }
  }

  /** Apply a preset theme. */
  function applyPreset(preset: Theme): void {
    theme.value = structuredClone(preset) as Theme;
    activePreset.value = preset.name;
  }

  /** Set tag style. */
  function setTagStyle(tag: UPos, mode: 'light' | 'dark', style: Partial<TagStyle>): void {
    const palette = mode === 'dark' ? theme.value.dark : theme.value.light;
    Object.assign(palette[tag], style);
    activePreset.value = 'Custom';
  }

  /** Toggle tag enabled/disabled. */
  function toggleTag(tag: UPos): void {
    const palette = currentPalette.value;
    palette[tag].enabled = !palette[tag].enabled;
    activePreset.value = 'Custom';
  }

  /** Enable or disable all tags. */
  function setAllTags(enabled: boolean): void {
    const palette = currentPalette.value;
    for (const tag of UPOS_TAGS) {
      palette[tag].enabled = enabled;
    }
    activePreset.value = 'Custom';
  }

  /** Export theme as JSON string. */
  function exportTheme(): string {
    return JSON.stringify(theme.value, null, 2);
  }

  /** Import theme from JSON string. Returns true on success. */
  function importTheme(json: string): boolean {
    try {
      const data = JSON.parse(json) as Theme;
      if (data.version !== 1 || !data.light || !data.dark || !data.name) {
        return false;
      }
      // Verify all tags present
      for (const tag of UPOS_TAGS) {
        if (!data.light[tag] || !data.dark[tag]) return false;
      }
      theme.value = data;
      activePreset.value = data.name;
      return true;
    } catch {
      return false;
    }
  }

  // Watch all reactive state and persist + apply
  watch(
    [theme, activePreset, font, fontSize, lineHeight, columnWidth, darkMode],
    () => {
      applyTheme();
      save();
    },
    { deep: true },
  );

  // Initialize
  load();
  applyTheme();

  // Listen for OS dark mode changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (darkMode.value === 'auto') applyTheme();
    });
  }

  return {
    theme,
    activePreset,
    font,
    fontSize,
    lineHeight,
    columnWidth,
    darkMode,
    isDark,
    currentPalette,
    applyPreset,
    setTagStyle,
    toggleTag,
    setAllTags,
    exportTheme,
    importTheme,
    applyTheme,
  };
});
