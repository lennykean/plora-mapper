import PipelineProvider from "./ui/hooks/PipelineProvider.tsx";
import AppShell from "./ui/AppShell.tsx";

export default function App() {
  return (
    <PipelineProvider>
      <AppShell />
    </PipelineProvider>
  );
}
