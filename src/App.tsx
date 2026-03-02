import { PipelineProvider } from "./ui/hooks/use-pipeline.tsx";
import AppShell from "./ui/AppShell.tsx";

export default function App() {
  return (
    <PipelineProvider>
      <AppShell />
    </PipelineProvider>
  );
}
