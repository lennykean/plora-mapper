import { contextBridge, ipcRenderer } from "electron";

const ALLOWED_CHANNELS = [
  "pipeline:run",
  "pipeline:disambiguate",
  "cache:clear",
] as const;
type Channel = (typeof ALLOWED_CHANNELS)[number];

contextBridge.exposeInMainWorld("electronAPI", {
  invoke(channel: string, data: unknown): Promise<unknown> {
    if (!ALLOWED_CHANNELS.includes(channel as Channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, data);
  },
});
