import { Box, Text } from "@mantine/core";
import type { LookupResult } from "../data/types.ts";
import { usePipeline } from "./hooks/use-pipeline.tsx";
import { ipaToPlora } from "../data/plora-map.ts";

const IPA_FONT = "'Gentium Plus', 'Lucida Sans Unicode', serif";
const PLORA_FONT = "'Plora', sans-serif";

interface WordCardProps {
  result: LookupResult;
  ipa?: string;
}

export default function WordCard({ result, ipa }: WordCardProps) {
  const { state } = usePipeline();
  const rawIpa = ipa ?? result.entries[0]?.pronunciations[0]?.ipa;
  const showWords = state.displayMode !== "ipa";
  const showIpa = state.displayMode !== "words";
  const isPlora = state.phonemeDisplay === "plora";
  const displayText = rawIpa
    ? isPlora
      ? ipaToPlora(rawIpa)
      : rawIpa
    : undefined;

  return (
    <Box px="md" py="xs">
      {showWords && (
        <Text size="2rem" fw={500} lh={1.2} mb={showIpa ? "sm" : 0}>
          {result.token.punctuation.leading}
          {result.token.text}
          {result.token.punctuation.trailing}
        </Text>
      )}
      {showIpa && (
        <Text
          size={isPlora ? "2rem" : "1.6rem"}
          c={!displayText ? "red" : "dimmed"}
          ff={isPlora ? PLORA_FONT : IPA_FONT}
          lh={1.2}
          style={isPlora ? { letterSpacing: "0.15em" } : undefined}
        >
          {displayText || "???"}
        </Text>
      )}
    </Box>
  );
}
