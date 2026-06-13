import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CoralResult<T> =
  | { ok: true; rows: T[]; durationMs: number }
  | { ok: false; error: string; durationMs: number };

export async function runCoralSql<T>(sql: string): Promise<CoralResult<T>> {
  const started = Date.now();
  try {
    const { stdout } = await execFileAsync(
      process.env.CORAL_BIN ?? "coral",
      ["sql", "--format", "json", sql],
      {
        timeout: Number(process.env.HARBORMASTER_CORAL_TIMEOUT_MS ?? 15000),
        maxBuffer: 1024 * 1024 * 10,
        windowsHide: true,
      }
    );

    return {
      ok: true,
      rows: JSON.parse(stdout.trim() || "[]") as T[],
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

export async function listCoralSources(): Promise<CoralResult<{ raw: string }>> {
  const started = Date.now();
  try {
    const { stdout } = await execFileAsync(process.env.CORAL_BIN ?? "coral", ["source", "list"], {
      timeout: 8000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });

    return {
      ok: true,
      rows: [{ raw: stdout }],
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}
