import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Box, Text, Stack, Paper } from "@mantine/core";
import type { LookupResult } from "../data/types.ts";
import PronunciationOption from "./PronunciationOption.tsx";
import { usePipeline } from "./hooks/use-pipeline.tsx";
import { groupByIpa } from "./ipa-groups.ts";

interface AmbiguousCardProps {
  result: LookupResult;
  onSelect: (entryIndex: number) => void;
}

export default function AmbiguousCard({
  result,
  onSelect,
}: AmbiguousCardProps) {
  const { state } = usePipeline();
  const [opened, setOpened] = useState(false);
  const uniqueIpas = new Set(
    result.entries.map((e) => e.pronunciations[0]?.ipa).filter(Boolean),
  );
  const showWords = state.displayMode !== "ipa";
  const showIpa = state.displayMode !== "words";
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!opened) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpened(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [opened]);

  useLayoutEffect(() => {
    if (!opened || !popoverRef.current) return;
    const el = popoverRef.current;
    el.style.left = "";
    el.style.right = "";
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = "auto";
      el.style.right = "0";
    }
  }, [opened]);

  return (
    <Box px="md" py="xs" pos="relative" ref={containerRef}>
      <div onClick={() => setOpened((o) => !o)} style={{ cursor: "pointer" }}>
        {showWords && (
          <Text
            size="2rem"
            fw={500}
            lh={1.2}
            mb={showIpa ? "sm" : 0}
            td="underline"
            style={{ textDecorationStyle: "dotted" }}
          >
            {result.token.punctuation.leading}
            {result.token.text}
            {result.token.punctuation.trailing}
          </Text>
        )}
        {showIpa && (
          <Text
            size="lg"
            c="red"
            ff="'Gentium Plus', 'Lucida Sans Unicode', serif"
            lh={1.2}
          >
            ×{uniqueIpas.size}
          </Text>
        )}
      </div>

      {opened && (
        <Paper
          ref={popoverRef}
          shadow="md"
          p="sm"
          withBorder
          style={{
            position: "absolute",
            zIndex: 100,
            top: "100%",
            left: 0,
            width: 400,
          }}
        >
          <Text size="md" fw={600} mb="xs">
            Disambiguate "{result.token.text}"
          </Text>
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
