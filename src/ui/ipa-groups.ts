import type { WiktionaryEntry, Audio } from "../data/types.ts";

export interface IpaGroup {
  ipa: string;
  entries: WiktionaryEntry[];
  audio?: Audio;
  firstIndex: number;
}

export function groupByIpa(entries: WiktionaryEntry[]): IpaGroup[] {
  const groups = new Map<string, IpaGroup>();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const ipa = entry.pronunciations[0]?.ipa ?? "???";
    let group = groups.get(ipa);
    if (!group) {
      group = { ipa, entries: [], audio: undefined, firstIndex: i };
      groups.set(ipa, group);
    }
    group.entries.push(entry);
    if (!group.audio && entry.audio[0]) {
      group.audio = entry.audio[0];
    }
  }
  return [...groups.values()];
}
