import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Box, Text, TextInput, Paper, Button, Group } from "@mantine/core";
import type { LookupResult } from "../data/types.ts";
import { usePipeline } from "./hooks/use-pipeline.tsx";
import { ipaToPlora } from "../data/plora-map.ts";

const IPA_FONT = "'Gentium Plus', 'Lucida Sans Unicode', serif";
const PLORA_FONT = "'Plora', sans-serif";

interface UnknownCardProps {
  result: LookupResult;
  manualIpa?: string;
  onSetIpa: (ipa: string) => void;
}

export default function UnknownCard({
  result,
  manualIpa,
  onSetIpa,
}: UnknownCardProps) {
  const { state } = usePipeline();
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState(manualIpa ?? "");
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

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed) {
      onSetIpa(trimmed);
    }
    setOpened(false);
  }

  return (
    <Box px="md" py="xs" pos="relative" ref={containerRef}>
      <div
        onClick={() => {
          setOpened((o) => {
            if (!o) setDraft(manualIpa ?? "");
            return !o;
          });
        }}
        style={{ cursor: "pointer" }}
      >
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
            size={state.phonemeDisplay === "plora" ? "2rem" : "1.6rem"}
            c="red"
            ff={state.phonemeDisplay === "plora" ? PLORA_FONT : IPA_FONT}
            lh={1.2}
            style={
              state.phonemeDisplay === "plora"
                ? { letterSpacing: "0.15em" }
                : undefined
            }
          >
            {manualIpa
              ? state.phonemeDisplay === "plora"
                ? ipaToPlora(manualIpa)
                : manualIpa
              : "???"}
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
            width: 300,
          }}
        >
          <Text size="md" fw={600} mb="xs">
            IPA for "{result.token.text}"
          </Text>
          <TextInput
            placeholder="Enter IPA..."
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
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
