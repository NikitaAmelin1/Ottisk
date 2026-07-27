#!/usr/bin/env node

await import("../js/sim-core.js");

const HELP = `Usage: node scripts/sim-balance.mjs [options]

Options:
  --difficulty easy|normal|hard
  --hero HERO
  --policy cautious|balanced|aggressive
  --seed VALUE
  --runs NUMBER
  --max-seconds NUMBER
  --step NUMBER
  --single                 emit one run instead of a batch
  --compact                emit compact JSON
  --help`;

function parseArgs(args) {
  const options = {};
  let single = false;
  let compact = false;
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (token === "--single") {
      single = true;
      continue;
    }
    if (token === "--compact") {
      compact = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`unexpected argument: ${token}`);
    const equals = token.indexOf("=");
    const flag = equals >= 0 ? token.slice(2, equals) : token.slice(2);
    const value = equals >= 0 ? token.slice(equals + 1) : args[++index];
    if (value == null || value.startsWith("--")) throw new Error(`missing value for --${flag}`);
    const key = {
      difficulty: "difficulty",
      hero: "hero",
      policy: "policy",
      seed: "seed",
      runs: "runs",
      "max-seconds": "maxSeconds",
      step: "step",
    }[flag];
    if (!key) throw new Error(`unknown option: --${flag}`);
    options[key] = ["runs", "max-seconds", "step"].includes(flag) ? Number(value) : value;
  }
  return { options, single, compact };
}

try {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    process.stdout.write(`${HELP}\n`);
  } else {
    const output = parsed.single
      ? globalThis.OttiskSim.simulateRun(parsed.options)
      : globalThis.OttiskSim.simulateBatch(parsed.options);
    process.stdout.write(`${JSON.stringify(output, null, parsed.compact ? 0 : 2)}\n`);
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
  })}\n`);
  process.exitCode = 1;
}
