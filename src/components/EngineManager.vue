<script setup lang="ts">
import { useEnginesStore } from '@/stores/engines';
import { ref, onMounted } from 'vue';

const engines = useEnginesStore();
const storageUsage = ref('');

async function updateStorageInfo(): Promise<void> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const est = await navigator.storage.estimate();
    const used = est.usage ?? 0;
    const quota = est.quota ?? 0;
    storageUsage.value = `${formatBytes(used)} / ${formatBytes(quota)}`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function tierLabel(tier: 1 | 2): string {
  return tier === 1 ? 'built-in' : 'download';
}

async function handleAction(engineId: string): Promise<void> {
  if (engines.isLoaded(engineId)) {
    await engines.deleteCache(engineId);
  } else {
    await engines.loadEngine(engineId);
  }
  await updateStorageInfo();
}

onMounted(updateStorageInfo);
</script>

<template>
  <div class="engine-manager">
    <h3>Engines</h3>
    <table class="engine-table">
      <thead>
        <tr>
          <th>Engine</th>
          <th>Languages</th>
          <th>Type</th>
          <th>Size</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="eng in engines.available"
          :key="eng.id"
        >
          <td>{{ eng.label }}</td>
          <td>{{ eng.languages.join(', ') }}</td>
          <td>
            <span
              class="tier-badge"
              :class="'tier-' + eng.tier"
            >{{ tierLabel(eng.tier) }}</span>
          </td>
          <td>{{ eng.downloadBytes > 0 ? formatBytes(eng.downloadBytes) : '—' }}</td>
          <td>
            <template v-if="engines.downloads.has(eng.id)">
              <span class="status-downloading">
                Downloading {{ Math.round(((engines.downloads.get(eng.id)?.loaded ?? 0) / (engines.downloads.get(eng.id)?.total ?? 1)) * 100) }}%
              </span>
            </template>
            <template v-else-if="engines.isLoaded(eng.id)">
              <span class="status-loaded">Installed</span>
            </template>
            <template v-else>
              <span class="status-available">Available</span>
            </template>
          </td>
          <td>
            <button
              class="action-btn"
              :disabled="engines.downloads.has(eng.id)"
              @click="handleAction(eng.id)"
            >
              {{ engines.isLoaded(eng.id) ? 'Delete' : 'Load' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p
      v-if="storageUsage"
      class="storage-info"
    >
      Storage: {{ storageUsage }}
    </p>
  </div>
</template>

<style scoped>
.engine-manager {
  max-width: 700px;
}

.engine-manager h3 {
  font-size: 1rem;
  margin-bottom: var(--space-md);
}

.engine-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.engine-table th,
.engine-table td {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.engine-table th {
  font-weight: 600;
  color: var(--color-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tier-badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
}

.tier-1 {
  background: var(--color-success);
  color: white;
}

.tier-2 {
  background: var(--color-accent);
  color: white;
}

.status-loaded { color: var(--color-success); font-weight: 500; }
.status-available { color: var(--color-muted); }
.status-downloading { color: var(--color-accent); }

.action-btn {
  padding: 2px var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--color-text);
  background: var(--color-surface);
}

.action-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.storage-info {
  margin-top: var(--space-md);
  font-size: 0.8rem;
  color: var(--color-muted);
}
</style>
