<script setup lang="ts">
import { UPOS_TAGS, type UPos } from '@/core/upos';
import { sanitize } from '@/core/sanitize';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n';

const { t } = useI18n();

function formatUposExample(tag: UPos): string {
  const raw = t(`uposEx.${tag}` as MessageKey);
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return sanitize(escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));
}
</script>

<template>
  <div class="about-view">
    <h1>{{ t('about.title') }}</h1>

    <section>
      <h2>{{ t('about.whatTitle') }}</h2>
      <p>
        {{ t('about.whatP1') }}
        {{ t('about.whatP2a') }}<strong>{{ t('about.whatP2em') }}</strong>{{ t('about.whatP2b') }}
      </p>
      <p class="note">
        {{ t('about.whatNote') }}
      </p>
    </section>

    <section>
      <h2>{{ t('about.privacyTitle') }}</h2>
      <p>
        {{ t('about.privacyBody') }}
      </p>
    </section>

    <section>
      <h2>{{ t('about.uposTitle') }}</h2>
      <p>{{ t('about.uposBody') }}</p>
      <table class="upos-table">
        <thead>
          <tr>
            <th>{{ t('about.colTag') }}</th>
            <th>{{ t('about.colName') }}</th>
            <th>{{ t('about.colDesc') }}</th>
            <th>{{ t('about.colExample') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tag in UPOS_TAGS"
            :key="tag"
          >
            <td><code :class="'pos-' + tag.toLowerCase()">{{ tag }}</code></td>
            <td>{{ t(`upos.${tag}` as MessageKey) }}</td>
            <td>{{ t(`uposDesc.${tag}` as MessageKey) }}</td>
            <td
              class="example-col"
              v-html="formatUposExample(tag)"
            />
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>{{ t('about.techTitle') }}</h2>
      <p>
        {{ t('about.techBody') }}
      </p>
    </section>

    <section>
      <h2>{{ t('about.creditsTitle') }}</h2>
      <p>
        {{ t('about.creditsBody') }}
        <a
          href="https://opensource.org/licenses/MIT"
          target="_blank"
          rel="noopener noreferrer"
        >{{ t('about.mitLicense') }}</a>.
      </p>
      <p>
        <a
          href="https://github.com/choi12191995/readion"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('about.viewGithub') }}
        </a>
      </p>
    </section>
  </div>
</template>

<style scoped>
.about-view {
  max-width: 700px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-md);
}

.about-view h1 {
  font-size: 1.75rem;
  margin-bottom: var(--space-xl);
}

.about-view h2 {
  font-size: 1.2rem;
  margin-top: var(--space-xl);
  margin-bottom: var(--space-md);
}

.about-view p {
  margin-bottom: var(--space-md);
  line-height: 1.7;
  color: var(--color-text);
}

.note {
  font-style: italic;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.upos-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin: var(--space-md) 0;
}

.upos-table th,
.upos-table td {
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  text-align: left;
}

.upos-table th {
  background: var(--color-surface);
  font-weight: 600;
}

.upos-table code {
  font-family: var(--font-mono);
  font-weight: 600;
}

.example-col {
  font-size: 0.8rem;
  color: var(--color-muted);
}

section {
  margin-bottom: var(--space-lg);
}
</style>
