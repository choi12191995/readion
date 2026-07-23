<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';
import { useRouter, useRoute } from 'vue-router';
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from '@/i18n';

const settings = useSettingsStore();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

function cycleDarkMode(): void {
  const modes: Array<'auto' | 'light' | 'dark'> = ['auto', 'light', 'dark'];
  const idx = modes.indexOf(settings.darkMode);
  settings.darkMode = modes[(idx + 1) % modes.length]!;
}

function handleKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key === ',') {
    e.preventDefault();
    void router.push('/settings');
  }
  if (e.key === 'Escape') {
    // Close any open dialogs (future use)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-content">
        <router-link
          to="/"
          class="logo"
        >
          <span class="logo-read">Read</span><span class="logo-ion">ion</span>
          <span class="logo-tagline">{{ t('brand.tagline') }}</span>
        </router-link>

        <nav
          class="app-nav"
          role="navigation"
          :aria-label="t('nav.ariaLabel')"
        >
          <router-link
            to="/"
            :class="{ active: route.path === '/' }"
          >
            {{ t('nav.reader') }}
          </router-link>
          <router-link
            to="/settings"
            :class="{ active: route.path === '/settings' }"
          >
            {{ t('nav.settings') }}
          </router-link>
          <router-link
            to="/about"
            :class="{ active: route.path === '/about' }"
          >
            {{ t('nav.about') }}
          </router-link>
        </nav>

        <button
          class="dark-toggle"
          :title="t('darkMode.prefix') + settings.darkMode"
          :aria-label="t('darkMode.toggle')"
          @click="cycleDarkMode"
        >
          <span v-if="settings.isDark">☀️</span>
          <span v-else>🌙</span>
          <span class="dark-label">{{ settings.darkMode }}</span>
        </button>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.logo {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 700;
}

.logo-read {
  color: var(--pos-verb, #c62828);
}

.logo-ion {
  color: var(--color-text);
}

.logo-tagline {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--color-muted);
  margin-left: var(--space-xs);
}

.app-nav {
  display: flex;
  gap: var(--space-sm);
}

.app-nav a {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  color: var(--color-muted);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}

.app-nav a:hover,
.app-nav a.active {
  color: var(--color-text);
  background: var(--color-bg);
}

.dark-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--color-muted);
}

.dark-toggle:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.dark-label {
  text-transform: capitalize;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
