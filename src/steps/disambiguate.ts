import type { LookupResult, WiktionaryEntry } from "../data/types.ts";
import { pronounce, pronunciationKey } from "./pronounce.ts";
import tokenize from "./tokenize.ts";
import type { StepOptions } from "./index.ts";

// ── Word classification sets ──────────────────────────────────────

const DETERMINERS = new Set([
  "the", "a", "an", "this", "that", "these", "those",
  "my", "your", "his", "her", "its", "our", "their",
  "some", "any", "no", "every", "each", "which", "what",
]);

const SUBJECT_PRONOUNS = new Set([
  "i", "you", "he", "she", "it", "we", "they", "who",
]);

const OBJECT_PRONOUNS = new Set([
  "me", "him", "her", "us", "them", "whom",
]);

const MODALS = new Set([
  "will", "would", "shall", "should", "can", "could",
  "may", "might", "must",
]);

const AUXILIARIES = new Set([
  "do", "does", "did", "have", "has", "had",
  "am", "is", "are", "was", "were", "be", "been", "being",
]);

const ADVERBS_PREVERBAL = new Set([
  "not", "never", "always", "often", "also", "just",
  "already", "still", "only", "usually", "sometimes",
]);

// ── Types ─────────────────────────────────────────────────────────

interface DisambiguationContext {
  target: LookupResult;
  index: number;
  results: LookupResult[];
  candidatePOS: Set<string>;
}

interface GrammarRule {
  name: string;
  apply(ctx: DisambiguationContext): string | null;
}

// ── Helpers ───────────────────────────────────────────────────────

function tokenNorm(results: LookupResult[], index: number, offset: number): string | null {
  const i = index + offset;
  if (i < 0 || i >= results.length) return null;
  return results[i].token.normalized;
}

function hasPOS(results: LookupResult[], index: number, offset: number, pos: string): boolean {
  const i = index + offset;
  if (i < 0 || i >= results.length) return false;
  return results[i].entries.some((e) => e.pos === pos);
}

// ── Rules ─────────────────────────────────────────────────────────

const RULES: GrammarRule[] = [
  {
    name: "to + word -> verb",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("verb")) return null;
      return tokenNorm(results, index, -1) === "to" ? "verb" : null;
    },
  },
  {
    name: "determiner + word -> noun",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("noun")) return null;
      const prev = tokenNorm(results, index, -1);
      return prev && DETERMINERS.has(prev) ? "noun" : null;
    },
  },
  {
    name: "determiner + adjective + word -> noun",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("noun")) return null;
      const prevPrev = tokenNorm(results, index, -2);
      if (!prevPrev || !DETERMINERS.has(prevPrev)) return null;
      return hasPOS(results, index, -1, "adjective") ? "noun" : null;
    },
  },
  {
    name: "subject pronoun + word -> verb",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("verb")) return null;
      const prev = tokenNorm(results, index, -1);
      return prev && SUBJECT_PRONOUNS.has(prev) ? "verb" : null;
    },
  },
  {
    name: "subject pronoun + adverb + word -> verb",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("verb")) return null;
      const prevPrev = tokenNorm(results, index, -2);
      if (!prevPrev || !SUBJECT_PRONOUNS.has(prevPrev)) return null;
      const prev = tokenNorm(results, index, -1);
      return prev && ADVERBS_PREVERBAL.has(prev) ? "verb" : null;
    },
  },
  {
    name: "modal/auxiliary + word -> verb",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("verb")) return null;
      const prev = tokenNorm(results, index, -1);
      return prev && (MODALS.has(prev) || AUXILIARIES.has(prev)) ? "verb" : null;
    },
  },
  {
    name: "modal/auxiliary + adverb + word -> verb",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("verb")) return null;
      const prevPrev = tokenNorm(results, index, -2);
      if (!prevPrev || !(MODALS.has(prevPrev) || AUXILIARIES.has(prevPrev))) return null;
      const prev = tokenNorm(results, index, -1);
      return prev && ADVERBS_PREVERBAL.has(prev) ? "verb" : null;
    },
  },
  {
    name: "word + determiner -> verb",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("verb")) return null;
      const next = tokenNorm(results, index, 1);
      return next && DETERMINERS.has(next) ? "verb" : null;
    },
  },
  {
    name: "word + object pronoun -> verb",
    apply({ index, results, candidatePOS }) {
      if (!candidatePOS.has("verb")) return null;
      const next = tokenNorm(results, index, 1);
      return next && OBJECT_PRONOUNS.has(next) ? "verb" : null;
    },
  },
];

