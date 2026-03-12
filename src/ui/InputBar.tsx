import { Textarea, Button, Group } from "@mantine/core";
import { useState } from "react";
import { usePipeline } from "./hooks/use-pipeline.tsx";

export default function InputBar() {
  const { state, submit } = usePipeline();
  const [draftText, setDraftText] = useState("");

  function handleSubmit() {
    const trimmed = draftText.trim();
    if (!trimmed) return;
    submit(trimmed);
  }

  return (
    <Group align="flex-end" gap="sm">
      <Textarea
        placeholder="Enter text..."
        value={draftText}
        onChange={(e) => setDraftText(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        disabled={state.loading}
        autosize
        minRows={2}
        maxRows={6}
        style={{ flex: 1 }}
      />
      <Button onClick={handleSubmit} loading={state.loading}>
        Map
      </Button>
    </Group>
  );
}
