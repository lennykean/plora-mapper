// Maps IPA phoneme symbols to PLORA font QWERTY keys.
// When rendered with the Plora font, each key displays the corresponding glyph.

const IPA_TO_PLORA: Record<string, string> = {
  // Short vowels
  æ: "a",
  ɛ: "e",
  ɪ: "i",
  ɒ: "o",
  ʌ: "u",
  ʊ: "q",

  // Long vowels (with and without length mark ː)
  iː: "E",
  ɑː: "R",
  ɔːɹ: "L", // OR (corn, more, floor) — must be before ɔː
  ɔːr: "L",
  oːɹ: "L", // alternate OR (door, four)
  oːr: "L",
  ɔː: "B",
  oː: "B", // alternate AW
  uː: "Q",
  ɜː: "M",
  ɜ: "M", // bare ER (e.g. "first" /fɜst/)

  // GA short vowels without length marks
  ɑ: "R", // /ɑ/ in GA = RP /ɑː/ (car, father)
  ɔɹ: "L", // OR without length mark
  ɔr: "L",
  ɔ: "B", // /ɔ/ in GA = RP /ɔː/ (saw)

  // Diphthongs
  eɪ: "A",
  aɪ: "I",
  ɔɪ: "Y",
  əʊ: "O",
  oʊ: "O", // GA variant of əʊ
  aʊ: "W",
  ɪə: "c",
  eə: "F",
  ɛə: "F", // alternate spelling of eə
  ʊə: "U",

  // Stops
  p: "p",
  b: "b",
  t: "t",
  d: "d",
  k: "k",
  ɡ: "g",
  g: "g",

  // Fricatives
  f: "f",
  v: "v",
  θ: "T",
  ð: "D",
  s: "s",
  z: "z",
  ʃ: "S",
  ʒ: "Z",
  h: "h",

  // Affricates
  tʃ: "C",
  dʒ: "j",

  // Nasals
  m: "m",
  n: "n",
  ŋ: "N",

  // Approximants
  l: "l",
  r: "r",
  ɹ: "r",
  w: "w",
  j: "y",

  // Schwa + r = ER (must be before bare schwa)
  əɹ: "M", // unstressed -er (mover, butter)
  ər: "M",
  ɚ: "M", // rhotic schwa (GA spelling of əɹ)
  ɝ: "M", // rhotic ER (GA spelling of ɜːɹ)

  // Schwa
  ə: "@",
};

// Sort keys longest-first so multi-char sequences match before single chars
const SORTED_KEYS = Object.keys(IPA_TO_PLORA).sort(
  (a, b) => b.length - a.length,
);

/**
 * Convert an IPA string (e.g. "/ˈkæt/") to PLORA font characters.
 * Strips slashes, brackets, and stress marks; maps each phoneme to its glyph.
 * Unknown phonemes are passed through unchanged.
 */
export function ipaToPlora(ipa: string): string {
  // Strip notation delimiters, stress marks, tie bars, diacritics,
  // and parenthesized optional segments like (ɹ)
  let remaining = ipa
    .replace(/^[/[\]]+|[/[\]]+$/g, "")
    .replace(/[ˈˌ.]/g, "")
    .replace(/\u0361/g, "") // tie bar (t͡ʃ → tʃ)
    .replace(/\u032F/g, "") // non-syllabic mark (eɪ̯ → eɪ)
    .replace(/\u0329/g, "") // syllabic mark (n̩ → n)
    .replace(/\u0308/g, "") // diaeresis (ɪ̈ → ɪ, e.g. "his" /hɪ̈z/)
    .replace(/\(([^)]*)\)/g, "$1"); // unwrap optional segments like (ɹ) → ɹ
  let result = "";

  while (remaining.length > 0) {
    let matched = false;
    for (const key of SORTED_KEYS) {
      if (remaining.startsWith(key)) {
        result += IPA_TO_PLORA[key];
        remaining = remaining.slice(key.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Pass through unmapped characters
      result += remaining[0];
      remaining = remaining.slice(1);
    }
  }

  return result;
}
