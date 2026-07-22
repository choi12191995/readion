<script setup lang="ts">
import { useDocumentStore } from '@/stores/document';
import { ref, onMounted, onUnmounted } from 'vue';

const doc = useDocumentStore();
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
let dragCounter = 0;

function handleDrop(e: DragEvent): void {
  e.preventDefault();
  isDragOver.value = false;
  dragCounter = 0;

  const file = e.dataTransfer?.files[0];
  if (file) void readFile(file);
}

function handleDragEnter(e: DragEvent): void {
  e.preventDefault();
  dragCounter++;
  isDragOver.value = true;
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault();
}

function handleDragLeave(): void {
  dragCounter--;
  if (dragCounter <= 0) {
    isDragOver.value = false;
    dragCounter = 0;
  }
}

function handleFileSelect(e: Event): void {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) void readFile(file);
  // Reset so re-selecting the same file fires change
  target.value = '';
}

async function readFile(file: File): Promise<void> {
  const name = file.name.toLowerCase();
  const validExts = ['.md', '.txt', '.markdown'];
  const hasValidExt = validExts.some((ext) => name.endsWith(ext));

  if (!hasValidExt) {
    // Allow extensionless files as plain text
    if (name.includes('.')) {
      console.warn('Unsupported file type:', name);
      return;
    }
  }

  if (file.size > 5 * 1024 * 1024) {
    console.warn('File too large:', file.size);
    return;
  }

  try {
    const text = await file.text();
    doc.setInput(text);
  } catch (err) {
    console.error('Failed to read file:', err);
  }
}

function openFile(): void {
  fileInput.value?.click();
}

function loadSample(): void {
  doc.setInput(SAMPLE_TEXT);
}

function toggleMode(): void {
  doc.mode = doc.mode === 'markdown' ? 'plain' : 'markdown';
}

function handleKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
    e.preventDefault();
    openFile();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const SAMPLE_TEXT = `# The Art of Reading

Reading is a **complex cognitive process** of decoding symbols to derive meaning. It is a form of *language processing*.

## How It Works

When we read, our brains perform several tasks simultaneously:

1. **Visual recognition** — identifying letters and words
2. **Phonological processing** — connecting text to sounds
3. **Semantic analysis** — extracting meaning from sentences
4. **Syntactic parsing** — understanding grammatical structure

> "A reader lives a thousand lives before he dies. The man who never reads lives only one." — George R.R. Martin

The average adult reads about 250 words per minute, though this varies greatly depending on the complexity of the text and the reader's familiarity with the subject.

### Code blocks are not tagged

\`\`\`javascript
const words = sentence.split(' ');
console.log(words.length);
\`\`\`

Even \`inline code\` remains uncolored — only natural language gets POS highlighting.

## Why Color Helps

Color-coding parts of speech makes the **grammatical structure** visible at a glance. Nouns, verbs, and adjectives each get their own color, much like how an IDE highlights different parts of code.

| Part of Speech | Role | Example |
|---|---|---|
| Noun | person, place, thing | cat, city, idea |
| Verb | action or state | run, think, be |
| Adjective | describes a noun | big, red, happy |
| Adverb | modifies a verb | quickly, very, well |
`;
</script>

<template>
  <div
    class="input-pane"
    :class="{ 'drag-over': isDragOver }"
    @drop="handleDrop"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
  >
    <div class="input-toolbar">
      <button
        class="toolbar-btn"
        :class="{ active: doc.mode === 'markdown' }"
        @click="toggleMode"
      >
        {{ doc.mode === 'markdown' ? 'Markdown' : 'Plain text' }}
      </button>
      <button
        class="toolbar-btn"
        title="Open file (Cmd/Ctrl+O)"
        @click="openFile"
      >
        📂 Open
      </button>
      <button
        class="toolbar-btn"
        @click="loadSample"
      >
        📝 Try a sample
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".md,.txt,.markdown"
        class="file-input-hidden"
        @change="handleFileSelect"
      >
    </div>

    <textarea
      v-model="doc.input"
      class="text-input"
      placeholder="Paste or type text here… or drag and drop a .md / .txt file"
      spellcheck="false"
    />
  </div>
</template>

<style scoped>
.input-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg);
  position: relative;
}

.input-pane.drag-over::after {
  content: 'Drop file here';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(21, 101, 192, 0.1);
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius);
  font-size: 1.25rem;
  color: var(--color-accent);
  z-index: 10;
  pointer-events: none;
}

.input-toolbar {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--color-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: all 0.15s;
}

.toolbar-btn:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.toolbar-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.file-input-hidden {
  display: none;
}

.text-input {
  flex: 1;
  padding: var(--space-md);
  border: none;
  resize: none;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

.text-input::placeholder {
  color: var(--color-muted);
}

.text-input:focus {
  outline: none;
}
</style>
