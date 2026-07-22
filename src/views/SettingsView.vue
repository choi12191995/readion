<script setup lang="ts">
import ThemeEditor from '@/components/ThemeEditor.vue';
import EngineManager from '@/components/EngineManager.vue';
</script>

<template>
  <div class="settings-view">
    <h1>Settings</h1>
    <ThemeEditor />
    <hr class="section-divider">
    <EngineManager />
  </div>
</template>

<style scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-md);
}

.settings-view h1 {
  font-size: 1.5rem;
  margin-bottom: var(--space-xl);
}

.section-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--space-xl) 0;
}
</style>
