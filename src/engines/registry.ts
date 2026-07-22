import type { EngineMeta, TaggerEngine, EngineRegistry } from './types';

/** Metadata for all known engines. Engines are lazy-loaded on first `get()`. */
const ENGINE_META: EngineMeta[] = [
  {
    id: 'wink-en',
    label: 'English (fast)',
    languages: ['en'],
    tier: 1,
    downloadBytes: 0,
  },
  {
    id: 'jieba-zh',
    label: 'Chinese (jieba)',
    languages: ['zh'],
    tier: 1,
    downloadBytes: 0,
  },
  {
    id: 'kuromoji-ja',
    label: 'Japanese (kuromoji)',
    languages: ['ja'],
    tier: 1,
    downloadBytes: 17_000_000,
  },
];

type EngineLoader = () => Promise<{ default: new () => TaggerEngine } | { createEngine: () => TaggerEngine }>;

const ENGINE_LOADERS: Record<string, EngineLoader> = {
  'wink-en': () => import('./wink-en'),
  'jieba-zh': () => import('./jieba-zh'),
  'kuromoji-ja': () => import('./kuromoji-ja'),
};

const instanceCache = new Map<string, TaggerEngine>();

export const registry: EngineRegistry = {
  list(): EngineMeta[] {
    return [...ENGINE_META];
  },

  resolve(lang: string, prefer: 'fast' | 'accurate' = 'fast'): EngineMeta | undefined {
    const matches = ENGINE_META.filter((m) => m.languages.includes(lang));
    if (matches.length === 0) return undefined;

    if (prefer === 'accurate') {
      // Prefer Tier 2 (neural), fall back to Tier 1
      const tier2 = matches.find((m) => m.tier === 2);
      return tier2 ?? matches[0];
    }
    // Prefer Tier 1 (fast/bundled)
    const tier1 = matches.find((m) => m.tier === 1);
    return tier1 ?? matches[0];
  },

  async get(id: string): Promise<TaggerEngine> {
    const cached = instanceCache.get(id);
    if (cached) return cached;

    const loader = ENGINE_LOADERS[id];
    if (!loader) throw new Error(`Unknown engine: ${id}`);

    const mod = await loader() as Record<string, unknown>;
    let engine: TaggerEngine;

    if ('createEngine' in mod && typeof mod['createEngine'] === 'function') {
      engine = (mod['createEngine'] as () => TaggerEngine)();
    } else if ('default' in mod) {
      const Ctor = mod['default'] as new () => TaggerEngine;
      engine = new Ctor();
    } else {
      throw new Error(`Engine module ${id} has no default export or createEngine()`);
    }

    instanceCache.set(id, engine);
    return engine;
  },
};
