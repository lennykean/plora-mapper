import { Box, Button, Group, Text, Badge } from "@mantine/core";
import type { WiktionaryEntry, Audio } from "../data/types.ts";
import AudioButton from "./AudioButton.tsx";

interface PronunciationOptionProps {
  ipa: string;
  entries: WiktionaryEntry[];
  audio?: Audio;
  onSelect: () => void;
}

export default function PronunciationOption({ ipa, entries, audio, onSelect }: PronunciationOptionProps) {
  return (
    <Box p="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
      <Group gap="xs" mb="xs">
        <Text size="md" fw={500} ff="'Gentium Plus', 'Lucida Sans Unicode', serif">
          {ipa}
        </Text>
        {audio && <AudioButton url={audio.url} />}
      </Group>

      {entries.map((entry, i) => {
        const firstDef = Object.values(entry.definitions).flat()[0];
        return (
          <Group key={i} gap="xs" mb={4} align="flex-start">
            <Badge size="md" variant="light" style={{ flexShrink: 0 }}>{entry.pos}</Badge>
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
