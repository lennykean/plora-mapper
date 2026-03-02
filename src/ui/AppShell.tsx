import { Box, Container, Alert } from "@mantine/core";
import { usePipeline } from "./hooks/use-pipeline.tsx";
import InputBar from "./InputBar.tsx";
import ControlPanel from "./ControlPanel.tsx";
import WordGrid from "./WordGrid.tsx";

export default function AppShell() {
  const { state } = usePipeline();

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Box
        p="md"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Container size="lg">
          <InputBar />
          <ControlPanel />
        </Container>
      </Box>

      <Box style={{ flex: 1, overflowY: "auto" }} p="md">
        <Container size="lg">
          {state.error && (
            <Alert color="red" mb="md">
              {state.error}
            </Alert>
          )}
          <WordGrid />
        </Container>
      </Box>
    </Box>
  );
}
