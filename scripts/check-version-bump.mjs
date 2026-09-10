#!/usr/bin/env node
/**
 * Ensures packages/web and packages/core versions stay in lockstep and bump
 * correctly vs a base ref. Web is canonical; core must match.
 *
 * Rules:
 * - Every change must increase semver by at least one patch.
 * - Minor bumps reset patch to 0.
 * - Major bumps reset minor and patch to 0.
 *
 * Usage: node scripts/check-version-bump.mjs [base-ref]
 * Default base ref: origin/main
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CORE_VERSION_FILE,
  WEB_VERSION_FILE,
  describeValidBumps,
  isValidBump,
  readPackageJson,
  readVersionFromJson,
} from './version-utils.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function readGitRefVersion(filePath, ref) {
  const jsonText = execFileSync('git', ['show', `${ref}:${filePath}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return readVersionFromJson(jsonText, filePath);
}

function resolveBaseRef(requestedRef) {
  if (requestedRef) {
    return requestedRef;
  }

  const envRef = process.env.GITHUB_BASE_REF;
  if (envRef) {
    return `origin/${envRef}`;
  }

  return 'origin/main';
}

function main() {
  const baseRef = resolveBaseRef(process.argv[2]);
  const webVersion = readPackageJson(WEB_VERSION_FILE, repoRoot).version;
  const coreVersion = readPackageJson(CORE_VERSION_FILE, repoRoot).version;

  if (webVersion !== coreVersion) {
    console.error(`Version mismatch: ${WEB_VERSION_FILE} is ${webVersion}, ${CORE_VERSION_FILE} is ${coreVersion}.`);
    console.error('Run: pnpm version:sync');
    process.exit(1);
  }

  let baseWebVersion;
  let baseCoreVersion;
  try {
    baseWebVersion = readGitRefVersion(WEB_VERSION_FILE, baseRef);
    baseCoreVersion = readGitRefVersion(CORE_VERSION_FILE, baseRef);
  } catch (error) {
    console.error(`Failed to read version files from ${baseRef}: ${error.message}`);
    process.exit(1);
  }

  if (baseWebVersion !== baseCoreVersion) {
    console.error(
      `Base ref ${baseRef} has mismatched versions: web=${baseWebVersion}, core=${baseCoreVersion}.`,
    );
    console.error('Fix main first, then bump both together.');
    process.exit(1);
  }

  const result = isValidBump(baseWebVersion, webVersion);
  if (!result.ok) {
    console.error(`Invalid version bump in ${WEB_VERSION_FILE} and ${CORE_VERSION_FILE}.`);
    console.error(result.reason);
    console.error(`Valid next versions from ${baseWebVersion}: ${describeValidBumps(baseWebVersion)}`);
    console.error('Run: pnpm version:bump <patch|minor|major>');
    process.exit(1);
  }

  console.log(`Version bump OK: ${baseWebVersion} -> ${webVersion} (web + core)`);
}

main();
