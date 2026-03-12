import { useState } from "react";
import { Box, Container, Alert, Tabs } from "@mantine/core";
import { usePipeline } from "./hooks/use-pipeline.tsx";
import InputBar from "./InputBar.tsx";
import ControlPanel from "./ControlPanel.tsx";
import WordGrid from "./WordGrid.tsx";
import PhonemeTable from "./PhonemeTable.tsx";

export default function AppShell() {
  const { state } = usePipeline();
  const [tab, setTab] = useState<string | null>("mapper");

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
          <Tabs value={tab} onChange={setTab} mb="sm">
            <Tabs.List>
              <Tabs.Tab value="mapper">Mapper</Tabs.Tab>
              <Tabs.Tab value="phonemes">Phoneme Table</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <div style={{ display: tab === "mapper" ? undefined : "none" }}>
            <InputBar />
            <ControlPanel />
          </div>
        </Container>
      </Box>

      <Box style={{ flex: 1, overflowY: "auto" }} p="md">
        <Container size="lg">
          <div style={{ display: tab === "mapper" ? undefined : "none" }}>
            {state.error && (
              <Alert color="red" mb="md">
                {state.error}
              </Alert>
            )}
            <WordGrid />
          </div>
          {tab === "phonemes" && <PhonemeTable />}
        </Container>
      </Box>
    </Box>
  );
}
