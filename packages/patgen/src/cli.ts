#!/usr/bin/env node
import { formatPatternBlock, runPatgenBatch } from "@copy-quatre/core";
import { formatHelp, parseCliArgs } from "./parseArgs.js";

function main(): void {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    console.error("Run patgen --help for usage.");
    process.exit(1);
  }

  if (options.list) {
    console.log(formatHelp());
    process.exit(0);
  }

  if (options.help) {
    const algoFlagIndex = process.argv.indexOf("--algorithm");
    const algoId = algoFlagIndex >= 0 ? process.argv[algoFlagIndex + 1] : undefined;
    console.log(formatHelp(algoId));
    process.exit(0);
  }

  const grids = runPatgenBatch({
    algorithmId: options.algorithmId,
    gridSize: options.gridSize,
    count: options.count,
    seed: options.seed,
    params: options.params,
  });

  const blocks = grids.map((grid, idx) => formatPatternBlock(grid, idx + 1, grids.length));
  console.log(blocks.join("\n\n"));
}

main();
