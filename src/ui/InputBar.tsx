import { Textarea } from "@mantine/core";
import { usePipeline } from "./hooks/use-pipeline.tsx";

export default function InputBar() {
  const { state, setDraftText, submit } = usePipeline();

  function handleSubmit() {
    const trimmed = state.draftText.trim();
    if (!trimmed) return;
    submit(trimmed);
  }

  return (
    <Textarea
      placeholder="Enter text..."
      value={state.draftText}
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
    />
  );
}
