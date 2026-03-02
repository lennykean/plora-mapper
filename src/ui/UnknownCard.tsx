import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Box, Text, TextInput, Paper, Button, Group } from "@mantine/core";
import type { LookupResult } from "../data/types.ts";
import { usePipeline } from "./hooks/use-pipeline.tsx";

interface UnknownCardProps {
  result: LookupResult;
  manualIpa?: string;
  onSetIpa: (ipa: string) => void;
}

export default function UnknownCard({ result, manualIpa, onSetIpa }: UnknownCardProps) {
  const { state } = usePipeline();
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState(manualIpa ?? "");
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

  useEffect(() => {
    if (opened) setDraft(manualIpa ?? "");
  }, [opened, manualIpa]);

  useLayoutEffect(() => {
    if (!opened || !dropdownRef.current) return;
    const el = dropdownRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = "auto";
      el.style.right = "0";
    }
  }, [opened]);

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed) {
      onSetIpa(trimmed);
    }
    setOpened(false);
  }

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
            {manualIpa || "???"}
          </Text>
        )}
      </div>

      {opened && (
        <Paper
          shadow="md"
          p="sm"
          withBorder
          style={{ position: "absolute", zIndex: 100, top: "100%", left: 0, width: 300 }}
        >
          <Text size="md" fw={600} mb="xs">IPA for "{result.token.text}"</Text>
          <TextInput
            placeholder="Enter IPA..."
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            size="sm"
            ff="'Gentium Plus', 'Lucida Sans Unicode', serif"
            autoFocus
          />
          <Group mt="xs" justify="flex-end">
            <Button size="compact-sm" variant="light" onClick={handleSave}>
              Save
            </Button>
          </Group>
        </Paper>
      )}
    </Box>
  );
}
