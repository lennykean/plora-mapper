import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { WiktionaryEntry } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DICT_PATH = resolve(__dirname, "../../data/cmudict.dict");

// ARPABET base phonemes -> IPA (without stress)
const ARPABET_TO_IPA: Record<string, string> = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ",
  B: "b", CH: "tʃ", D: "d", DH: "ð", EH: "ɛ", ER: "ɝ", EY: "eɪ",
  F: "f", G: "ɡ", HH: "h", IH: "ɪ", IY: "i", JH: "dʒ",
  K: "k", L: "l", M: "m", N: "n", NG: "ŋ",
  OW: "oʊ", OY: "ɔɪ", P: "p", R: "ɹ", S: "s", SH: "ʃ",
  T: "t", TH: "θ", UH: "ʊ", UW: "u", V: "v", W: "w",
  Y: "j", Z: "z", ZH: "ʒ",
};

// Unstressed vowel reductions
const UNSTRESSED_OVERRIDES: Record<string, string> = {
  AH: "ə",
  ER: "ɚ",
};

export function arpabetToIPA(phonemes: string): string {
  const parts = phonemes.trim().split(/\s+/);
  let ipa = "";

  for (const part of parts) {
    // Extract stress digit from end of vowel phonemes (e.g. "AH0" -> "AH", "0")
    const stressMatch = part.match(/^([A-Z]+)([012])$/);
    if (stressMatch) {
      const [, base, stress] = stressMatch;
      const stressMarker = stress === "1" ? "ˈ" : stress === "2" ? "ˌ" : "";
      const vowel = stress === "0" && UNSTRESSED_OVERRIDES[base]
        ? UNSTRESSED_OVERRIDES[base]
        : ARPABET_TO_IPA[base];
      if (vowel) {
        ipa += stressMarker + vowel;
      }
    } else {
      // Consonant (no stress digit)
      const consonant = ARPABET_TO_IPA[part];
      if (consonant) {
        ipa += consonant;
      }
    }
  }

  return `/${ipa}/`;
}

// Lazy-loaded dictionary: word -> array of phoneme strings (one per variant)
let dict: Map<string, string[]> | null = null;

function ensureDict(): Map<string, string[]> {
  if (dict) return dict;

  dict = new Map();
  if (!existsSync(DICT_PATH)) return dict;

  const content = readFileSync(DICT_PATH, "utf-8");

  for (const line of content.split("\n")) {
    if (!line || line.startsWith(";;;")) continue;

    // Format: "WORD  PH1 PH2 PH3" or "WORD(2)  PH1 PH2 PH3"
    const spaceIdx = line.indexOf(" ");
    if (spaceIdx === -1) continue;

    let word = line.slice(0, spaceIdx);
    const phonemes = line.slice(spaceIdx).trim();

    // Strip variant suffix: "WORD(2)" -> "WORD"
    word = word.replace(/\(\d+\)$/, "").toLowerCase();

    const existing = dict.get(word);
    if (existing) {
      existing.push(phonemes);
    } else {
      dict.set(word, [phonemes]);
    }
  }

  return dict;
}

export function cmuLookup(word: string): WiktionaryEntry[] {
  const normalized = word.toLowerCase();
  const d = ensureDict();
  const variants = d.get(normalized);
  if (!variants) return [];

  return variants.map((phonemes) => ({
    word: normalized,
    pos: "unknown",
    pronunciations: [{
      ipa: arpabetToIPA(phonemes),
      notation: "phonemic" as const,
      accent: "GA",
    }],
    audio: [],
    definitions: {
      "": [{ definition: "(CMU Pronouncing Dictionary)", labels: ["cmu"] }],
    },
  }));
}
