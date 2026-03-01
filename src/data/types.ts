export interface Token {
  text: string;
  position: number;
  normalized: string;
  punctuation: {
    leading: string;
    trailing: string;
  };
}

export interface Pronunciation {
  ipa: string;
  accent?: string;
}

export interface Definition {
  definition: string;
  labels: string[];
}

export interface WiktionaryEntry {
  word: string;
  pos: string;
  pronunciations: Pronunciation[];
  definitions: Record<string, Definition[]>;
}
