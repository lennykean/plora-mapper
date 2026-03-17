import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import type { LookupResult } from "../data/types.ts";

interface HttpError extends Error {
  statusCode?: number;
}

function json(res: ServerResponse, data: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const MAX_BODY = 1024 * 1024; // 1 MB
    req.on("error", reject);
    req.on("data", (c: Buffer) => {
      if (done) return;
      size += c.length;
      if (size > MAX_BODY) {
        done = true;
        const err: HttpError = new Error("Request body too large");
        err.statusCode = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (done) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        const err: HttpError = new Error("Invalid JSON");
        err.statusCode = 400;
        reject(err);
      }
    });
  });
}

export default function apiPlugin(): Plugin {
  return {
    name: "plora-api",
    configureServer(server) {
      server.middlewares.use("/api/pipeline", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }

        try {
          const body = (await readBody(req)) as {
            text: string;
            options?: Record<string, unknown>;
          };

          if (typeof body.text !== "string") {
            res.statusCode = 400;
            return json(res, { error: "text must be a string" });
          }

          const { pronounce } = await import("../steps/pronounce.ts");
          const { disambiguate } = await import("../steps/disambiguate.ts");
          const tokenize = (await import("../steps/tokenize.ts")).default;

          const tokens = tokenize(body.text);
          const pronounceResults = await pronounce(tokens, body.options);
          const results = disambiguate(pronounceResults, body.options);

          json(res, { pronounceResults, results });
        } catch (err: unknown) {
          const httpErr = err as HttpError;
          res.statusCode = httpErr.statusCode ?? 500;
          json(res, { error: httpErr.message });
        }
      });

      server.middlewares.use("/api/clear-cache", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }
        try {
          const cache = await import("../data/definition-cache.ts");
          cache.clear();
          json(res, { ok: true });
        } catch (err: unknown) {
          const httpErr = err as HttpError;
          res.statusCode = httpErr.statusCode ?? 500;
          json(res, { error: httpErr.message });
        }
      });

      server.middlewares.use("/api/disambiguate", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }

        try {
          const body = (await readBody(req)) as {
            results: unknown[];
            options?: Record<string, unknown>;
          };

          if (!Array.isArray(body.results)) {
            res.statusCode = 400;
            return json(res, { error: "results must be an array" });
          }

          const { disambiguate } = await import("../steps/disambiguate.ts");

          const results = disambiguate(
            body.results as LookupResult[],
            body.options,
          );
          json(res, { results });
        } catch (err: unknown) {
          const httpErr = err as HttpError;
          res.statusCode = httpErr.statusCode ?? 500;
          json(res, { error: httpErr.message });
        }
      });
    },
  };
}
