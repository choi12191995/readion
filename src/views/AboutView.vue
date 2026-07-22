<script setup lang="ts">
import { UPOS_TAGS } from '@/core/upos';
import { UPOS_LABELS } from '@/core/upos-labels';
</script>

<template>
  <div class="about-view">
    <h1>About Readion</h1>

    <section>
      <h2>What is Readion?</h2>
      <p>
        Readion colors words by their part of speech — nouns, verbs, adjectives, and more —
        the same way a code editor syntax-highlights programming languages.
        It is a <strong>reading and learning aid</strong> for language learners, teachers,
        editors, and anyone who benefits from visual anchors in text.
      </p>
      <p class="note">
        Color-coded grammar can make sentence structure easier to see.
        It may help some readers read faster, but we make no scientific
        speed-reading claims.
      </p>
    </section>

    <section>
      <h2>Privacy</h2>
      <p>
        Everything happens on your device. Your text is never sent to any server.
        Readion has no backend, no accounts, no telemetry, and no cookies.
        All data is stored in your browser's localStorage.
      </p>
    </section>

    <section>
      <h2>Universal POS Tags</h2>
      <p>Readion uses the 17 Universal POS tags from the Universal Dependencies project.</p>
      <table class="upos-table">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Name</th>
            <th>Description</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tag in UPOS_TAGS"
            :key="tag"
          >
            <td><code :class="'pos-' + tag.toLowerCase()">{{ tag }}</code></td>
            <td>{{ UPOS_LABELS[tag].name }}</td>
            <td>{{ UPOS_LABELS[tag].description }}</td>
            <td class="example-col">
              {{ UPOS_LABELS[tag].example }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>Technology</h2>
      <p>
        Built with Vue 3, TypeScript, Vite, and Pinia. NLP engines:
        wink-nlp (English), jieba-wasm (Chinese), kuromoji.js (Japanese).
        Additional languages available via on-device ONNX models (transformers.js).
      </p>
    </section>

    <section>
      <h2>Credits &amp; License</h2>
      <p>
        Readion is open-source software released under the
        <a
          href="https://opensource.org/licenses/MIT"
          target="_blank"
          rel="noopener noreferrer"
        >MIT License</a>.
      </p>
      <p>
        <a
          href="https://github.com/choi12191995/readion"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub
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
