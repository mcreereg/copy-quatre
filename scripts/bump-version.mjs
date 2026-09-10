#!/usr/bin/env node
/**
 * Bump web + core versions together.
 *
 * Usage: node scripts/bump-version.mjs <patch|minor|major>
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CORE_VERSION_FILE,
  WEB_VERSION_FILE,
  bumpSemver,
  readPackageJson,
  writeVersion,
} from './version-utils.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const bumpType = process.argv[2];
  if (!bumpType) {
    console.error('Usage: node scripts/bump-version.mjs <patch|minor|major>');
    process.exit(1);
  }

  const currentVersion = readPackageJson(WEB_VERSION_FILE, repoRoot).version;
  const nextVersion = bumpSemver(currentVersion, bumpType);

  writeVersion(WEB_VERSION_FILE, repoRoot, nextVersion);
  writeVersion(CORE_VERSION_FILE, repoRoot, nextVersion);

  console.log(`Bumped ${WEB_VERSION_FILE} and ${CORE_VERSION_FILE}: ${currentVersion} -> ${nextVersion}`);
}

main();
