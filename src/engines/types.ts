import type { TaggedToken } from '../core/upos';

/** Metadata describing a tagger engine. */
export interface EngineMeta {
  /** Unique engine identifier, e.g. 'wink-en', 'jieba-zh'. */
  id: string;
  /** Human-readable label, e.g. 'English (fast)'. */
  label: string;
  /** ISO 639-1 language codes this engine supports. */
  languages: string[];
  /** Tier 1 = bundled JS/WASM, Tier 2 = downloadable ONNX model. */
  tier: 1 | 2;
  /** Approximate download size in bytes (0 for bundled Tier 1). */
  downloadBytes: number;
}

/** Interface every tagger engine must implement. */
export interface TaggerEngine {
  readonly meta: EngineMeta;
  /** Load model/dictionary. Call before `tag()`. */
  load(onProgress?: (loadedBytes: number, totalBytes: number) => void): Promise<void>;
  /** Whether the engine has been loaded and is ready to tag. */
  isLoaded(): boolean;
  /** Tag a single text segment, returning tokens with UPOS tags and offsets. */
  tag(text: string): Promise<TaggedToken[]>;
  /** Free memory (Tier-2 engines). */
  dispose?(): void;
}

/** Registry for discovering and resolving engines by language. */
export interface EngineRegistry {
  /** List metadata for all known engines. */
  list(): EngineMeta[];
  /** Find the best engine for a language. */
  resolve(lang: string, prefer?: 'fast' | 'accurate'): EngineMeta | undefined;
  /** Get (lazy-load) an engine instance by id. */
  get(id: string): Promise<TaggerEngine>;
}

export type { TaggedToken };
