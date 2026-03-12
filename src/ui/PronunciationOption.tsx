import { Box, Button, Group, Text, Badge } from "@mantine/core";
import type { WiktionaryEntry, Audio } from "../data/types.ts";
import AudioButton from "./AudioButton.tsx";
import { usePipeline } from "./hooks/use-pipeline.tsx";
import { ipaToPlora } from "../data/plora-map.ts";

const IPA_FONT = "'Gentium Plus', 'Lucida Sans Unicode', serif";
const PLORA_FONT = "'Plora', sans-serif";

interface PronunciationOptionProps {
  ipa: string;
  entries: WiktionaryEntry[];
  audio?: Audio;
  onSelect: () => void;
}

export default function PronunciationOption({
  ipa,
  entries,
  audio,
  onSelect,
}: PronunciationOptionProps) {
  const { state } = usePipeline();
  const isPlora = state.phonemeDisplay === "plora";

  return (
    <Box
      p="sm"
      style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
    >
      <Group gap="xs" mb="xs">
        <Text
          size={isPlora ? "xl" : "1.2rem"}
          fw={500}
          ff={isPlora ? PLORA_FONT : IPA_FONT}
          style={isPlora ? { letterSpacing: "0.15em" } : undefined}
        >
          {isPlora ? ipaToPlora(ipa) : ipa}
        </Text>
        {audio && <AudioButton url={audio.url} />}
      </Group>

      {entries.map((entry, i) => {
        const firstDef = Object.values(entry.definitions).flat()[0];
        return (
          <Group key={i} gap="xs" mb={4} align="flex-start" wrap="nowrap">
            <Badge size="md" variant="light" style={{ flexShrink: 0 }}>
              {entry.pos}
            </Badge>
            {firstDef && (
              <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                {firstDef.definition}
              </Text>
            )}
          </Group>
        );
      })}

      <Button size="compact-sm" variant="light" onClick={onSelect} mt="xs">
        Select
      </Button>
    </Box>
  );
}
