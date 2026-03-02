import { Box, Text } from "@mantine/core";
import type { LookupResult } from "../data/types.ts";
import { usePipeline } from "./hooks/use-pipeline.tsx";

interface WordCardProps {
  result: LookupResult;
  ipa?: string;
}

export default function WordCard({ result, ipa }: WordCardProps) {
  const { state } = usePipeline();
  const displayIpa = ipa ?? result.entries[0]?.pronunciations[0]?.ipa;
  const showWords = state.displayMode !== "ipa";
  const showIpa = state.displayMode !== "words";

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
          size="lg"
          c={!displayIpa ? "red" : "dimmed"}
          ff="'Gentium Plus', 'Lucida Sans Unicode', serif"
          lh={1.2}
        >
          {displayIpa || "???"}
        </Text>
      )}
    </Box>
  );
}