// ── Qualifier preference ─────────────────────────────────────────

function narrowByQualifier(entry: WiktionaryEntry, options: StepOptions): WiktionaryEntry {
  if (entry.pronunciations.length <= 1) return entry;

  let prons = entry.pronunciations;

  if (options.preferQualifier?.length) {
    const matching = prons.filter(
      (p) => p.qualifier && options.preferQualifier!.some((q) => p.qualifier!.toLowerCase().includes(q.toLowerCase())),
    );
    if (matching.length > 0) prons = matching;
  }

  if (options.preferQualifierNot?.length) {
    const matching = prons.filter(
      (p) => !p.qualifier || !options.preferQualifierNot!.some((q) => p.qualifier!.toLowerCase().includes(q.toLowerCase())),
    );
    if (matching.length > 0) prons = matching;
  }

  if (prons.length === entry.pronunciations.length) return entry;
  return { ...entry, pronunciations: prons };
}

function applyQualifierPreference(result: LookupResult, options: StepOptions): LookupResult {
  if (result.status !== "ambiguous") return result;

  // Step 1: Narrow pronunciations within entries
  let entries = result.entries.map((e) => narrowByQualifier(e, options));

  // Step 2: Filter entries — prefer entries whose pronunciations match the qualifier
  if (options.preferQualifier?.length) {
    const matching = entries.filter((e) =>
      e.pronunciations.some((p) =>
        p.qualifier && options.preferQualifier!.some((q) => p.qualifier!.toLowerCase().includes(q.toLowerCase())),
      ),
    );
    if (matching.length > 0) entries = matching;
  }
  if (options.preferQualifierNot?.length) {
    const matching = entries.filter((e) =>
      e.pronunciations.some((p) =>
        !p.qualifier || !options.preferQualifierNot!.some((q) => p.qualifier!.toLowerCase().includes(q.toLowerCase())),
      ),
    );
    if (matching.length > 0) entries = matching;
  }

  // Did anything actually change?
  const changed = entries.length !== result.entries.length || entries.some((e, i) => e !== result.entries[i]);
  if (!changed) return result;

  // Re-check: do all entries with pronunciations now share a common IPA?
  const withPron = entries.filter((e) => e.pronunciations.length > 0);
  if (withPron.length <= 1) {
    return { ...result, entries, status: "resolved" as const, disambiguatedBy: "qualifier preference" };
  }

  const ipaSets = withPron.map((e) => new Set(e.pronunciations.map((p) => p.ipa)));
  const shared = [...ipaSets[0]].some((ipa) => ipaSets.every((s) => s.has(ipa)));
  if (shared) {
    return { ...result, entries, status: "resolved" as const, disambiguatedBy: "qualifier preference" };
  }

  // Narrowed but still ambiguous — annotate that something changed
  return { ...result, entries, disambiguatedBy: "qualifier preference (narrowed)" };
}

// ── Core disambiguation ──────────────────────────────────────────

export function disambiguate(results: LookupResult[], options?: StepOptions): LookupResult[] {
  const afterRules = results.map((result, index) => {
    if (result.status !== "ambiguous") return result;

    const candidatePOS = new Set(result.entries.map((e) => e.pos));
    const ctx: DisambiguationContext = { target: result, index, results, candidatePOS };

    for (const rule of RULES) {
      const pos = rule.apply(ctx);
      if (pos === null) continue;

      const filtered = result.entries.filter((e) => e.pos === pos);
      if (filtered.length === 0) continue;

      const pronKeys = new Set(filtered.map(pronunciationKey));
      if (pronKeys.size <= 1) {
        return {
          ...result,
          status: "resolved" as const,
          entries: filtered,
          disambiguatedBy: rule.name,
        };
      }

      // POS matched but pronunciation still ambiguous (e.g. "read")
      return {
        ...result,
        entries: filtered,
        disambiguatedBy: `${rule.name} (narrowed)`,
      };
    }

    return result;
  });

  // Apply qualifier preferences as tiebreaker
  if (options?.preferQualifier?.length || options?.preferQualifierNot?.length) {
    return afterRules.map((r) => applyQualifierPreference(r, options));
  }

  return afterRules;
}

// ── Step entry point ─────────────────────────────────────────────

export default async function disambiguateStep(input: string, options?: StepOptions) {
  const tokens = tokenize(input);
  const pronounced = await pronounce(tokens, options);
  return disambiguate(pronounced, options);
}
