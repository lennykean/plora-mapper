import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Box, Text, Stack, Paper } from "@mantine/core";
import type { LookupResult, WiktionaryEntry, Audio } from "../data/types.ts";
import PronunciationOption from "./PronunciationOption.tsx";
import { usePipeline } from "./hooks/use-pipeline.tsx";

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

interface AmbiguousCardProps {
  result: LookupResult;
  onSelect: (entryIndex: number) => void;
}

export default function AmbiguousCard({ result, onSelect }: AmbiguousCardProps) {
  const { state } = usePipeline();
  const [opened, setOpened] = useState(false);
  const uniqueIpas = new Set(result.entries.map((e) => e.pronunciations[0]?.ipa).filter(Boolean));
  const showWords = state.displayMode !== "ipa";
  const showIpa = state.displayMode !== "words";
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!opened) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpened(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [opened]);

  useLayoutEffect(() => {
    if (!opened || !dropdownRef.current) return;
    const el = dropdownRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = "auto";
      el.style.right = "0";
    }
  }, [opened]);

  return (
    <Box px="md" py="xs" pos="relative" ref={dropdownRef}>
      <div onClick={() => setOpened((o) => !o)} style={{ cursor: "pointer" }}>
        {showWords && (
          <Text size="2rem" fw={500} lh={1.2} mb={showIpa ? "sm" : 0} td="underline" style={{ textDecorationStyle: "dotted" }}>
            {result.token.punctuation.leading}{result.token.text}{result.token.punctuation.trailing}
          </Text>
        )}
        {showIpa && (
          <Text size="lg" c="red" ff="'Gentium Plus', 'Lucida Sans Unicode', serif" lh={1.2}>
            ×{uniqueIpas.size}
          </Text>
        )}
      </div>

      {opened && (
        <Paper
          shadow="md"
          p="sm"
          withBorder
          style={{ position: "absolute", zIndex: 100, top: "100%", left: 0, width: 400 }}
        >
          <Text size="md" fw={600} mb="xs">Disambiguate "{result.token.text}"</Text>
          <Stack gap={0}>
            {groupByIpa(result.entries).map((group) => (
              <PronunciationOption
                key={group.ipa}
                ipa={group.ipa}
                entries={group.entries}
                audio={group.audio}
                onSelect={() => {
                  onSelect(group.firstIndex);
                  setOpened(false);
                }}
              />
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
