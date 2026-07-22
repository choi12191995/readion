import * as Comlink from 'comlink';
import type { TaggerWorkerApi } from './tagger.worker';
import type { EngineMeta } from '../engines/types';
import type { TextSegment } from '../core/markdown';
import type { TaggedToken } from '../core/upos';

/**
 * Main-thread wrapper for the tagger worker.
 * Handles Comlink setup, crash recovery, and provides a clean API.
 */
export class TaggerClient {
  private worker: Worker | null = null;
  private proxy: Comlink.Remote<TaggerWorkerApi> | null = null;
  private retryCount = 0;
  private readonly maxRetries = 1;

  /** Create (or recreate) the worker. */
  private createWorker(): void {
    this.worker?.terminate();
    this.worker = new Worker(
      new URL('./tagger.worker.ts', import.meta.url),
      { type: 'module' },
    );
    this.proxy = Comlink.wrap<TaggerWorkerApi>(this.worker);
    this.retryCount = 0;
  }

  /** Ensure the worker is alive. */
  private ensureWorker(): Comlink.Remote<TaggerWorkerApi> {
    if (!this.proxy) this.createWorker();
    return this.proxy!;
  }

  /** Detect language of a text sample. */
  async detectLanguage(sample: string): Promise<{ lang: string; confidence: number }> {
    return this.withRetry(() => this.ensureWorker().detectLanguage(sample));
  }

  /** List all known engines. */
  async listEngines(): Promise<EngineMeta[]> {
    return this.withRetry(() => this.ensureWorker().listEngines());
  }

  /** Load an engine (download if needed). */
  async loadEngine(id: string): Promise<void> {
    return this.withRetry(() => this.ensureWorker().loadEngine(id));
  }

  /** Delete cached data for a Tier-2 engine. */
  async deleteEngineCache(id: string): Promise<void> {
    return this.withRetry(() => this.ensureWorker().deleteEngineCache(id));
  }

  /** Tag segments with streaming per-segment callbacks. */
  async tagSegments(
    jobId: number,
    engineId: string,
    segments: TextSegment[],
    onResult: (segmentId: string, tags: TaggedToken[]) => void,
  ): Promise<void> {
    return this.withRetry(() =>
      this.ensureWorker().tagSegments(
        jobId,
        engineId,
        segments,
        Comlink.proxy(onResult),
      ),
    );
  }

  /** Register a download progress callback. */
  async onDownloadProgress(
    cb: (engineId: string, loaded: number, total: number) => void,
  ): Promise<void> {
    this.ensureWorker().onDownloadProgress(Comlink.proxy(cb));
  }

  /** Terminate the worker. */
  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.proxy = null;
  }

  /** Retry once on worker crash, then re-throw. */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.warn('Worker crashed, restarting...', err);
        this.createWorker();
        return fn();
      }
      throw err;
    }
  }
}

/** Singleton client instance. */
let client: TaggerClient | null = null;

export function getTaggerClient(): TaggerClient {
  if (!client) client = new TaggerClient();
  return client;
}
