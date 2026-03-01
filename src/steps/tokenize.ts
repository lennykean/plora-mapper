import type { Token } from "../data/types.ts";

const LEADING_PUNCT = /^[^\w']+/;
const TRAILING_PUNCT = /[^\w']+$/;

export default function tokenize(input: string): Token[] {
  const chunks = input.split(/\s+/).filter(Boolean);
  const tokens: Token[] = [];

  for (const chunk of chunks) {
    const leadingMatch = chunk.match(LEADING_PUNCT);
    const trailingMatch = chunk.match(TRAILING_PUNCT);
    const leading = leadingMatch?.[0] ?? "";
    const trailing = trailingMatch?.[0] ?? "";

    const text = chunk.slice(leading.length, chunk.length - (trailing.length || 0));
    if (!text) continue;

    tokens.push({
      text,
      position: tokens.length,
      normalized: text.toLowerCase(),
      punctuation: { leading, trailing },
    });
  }

  return tokens;
}
