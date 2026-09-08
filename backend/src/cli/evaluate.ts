import { readFile, writeFile } from "node:fs/promises";
import { runPipeline, PipelineError } from "../pipeline/runPipeline.js";
import { batchCasesSchema } from "../validation/requestSchemas.js";
import type { Kit } from "../pipeline/types.js";

/**
 * The mandatory batch entry point (Section 9): `npm run evaluate -- --input cases.json
 * --output kits.json`. Calls `runPipeline` directly — the exact function the Express
 * `/api/kits` route also calls — so this is genuinely the same code path, not a parallel
 * implementation. Has no MongoDB dependency, so it runs from a clean clone with nothing
 * beyond `npm install` and a `.env` (see .env.example).
 */

interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

interface KitResultEntry {
  id: string;
  status: "ok" | "failed";
  kit: Kit | null;
  error: { code: string; message: string } | null;
}

function parseArgs(argv: string[]): { input: string; output: string; concurrency: number } {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg?.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value !== undefined && !value.startsWith("--")) {
        args.set(key, value);
        i++;
      }
    }
  }
  const input = args.get("input");
  const output = args.get("output");
  if (!input || !output) {
    throw new Error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
  }
  return { input, output, concurrency: Number(args.get("concurrency") ?? 1) };
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function errorCodeFor(err: unknown): string {
  if (err instanceof PipelineError) return err.code;
  return "GENERATION_FAILED";
}

async function processCase(kase: BatchCase): Promise<KitResultEntry> {
  try {
    const result = await runPipeline({ jd: kase.jd, company_url: kase.company_url, days: kase.days });
    return { id: kase.id, status: "ok", kit: result.kit, error: null };
  } catch (err) {
    return {
      id: kase.id,
      status: "failed",
      kit: null,
      error: { code: errorCodeFor(err), message: (err as Error).message },
    };
  }
}

async function main() {
  const { input, output, concurrency } = parseArgs(process.argv.slice(2));

  const raw = await readFile(input, "utf-8");
  const parsed = batchCasesSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("Invalid input file:", parsed.error.flatten());
    process.exit(1);
  }
  const cases = parsed.data;

  console.log(`Running ${cases.length} case(s) with concurrency ${concurrency}...`);
  const startedAt = Date.now();

  const results = await runWithConcurrency(cases, concurrency, async (kase) => {
    console.log(`[${kase.id}] starting`);
    const result = await processCase(kase);
    console.log(`[${kase.id}] ${result.status}`);
    return result;
  });

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Done in ${elapsedSec}s.`);

  const outputDoc = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: results,
  };

  await writeFile(output, JSON.stringify(outputDoc, null, 2), "utf-8");
  console.log(`Wrote ${results.length} result(s) to ${output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
