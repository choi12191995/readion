import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { EngineMeta } from '../engines/types';
import { getTaggerClient } from '../workers/client';

export const useEnginesStore = defineStore('engines', () => {
  const available = ref<EngineMeta[]>([]);
  const loaded = ref<string[]>([]);
  const downloads = ref<Map<string, { loaded: number; total: number }>>(new Map());
  const preferred = ref<'fast' | 'accurate'>('fast');

  const client = getTaggerClient();

  async function fetchEngines(): Promise<void> {
    try {
      available.value = await client.listEngines();
    } catch (err) {
      console.error('Failed to fetch engines:', err);
    }
  }

  async function loadEngine(id: string): Promise<void> {
    try {
      await client.loadEngine(id);
      if (!loaded.value.includes(id)) {
        loaded.value.push(id);
      }
      downloads.value.delete(id);
    } catch (err) {
      console.error(`Failed to load engine ${id}:`, err);
      throw err;
    }
  }

  async function deleteCache(id: string): Promise<void> {
    await client.deleteEngineCache(id);
    loaded.value = loaded.value.filter((eid) => eid !== id);
  }

  function isLoaded(id: string): boolean {
    return loaded.value.includes(id);
  }

  // Set up download progress tracking
  void client.onDownloadProgress((engineId, loadedBytes, totalBytes) => {
    downloads.value.set(engineId, { loaded: loadedBytes, total: totalBytes });
  });

  // Initial fetch
  void fetchEngines();

  return {
    available,
    loaded,
    downloads,
    preferred,
    fetchEngines,
    loadEngine,
    deleteCache,
    isLoaded,
  };
});
