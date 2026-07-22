import * as Comlink from 'comlink';
import { detectLanguage } from '../core/lang-detect';
import { registry } from '../engines/registry';
import type { EngineMeta } from '../engines/types';
import type { TextSegment } from '../core/markdown';
import type { TaggedToken } from '../core/upos';

let currentJobId = -1;
let downloadProgressCb: ((engineId: string, loaded: number, total: number) => void) | null = null;

const api = {
  async detectLanguage(sample: string): Promise<{ lang: string; confidence: number }> {
    return detectLanguage(sample);
  },

  listEngines(): EngineMeta[] {
    return registry.list();
  },

  async loadEngine(id: string): Promise<void> {
    const engine = await registry.get(id);
    if (!engine.isLoaded()) {
      await engine.load((loaded, total) => {
        if (downloadProgressCb) {
          downloadProgressCb(id, loaded, total);
        }
      });
    }
  },

  async deleteEngineCache(_id: string): Promise<void> {
    // Tier-2 ONNX cache deletion — placeholder for now
    // Would use Cache API to clear transformers-cache entries
  },

  async tagSegments(
    jobId: number,
    engineId: string,
    segments: TextSegment[],
    onResult: (segmentId: string, tags: TaggedToken[]) => void,
  ): Promise<void> {
    currentJobId = jobId;
    const engine = await registry.get(engineId);

    if (!engine.isLoaded()) {
      await engine.load();
    }

    for (const segment of segments) {
      // Check if this job has been superseded
      if (currentJobId !== jobId) return;

      try {
        const tags = await engine.tag(segment.text);
        // Check again after async work
        if (currentJobId !== jobId) return;
        onResult(segment.id, tags);
      } catch (err) {
        console.error(`Tagging failed for segment ${segment.id}:`, err);
        // Deliver empty tags so the segment renders uncolored
        if (currentJobId === jobId) {
          onResult(segment.id, []);
        }
      }
    }
  },

  onDownloadProgress(cb: (engineId: string, loaded: number, total: number) => void): void {
    downloadProgressCb = cb;
  },
};

Comlink.expose(api);

export type TaggerWorkerApi = typeof api;
