/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    unknown
  >;
  export default component;
}

declare module 'wink-nlp' {
  const winkNLP: (model: unknown) => WinkNLP;
  export default winkNLP;

  interface WinkNLP {
    readDoc(text: string): WinkDoc;
    its: WinkIts;
    as: WinkAs;
  }

  interface WinkDoc {
    tokens(): WinkTokens;
    sentences(): WinkSentences;
  }

  interface WinkTokens {
    each(cb: (token: WinkToken) => void): void;
    out(itsMethod: unknown): unknown[];
    filter(cb: (token: WinkToken) => boolean): WinkTokens;
    length(): number;
    itemAt(index: number): WinkToken;
  }

  interface WinkSentences {
    each(cb: (sentence: WinkSentence) => void): void;
    length(): number;
  }

  interface WinkToken {
    out(itsMethod?: unknown): string;
    parentSentence(): WinkSentence;
    index(): number;
  }

  interface WinkSentence {
    tokens(): WinkTokens;
    out(): string;
  }

  interface WinkIts {
    pos: symbol;
    value: symbol;
    normal: symbol;
    type: symbol;
    span: symbol;
  }

  interface WinkAs {
    array: symbol;
    freqTable: symbol;
  }
}

declare module 'wink-eng-lite-web-model' {
  const model: unknown;
  export default model;
}

declare module 'franc-min' {
  export function franc(text: string, options?: { minLength?: number; only?: string[] }): string;
}

declare module 'jieba-wasm' {
  export function cut(text: string, hmm?: boolean): string[];
  export function tag(text: string): Array<{ word: string; tag: string }>;
  export function init(): Promise<void>;
  export default function init(): Promise<void>;
}

declare module 'kuromoji' {
  interface KuromojiToken {
    surface_form: string;
    pos: string;
    pos_detail_1: string;
    pos_detail_2: string;
    pos_detail_3: string;
    word_position: number;
    basic_form: string;
    reading: string;
    pronunciation: string;
  }

  interface Tokenizer {
    tokenize(text: string): KuromojiToken[];
  }

  interface Builder {
    build(callback: (err: Error | null, tokenizer: Tokenizer) => void): void;
  }

  function builder(options: { dicPath: string }): Builder;
  export default { builder };
}

interface ImportMeta {
  readonly env: {
    readonly VITE_MODELS_BASE_URL?: string;
    readonly MODE: string;
    readonly BASE_URL: string;
    readonly PROD: boolean;
    readonly DEV: boolean;
  };
}
