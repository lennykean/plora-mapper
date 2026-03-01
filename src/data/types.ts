export interface Token {
  text: string;
  position: number;
  normalized: string;
  punctuation: {
    leading: string;
    trailing: string;
  };
}

export interface Audio {
  url: string;
  accent?: string;
  ipa?: string;
}

export interface Pronunciation {
  ipa: string;
  notation: "phonemic" | "phonetic";
  accent?: string;
  qualifier?: string;
}

export interface Definition {
  definition: string;
  labels: string[];
}

export interface WiktionaryEntry {
  word: string;
  pos: string;
  pronunciations: Pronunciation[];
  audio: Audio[];
  definitions: Record<string, Definition[]>;
}

export interface LookupResult {
  status: "resolved" | "ambiguous" | "unknown";
  token: Token;
  entries: WiktionaryEntry[];
  disambiguatedBy?: string;
}
