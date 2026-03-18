import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { configurePaths } from "../data/paths.ts";
import { closeDatabase } from "../data/definition-cache.ts";
import type { LookupResult, StepOptions } from "../data/types.ts";

const isDev = !app.isPackaged;

// Configure data paths before anything else imports them
if (isDev) {
  configurePaths({
    dataDir: path.resolve(process.cwd(), "data"),
    cacheDir: path.resolve(process.cwd(), "data"),
  });
} else {
  configurePaths({
    dataDir: path.resolve(process.resourcesPath, "data"),
    cacheDir: path.join(app.getPath("userData"), "data"),
  });
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// --- IPC handlers ---

ipcMain.handle(
  "pipeline:run",
  async (_event, body: { text: string; options?: StepOptions }) => {
    try {
      if (!body || typeof body !== "object") {
        throw new Error("body must be a non-null object");
      }
      if (typeof body.text !== "string") {
        throw new Error("text must be a string");
      }
      if (body.text.length > 1_000_000) {
        throw new Error("text exceeds 1 MB limit");
      }

      const { default: tokenize } = await import("../steps/tokenize.ts");
      const { pronounce } = await import("../steps/pronounce.ts");
      const { disambiguate } = await import("../steps/disambiguate.ts");

      const tokens = tokenize(body.text);
      const pronounceResults = await pronounce(tokens, body.options);
      const results = disambiguate(pronounceResults, body.options);

      return { pronounceResults, results };
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  },
);

ipcMain.handle(
  "pipeline:disambiguate",
  async (_event, body: { results: LookupResult[]; options?: StepOptions }) => {
    try {
      if (!body || typeof body !== "object") {
        throw new Error("body must be a non-null object");
      }
      if (!Array.isArray(body.results)) {
        throw new Error("results must be an array");
      }

      const { disambiguate } = await import("../steps/disambiguate.ts");
      const results = disambiguate(body.results, body.options);

      return { results };
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  },
);

ipcMain.handle("cache:clear", async () => {
  const { clear } = await import("../data/definition-cache.ts");
  clear();
  return { ok: true };
});

// --- App lifecycle ---

app.on("before-quit", () => {
  closeDatabase();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
